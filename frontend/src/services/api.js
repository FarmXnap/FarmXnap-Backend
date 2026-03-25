// ─── FarmXnap API Service ──────────────────────────────────────────────────────
// REAL: POST /users, POST /farmer_profiles, POST /agro_dealer_profiles
//       POST /auth/login_request, POST /auth/login_verify, POST /auth/logout
//       GET  /users (admin), PATCH /agro_dealer_profiles/:id/verify (admin)
//       GET  /products, POST /products (dealer product management)
//       POST /farmer_profiles/:id/diagnose (crop diagnosis)
// MOCK: Orders, Escrow, Payouts, Farmer/Dealer dashboards
//       (no backend endpoints exist for these yet)

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL || 'https://farmxnap.onrender.com/api/v1'
const delay    = (ms = 800) => new Promise(res => setTimeout(res, ms))

const getToken = () => {
  try {
    const s = localStorage.getItem('farmxnap-auth')
    return s ? JSON.parse(s)?.state?.token : null
  } catch { return null }
}

const normalizePhone = (phone) => {
  const digits = phone.replace(/\D/g, '')
  const stripped = digits.startsWith('234') ? digits.slice(3)
                 : digits.startsWith('0')   ? digits.slice(1)
                 : digits
  return '+234' + stripped
}

const apiCall = async (method, path, body, token, pin) => {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (pin)   headers['X-Transaction-Pin'] = pin
  const res  = await fetch(`${BASE_URL}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = json.error
      || json.message
      || json.msg
      || (json.errors ? (Array.isArray(json.errors) ? json.errors.join(' ') : json.errors) : null)
      || friendlyHttpError(res.status)
    throw new Error(msg)
  }
  return json
}

const friendlyHttpError = (status) => {
  switch (status) {
    case 400: return 'Invalid request. Please check your details.'
    case 401: return 'Unauthorised. Please sign in again.'
    case 403: return 'Access denied.'
    case 404: return 'Account not found. Please check your number or sign up.'
    case 409: return 'This phone number is already registered.'
    case 422: return 'Invalid details. Please check and try again.'
    case 429: return 'Too many attempts. Please wait a moment and try again.'
    case 500: return 'Server error. Please try again shortly.'
    default:  return `Something went wrong (${status}). Please try again.`
  }
}

export const pingServer = async () => {
  try {
    await fetch(`${BASE_URL}/health`, { method: 'GET' })
  } catch { /* ignore */ }
}

const adminCall = async (method, path, body) => {
  const headers = { 'X-Admin-Secret': 'hack-one-milli' }
  if (body) headers['Content-Type'] = 'application/json'
  const res  = await fetch(`${BASE_URL}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = json.error || `Request failed (${res.status})`
    throw new Error(msg)
  }
  return json
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
const getStoredUser = () => {
  try {
    const s = localStorage.getItem('farmxnap-auth')
    return s ? JSON.parse(s)?.state?.user : null
  } catch { return null }
}

const getStoredDealer = () => {
  try {
    const s = localStorage.getItem('farmxnap-auth')
    return s ? JSON.parse(s)?.state?.user : null
  } catch { return null }
}

// ─────────────────────────────────────────────────────────────────────────────
// ✅  REAL API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// 1. POST /users — init user, get OTP
export const requestOTP = async (phone) => {
  const res = await apiCall('POST', '/users', { phone_number: normalizePhone(phone) })
  const otp   = res.data.OTP
  const uid   = res.data.user.id
  const token = res.data.token
  const norm  = normalizePhone(phone)
  const keys = { 'farmxnap-otp': otp, 'farmxnap-uid': uid, 'farmxnap-phone': norm, 'farmxnap-temp-token': token }
  Object.entries(keys).forEach(([k, v]) => {
    sessionStorage.setItem(k, v)
    localStorage.setItem(k, v)
  })
  return { success: true, message: res.message }
}

// 2. POST /users/:id/farmer_profiles — register farmer
export const submitFarmerDetails = async (data) => {
  const { transaction_pin, ...details } = data
  const uid       = sessionStorage.getItem('farmxnap-uid')       || localStorage.getItem('farmxnap-uid')
  const otp       = sessionStorage.getItem('farmxnap-otp')       || localStorage.getItem('farmxnap-otp')
  const tempToken = sessionStorage.getItem('farmxnap-temp-token') || localStorage.getItem('farmxnap-temp-token')
  if (!uid) throw new Error('Session expired. Please start registration again.')
  const res = await apiCall('POST', `/users/${uid}/farmer_profiles`, {
    otp,
    transaction_pin,
    full_name:    details.name,
    phone_number: normalizePhone(details.phone),
    state:        details.state,
    lga:          details.lga || '',
    primary_crop: details.crop,
  }, tempToken)
  ;['farmxnap-otp','farmxnap-uid','farmxnap-phone','farmxnap-temp-token'].forEach(k => { sessionStorage.removeItem(k); localStorage.removeItem(k) })
  return {
    success: true,
    message: res.message,
    token:   res.data.token,
    user: {
      id:                res.data.user.id,
      farmer_profile_id: res.data.user.farmer_profile_id || res.data.user.id,
      role:              res.data.user.role,
      phone:             normalizePhone(details.phone),
      name:              details.name,
      crop:              details.crop,
      state:             details.state,
    },
    role: res.data.user.role,
  }
}

// 3. POST /users/:id/agro_dealer_profiles — register dealer
export const submitDealerDetails = async (data) => {
  const { transaction_pin, ...details } = data
  const uid       = sessionStorage.getItem('farmxnap-uid')       || localStorage.getItem('farmxnap-uid')
  const otp       = sessionStorage.getItem('farmxnap-otp')       || localStorage.getItem('farmxnap-otp')
  const tempToken = sessionStorage.getItem('farmxnap-temp-token') || localStorage.getItem('farmxnap-temp-token')
  if (!uid) throw new Error('Session expired. Please start registration again.')
  const res = await apiCall('POST', `/users/${uid}/agro_dealer_profiles`, {
    otp,
    transaction_pin,
    business_name:           details.business_name,
    business_address:        details.business_address,
    state:                   details.state,
    cac_registration_number: details.cac_registration_number,
    bank:                    details.bank,
    account_number:          details.account_number,
  }, tempToken)
  ;['farmxnap-otp','farmxnap-uid','farmxnap-phone','farmxnap-temp-token'].forEach(k => { sessionStorage.removeItem(k); localStorage.removeItem(k) })
  const fullUser = {
    id:                      res.data.user.id,
    role:                    'dealer',
    business_name:           details.business_name,
    business_address:        details.business_address,
    state:                   details.state,
    cac_registration_number: details.cac_registration_number,
    bank:                    details.bank,
    account_number:          details.account_number,
    phone:                   normalizePhone(details.phone),
    member_since:            new Date().toLocaleDateString('en-GB', { month:'long', year:'numeric' }),
  }
  return {
    success: true,
    message: res.message,
    token:   res.data.token,
    user:    fullUser,
    role:    res.data.user.role,
  }
}

// 4. POST /auth/login_request — request login OTP
export const requestLoginOTP = async (phone) => {
  const res = await apiCall('POST', '/auth/login_request', { phone_number: normalizePhone(phone) })
  sessionStorage.setItem('farmxnap-otp',   res.data.OTP)
  sessionStorage.setItem('farmxnap-phone', normalizePhone(phone))
  return { success: true, message: res.message }
}

// 5. POST /auth/login_verify — verify OTP, get token + role
export const verifyOTP = async (phone, code) => {
  const res = await apiCall('POST', '/auth/login_verify', {
    phone_number: normalizePhone(phone),
    otp: code,
  })
  sessionStorage.removeItem('farmxnap-otp')
  const rawRole = res.data.user.role
  const role    = rawRole === 'agrodealer' ? 'dealer' : rawRole
  let is_verified = role === 'farmer' ? true : false
  if (role === 'dealer' && res.data.user.is_verified === true) {
    is_verified = true
  }
  return {
    success: true,
    message: res.message,
    token:   res.data.token,
    user: {
      id:          res.data.user.id,
      farmer_profile_id: res.data.user.farmer_profile_id || res.data.user.id,
      role,
      phone:       res.data.user.phone_number,
      is_verified,
    },
    role,
  }
}

// 6. POST /auth/logout
export const logoutUser = async () => {
  const token = getToken()
  if (token) {
    try {
      const res = await apiCall('POST', '/auth/logout', undefined, token)
      return res.message || 'Logout successful.'
    } catch { return 'Logout successful.' }
  }
  return 'Logout successful.'
}

// 7. GET /users — admin list all users with profiles
export const adminGetAllUsers = async () => {
  const res   = await adminCall('GET', '/users')
  const users = Array.isArray(res.data) ? res.data
              : Array.isArray(res)      ? res
              : []

  const farmers = users
    .filter(u => u.farmerProfile)
    .map(u => ({
      id:     u.id,
      name:   u.farmerProfile.full_name,
      phone:  u.phone_number,
      state:  u.farmerProfile.state,
      lga:    u.farmerProfile.lga,
      crop:   u.farmerProfile.primary_crop,
      joined: u.farmerProfile.created_at
        ? new Date(u.farmerProfile.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
        : '—',
      status: 'active',
      scans:  0,
    }))

  const dealers = users
    .filter(u => u.agroDealerProfile)
    .map(u => {
      const p = u.agroDealerProfile
      const verifyHref = u.links?.verify_agro_dealer?.href || null
      return {
        id:               u.id,
        profile_id:       p.id,
        business_name:    p.business_name    || '—',
        business_address: p.business_address || '—',
        phone:            u.phone_number,
        state:            p.state            || '—',
        lga:              p.lga              || '—',
        cac_number:       p.cac_registration_number || '—',
        bank:             p.bank             || '—',
        account_number:   p.account_number   || '—',
        is_verified:      p.is_verified === true,
        status:           p.is_verified ? 'approved' : 'pending',
        joined:           p.created_at
          ? new Date(p.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
          : '—',
        verify_href:      verifyHref,
        products: 0, orders: 0, revenue: 0,
      }
    })

  return { farmers, dealers, raw: users }
}

// 8. PATCH /users/:user_id/agro_dealer_profiles/:id/verify
export const adminVerifyDealer = async (userId, profileId, verifyHref) => {
  const path = `/users/${userId}/agro_dealer_profiles/${profileId}/verify`
  const res = await adminCall('PATCH', path)
  return {
    success: true,
    message: res.message || 'AgroDealer verified successfully.',
    data:    res.data,
  }
}

// 9. POST /farmer_profiles/:farmer_profile_id/diagnose — crop diagnosis
export const diagnoseCrop = async (imageFile, cropType) => {
  const token = getToken()
  if (!token) throw new Error('Please sign in to use diagnosis.')

  const stored = getStoredUser()
  const farmerProfileId = stored?.farmer_profile_id || stored?.id
  if (!farmerProfileId) throw new Error('Farmer profile not found. Please sign in again.')

  const formData = new FormData()

  if (imageFile instanceof File || imageFile instanceof Blob) {
    formData.append('image', imageFile)
  } else if (typeof imageFile === 'string' && imageFile.startsWith('data:')) {
    const fetchRes = await fetch(imageFile)
    const blob = await fetchRes.blob()
    const ext = blob.type.split('/')[1] || 'jpg'
    formData.append('image', blob, `scan.${ext}`)
  } else if (typeof imageFile === 'string') {
    const byteString = atob(imageFile)
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i)
    const blob = new Blob([ab], { type: 'image/jpeg' })
    formData.append('image', blob, 'scan.jpg')
  } else {
    throw new Error('Invalid image format.')
  }

  const headers = { 'Authorization': `Bearer ${token}` }

  const response = await fetch(
    `${BASE_URL}/farmer_profiles/${farmerProfileId}/diagnose`,
    { method: 'POST', headers, body: formData }
  )

  const json = await response.json().catch(() => ({}))

  if (!response.ok) {
    const msg = json.error
      || json.message
      || (json.errors ? (Array.isArray(json.errors) ? json.errors.join(' ') : json.errors) : null)
      || friendlyHttpError(response.status)
    throw new Error(msg)
  }

  const { diagnosis, treatments } = json.data

  // Healthy crop — no disease detected
  if (!diagnosis.disease) {
    return {
      crop:              diagnosis.crop,
      disease:           null,
      healthy:           true,
      instructions:      diagnosis.instructions,
      confidence:        100,
      symptoms:          [],
      remedy:            diagnosis.instructions,
      treatment_product: null,
      treatments:        [],
      nearby_dealers:    [],
      scanned_at:        new Date().toISOString(),
    }
  }

  const getMatchLabel = (rank) => {
    if (rank > 2.5) return 'Best Match (Exact Chemical)'
    if (rank > 0.5) return 'Recommended for this Crop'
    return 'General Treatment'
  }

  const mappedTreatments = (treatments || []).map(t => ({
    id:                `${t.business_name}-${t.name}`.replace(/\s/g, '-').toLowerCase(),
    name:              t.name,
    active_ingredient: t.active_ingredient,
    price:             parseFloat(t.price) || 0,
    stock:             t.stock_quantity ?? 0,
    stock_quantity:    t.stock_quantity ?? 0,
    unit:              t.unit,
    description:       t.description || '',
    category:          t.category,
    target_problems:   t.target_problems || '',
    in_stock:          (t.stock_quantity ?? 0) > 0,
    dealer_name:       t.business_name,
    dealer_address:    t.business_address,
    dealer_state:      t.state,
    dealer_phone:      t.phone_number,
    dealer_bank:       t.bank,
    dealer_account:    t.account_number,
    rank:              t.rank,
    match_label:       getMatchLabel(t.rank),
  }))

  const bestTreatment = mappedTreatments[0] || null

  return {
    crop:              diagnosis.crop,
    disease:           diagnosis.disease,
    healthy:           false,
    instructions:      diagnosis.instructions,
    confidence:        null,
    symptoms:          [],
    remedy:            diagnosis.instructions,
    treatment_product: bestTreatment
      ? { id: bestTreatment.id, name: `${bestTreatment.name} (${bestTreatment.unit})`, price: bestTreatment.price }
      : null,
    treatments:        mappedTreatments,
    nearby_dealers:    mappedTreatments.map(t => ({
      id:           t.id,
      name:         t.dealer_name,
      address:      t.dealer_address,
      phone:        t.dealer_phone,
      price:        t.price,
      in_stock:     t.in_stock,
      stock_count:  t.stock,
      product_name: t.name,
      match_label:  t.match_label,
      rank:         t.rank,
      verified:     true,
    })),
    scanned_at: new Date().toISOString(),
  }
}

// 10. GET /products — list all products for authenticated dealer
export const getDealerProducts = async () => {
  const token = getToken()
  const res = await apiCall('GET', '/products', undefined, token)
  const raw = res.data || []
  return raw.map(p => ({
    id:                p.id,
    name:              p.name,
    category:          p.category,
    unit:              p.unit,
    price:             parseFloat(p.price) || 0,
    stock:             p.stock_quantity ?? 0,
    stock_quantity:    p.stock_quantity ?? 0,
    in_stock:          (p.stock_quantity ?? 0) > 0,
    disease_target:    p.target_problems || '',
    target_problems:   p.target_problems || '',
    active_ingredient: p.active_ingredient || '',
    description:       p.description || '',
    links:             p.links,
  }))
}

// 11. POST /products — create a new product
export const createProduct = async (data) => {
  const token = getToken()
  const res = await apiCall('POST', '/products', {
    name:              data.name,
    active_ingredient: data.active_ingredient,
    price:             Number(data.price),
    stock_quantity:    Number(data.stock_quantity),
    description:       data.description || undefined,
    category:          data.category,
    unit:              data.unit,
    target_problems:   data.target_problems || undefined,
  }, token)
  return { success: true, message: res.message, data: res.data }
}

// 12. POST /products — create product (alternate entry point used by dealer dashboard)
export const addProduct = async (data) => {
  const token = getToken()
  const res = await apiCall('POST', '/products', {
    name:              data.name,
    active_ingredient: data.active_ingredient || data.name,
    price:             Number(data.price),
    stock_quantity:    Number(data.stock),
    description:       data.description || undefined,
    category:          data.category,
    unit:              data.unit,
    target_problems:   data.disease_target || data.target_problems || undefined,
  }, token)
  return {
    id:              res.data?.id || 'prod-' + Date.now(),
    name:            data.name,
    category:        data.category,
    unit:            data.unit,
    price:           Number(data.price),
    stock:           Number(data.stock),
    stock_quantity:  Number(data.stock),
    in_stock:        Number(data.stock) > 0,
    disease_target:  data.disease_target || '',
    target_problems: data.disease_target || '',
  }
}

// OTP flow helpers — no-ops since OTP is verified inside submitFarmerDetails/submitDealerDetails
export const verifyFarmerPhone = async (phone, code) => ({ success: true, phone })
export const verifyDealerPhone = async (phone, code) => ({ success: true, phone })

// ─────────────────────────────────────────────────────────────────────────────
// 🔶  MOCK DATA — no backend endpoints yet
// ─────────────────────────────────────────────────────────────────────────────

// ── Farmer Dashboard ──────────────────────────────────────────────────────────
const MOCK_HISTORY = [
  { id: 'scan-001', crop: 'Cassava', disease: 'Cassava mosaic disease', date: 'Mar 18, 2026', confidence: 93, status: 'treated', symptoms: ['Yellow mosaic pattern on leaves','Leaf distortion and curling','Stunted plant growth','Pale green or yellow leaf colour'], remedy: 'Apply Imidacloprid 200SL to control whitefly vectors. Remove and destroy infected stems immediately. Use certified disease-free planting material for replanting.', treatment_product: { id: 'prod-001', name: 'Imidacloprid 200SL (500ml)', price: 4200 }, order: { id: 'ord-001', ref: 'ORD-00234', status: 'delivered', dealer: 'AgroFirst Port Harcourt', dealer_phone: '+234 701 234 5678', amount: 4872, date_ordered: 'Mar 18, 2026', date_delivered: 'Mar 19, 2026', escrow_status: 'released' } },
  { id: 'scan-002', crop: 'Maize', disease: 'Northern leaf blight', date: 'Mar 12, 2026', confidence: 87, status: 'treated', symptoms: ['Long elliptical grey-green lesions','Lesions turn tan as they mature','Premature death of leaves'], remedy: 'Apply Mancozeb 80WP fungicide at first sign of disease. Ensure proper plant spacing for air circulation. Remove infected crop debris after harvest.', treatment_product: { id: 'prod-002', name: 'Mancozeb 80WP (1kg)', price: 3500 }, order: { id: 'ord-002', ref: 'ORD-00218', status: 'delivered', dealer: 'GreenField Supplies', dealer_phone: '+234 802 345 6789', amount: 3828, date_ordered: 'Mar 12, 2026', date_delivered: 'Mar 13, 2026', escrow_status: 'released' } },
  { id: 'scan-003', crop: 'Tomato', disease: 'Early blight', date: 'Mar 5, 2026', confidence: 91, status: 'pending', symptoms: ['Dark brown spots with concentric rings','Yellow halo around lesions','Lower leaves affected first'], remedy: 'Spray Copper oxychloride 50WP every 7–10 days. Remove affected leaves and destroy them. Avoid overhead irrigation to reduce leaf wetness.', treatment_product: { id: 'prod-003', name: 'Copper oxychloride 50WP (500g)', price: 2800 }, order: null },
  { id: 'scan-004', crop: 'Yam', disease: 'Yam anthracnose', date: 'Feb 28, 2026', confidence: 78, status: 'treated', symptoms: ['Irregular brown leaf spots','Tip dieback on stems','Tuber rot at harvest'], remedy: 'Apply Carbendazim 50WP at planting and at 4-week intervals. Store tubers in a cool, dry, well-ventilated place. Remove and burn infected plant parts.', treatment_product: { id: 'prod-004', name: 'Carbendazim 50WP (250g)', price: 1900 }, order: { id: 'ord-003', ref: 'ORD-00198', status: 'dispatched', dealer: 'NaturaFarm Store', dealer_phone: '+234 803 456 7891', amount: 2228, date_ordered: 'Feb 28, 2026', date_delivered: null, escrow_status: 'held' } },
]

const MOCK_FARMER_ACTIVE_ORDERS = [
  { id: 'ord-003', ref: 'ORD-00198', scan_id: 'scan-004', product: 'Carbendazim 50WP (250g)', crop: 'Yam', disease: 'Yam anthracnose', dealer: 'NaturaFarm Store', dealer_phone: '+234 803 456 7891', dealer_address: '45 Farm Road, Enugu', amount: 2228, status: 'dispatched', date_ordered: 'Feb 28, 2026', escrow_status: 'held', expires_at: '2026-03-21T10:00:00Z' },
  { id: 'ord-005', ref: 'ORD-00315', scan_id: 'scan-001', product: 'Imidacloprid 200SL (500ml)', crop: 'Cassava', disease: 'Cassava mosaic disease', dealer: 'AgroFirst PH', dealer_phone: '+234 701 234 5678', dealer_address: '12 Agricultural Rd, Rumuola, PH', amount: 4872, status: 'pending', date_ordered: 'Mar 22, 2026', escrow_status: 'held', expires_at: '2026-03-29T10:00:00Z' },
  { id: 'ord-006', ref: 'ORD-00321', scan_id: 'scan-002', product: 'Mancozeb 80WP (1kg)', crop: 'Maize', disease: 'Northern leaf blight', dealer: 'GreenField Supplies', dealer_phone: '+234 802 345 6789', dealer_address: '88 Market Rd, Onitsha', amount: 3500, status: 'paid', date_ordered: 'Mar 24, 2026', escrow_status: 'held', expires_at: '2026-03-31T10:00:00Z' },
]

const MOCK_TIPS = [
  { id: 1, title: 'Best time to spray fungicide', body: 'Apply fungicide in the early morning or late evening to prevent evaporation and maximise leaf absorption. Avoid spraying before rain.', crop: 'All crops', tag: 'Prevention' },
  { id: 2, title: 'Cassava mosaic early signs', body: 'Watch for yellowing and twisting of young leaves. Early detection and treatment saves up to 80% of your yield.', crop: 'Cassava', tag: 'Detection' },
  { id: 3, title: 'Crop rotation benefits', body: 'Rotating maize with legumes like cowpea replenishes soil nitrogen and breaks pest cycles naturally. Rotate every season.', crop: 'Maize', tag: 'Soil health' },
  { id: 4, title: 'Escrow protects your money', body: 'Your payment is held safely by Interswitch until you confirm delivery. Never release escrow before inspecting your treatment products.', crop: 'All crops', tag: 'Finance' },
  { id: 5, title: 'How to confirm delivery', body: 'After your dealer delivers, go to Orders tab → tap the order → enter your PIN to confirm. This releases payment to the dealer.', crop: 'All crops', tag: 'How-to' },
  { id: 6, title: 'Tomato blight prevention', body: 'Space tomato plants at least 60cm apart for airflow. Avoid watering leaves — drip irrigate at the base to prevent fungal spread.', crop: 'Tomato', tag: 'Prevention' },
]

export const getFarmerActiveOrders = async () => { await delay(600); return MOCK_FARMER_ACTIVE_ORDERS }
export const getFarmerHistory      = async () => { await delay(700); return MOCK_HISTORY }

export const getFarmerProfile = async () => {
  await delay(300)
  const stored = getStoredUser()
  return {
    id:                stored?.id    || '',
    name:              stored?.name  || stored?.full_name || '',
    phone:             stored?.phone || stored?.phone_number || '',
    state:             stored?.state || '',
    lga:               stored?.lga   || '',
    crop:              stored?.crop  || stored?.primary_crop || '',
    role:              'farmer',
    farm_size:         stored?.farm_size   || '',
    experience:        stored?.experience  || '',
    member_since:      stored?.member_since || new Date().toLocaleDateString('en-GB', { month:'long', year:'numeric' }),
    total_scans:       stored?.total_scans  || 0,
    treatments_bought: stored?.treatments_bought || 0,
    money_saved:       stored?.money_saved  || 0,
  }
}

export const getFarmTips = async () => { await delay(400); return MOCK_TIPS }

export const updateFarmerProfile = async (data) => {
  await delay(700)
  const stored = getStoredUser() || {}
  const updated = { ...stored, ...data }
  try {
    const s = localStorage.getItem('farmxnap-auth')
    if (s) {
      const parsed = JSON.parse(s)
      parsed.state.user = updated
      localStorage.setItem('farmxnap-auth', JSON.stringify(parsed))
    }
  } catch {}
  return { success: true, user: updated }
}

export const farmerConfirmDelivery = async (orderId, pin) => {
  await delay(1000)
  const idx = MOCK_FARMER_ACTIVE_ORDERS.findIndex(o => o.id === orderId)
  if (idx !== -1) {
    MOCK_FARMER_ACTIVE_ORDERS[idx].status = 'delivered'
    MOCK_FARMER_ACTIVE_ORDERS[idx].escrow_status = 'released'
  }
  const sIdx = MOCK_HISTORY.findIndex(s => s.order?.id === orderId)
  if (sIdx !== -1) {
    MOCK_HISTORY[sIdx].status = 'treated'
    MOCK_HISTORY[sIdx].order.status = 'delivered'
    MOCK_HISTORY[sIdx].order.escrow_status = 'released'
    MOCK_HISTORY[sIdx].order.date_delivered = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
  }
  return { success: true }
}

// ── Orders & Payments (Mock) ──────────────────────────────────────────────────
export const createOrder = async ({ item, dealer, payment_method, pin }) => {
  await delay(1000)
  const orderId = 'ORD-' + Math.random().toString(36).slice(2, 8).toUpperCase()
  const ref     = 'FXNAP-' + Math.random().toString(36).slice(2, 10).toUpperCase()
  return {
    success: true,
    order: {
      id: orderId, reference: ref, item, dealer, payment_method,
      status: 'escrow_held', escrow_status: 'held',
      paid_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 48*60*60*1000).toISOString(),
      auto_release_at: new Date(Date.now() + 120*60*60*1000).toISOString(),
    },
  }
}

export const initiatePayment   = async (orderId)        => { await delay(2000); return { status: 'success', reference: 'FXNAP-' + Math.random().toString(36).slice(2, 10).toUpperCase() } }
export const confirmDelivery   = async (orderId, pin)   => { await delay(1200); return { success: true, status: 'completed', funds_released: true } }
export const getOrderStatus    = async (orderId)        => { await delay(600);  return { status: 'dispatched', dispatched_at: new Date().toISOString() } }
export const releaseEscrow     = async (orderId, pin)   => { await delay(1400); return { success: true, message: 'Escrow released. Dealer payout queued.', payout_queued: true } }
export const refundEscrow      = async (orderId, reason) => { await delay(1200); return { success: true, message: 'Refund initiated to farmer via Interswitch' } }

export const initiateInterswitchPayment = async ({ amount }) => {
  await delay(1200)
  return {
    success: true,
    payment_ref: 'ISNG-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
    payment_url: 'https://pay.interswitch.com/pay/mock',
    amount, status: 'pending',
  }
}

export const verifyInterswitchPayment = async (paymentRef) => {
  await delay(1000)
  return { success: true, status: 'escrow_held', escrow_ref: paymentRef, message: 'Payment verified and held in escrow' }
}

// ── Dealer Dashboard (Mock except products) ───────────────────────────────────
const MOCK_DEALER_ORDERS = [
  { id: 'order-001', ref: 'FXNAP-A7B2C3', farmer: 'Emeka Okonkwo', farmer_phone: '+2348034567890', farmer_location: 'Rumuola, Obio-Akpor LGA', farmer_state: 'Rivers State', crop: 'Cassava', disease: 'Cassava mosaic disease', product: 'Imidacloprid 200SL (500ml)', quantity: 1, unit_price: 4200, delivery_fee: 500, platform_fee: 190, amount: 4750, escrow_status: 'held', status: 'pending', date: 'Mar 19, 2026', paid_at: 'Mar 19, 2026 09:14', notes: 'Please deliver between 9am–5pm weekdays' },
  { id: 'order-002', ref: 'FXNAP-E5F6G7', farmer: 'Amaka Chukwu', farmer_phone: '+2348021112233', farmer_location: 'Abakpa Nike, Enugu East LGA', farmer_state: 'Enugu State', crop: 'Tomato', disease: 'Early blight', product: 'Copper oxychloride 50WP (500g)', quantity: 2, unit_price: 2800, delivery_fee: 500, platform_fee: 116, amount: 3200, escrow_status: 'released', status: 'delivered', date: 'Mar 18, 2026', paid_at: 'Mar 16, 2026 11:30', delivered_at: 'Mar 18, 2026 14:20', notes: '' },
  { id: 'order-003', ref: 'FXNAP-I9J0K1', farmer: 'Bola Adeyemi', farmer_phone: '+2347056789012', farmer_location: 'Bodija, Ibadan North LGA', farmer_state: 'Oyo State', crop: 'Maize', disease: 'Northern leaf blight', product: 'Mancozeb 80WP (1kg)', quantity: 1, unit_price: 3500, delivery_fee: 500, platform_fee: 140, amount: 2800, escrow_status: 'released', status: 'delivered', date: 'Mar 17, 2026', paid_at: 'Mar 15, 2026 08:45', delivered_at: 'Mar 17, 2026 10:00', notes: 'Call before arriving' },
  { id: 'order-004', ref: 'FXNAP-M3N4O5', farmer: 'Chidi Nwosu', farmer_phone: '+2348062345678', farmer_location: 'Rumuokoro, Obio-Akpor LGA', farmer_state: 'Rivers State', crop: 'Yam', disease: 'Yam anthracnose', product: 'Carbendazim 50WP (250g)', quantity: 2, unit_price: 1900, delivery_fee: 500, platform_fee: 76, amount: 2200, escrow_status: 'held', status: 'pending', date: 'Mar 17, 2026', paid_at: 'Mar 17, 2026 15:22', notes: '' },
  { id: 'order-005', ref: 'FXNAP-P6Q7R8', farmer: 'Sunday Okafor', farmer_phone: '+2347089012345', farmer_location: 'Ikeja, Lagos Island LGA', farmer_state: 'Lagos State', crop: 'Rice', disease: 'Rice blast', product: 'Tricyclazole 75WP (100g)', quantity: 3, unit_price: 2200, delivery_fee: 500, platform_fee: 88, amount: 3300, escrow_status: 'held', status: 'dispatched', date: 'Mar 20, 2026', paid_at: 'Mar 20, 2026 07:30', notes: 'Call before delivery' },
  { id: 'order-006', ref: 'FXNAP-S9T0U1', farmer: 'Fatima Aliyu', farmer_phone: '+2348112223344', farmer_location: 'Kano Municipal LGA', farmer_state: 'Kano State', crop: 'Pepper', disease: 'Pepper mosaic virus', product: 'Acetamiprid 20SP (100g)', quantity: 1, unit_price: 1500, delivery_fee: 500, platform_fee: 60, amount: 1500, escrow_status: 'refunded', status: 'refunded', date: 'Mar 15, 2026', paid_at: 'Mar 15, 2026 12:00', notes: 'Product was out of stock' },
]

const MOCK_DEALER_PAYOUTS = [
  { id: 'pay-001', amount: 32400, status: 'completed', date: '14 Mar 2026', order_ref: 'ORD-00234', product: 'Mancozeb 80WP', farmer: 'Emeka Okonkwo', bank: 'Access Bank', account: '0123456789' },
  { id: 'pay-002', amount: 18700, status: 'completed', date: '11 Mar 2026', order_ref: 'ORD-00218', product: 'Copper Fungicide', farmer: 'Adaeze Nwosu', bank: 'Access Bank', account: '0123456789' },
  { id: 'pay-003', amount: 45000, status: 'pending', date: '17 Mar 2026', order_ref: 'ORD-00261', product: 'Ridomil Gold', farmer: 'Ifeanyi Chukwu', bank: 'Access Bank', account: '0123456789' },
  { id: 'pay-004', amount: 12600, status: 'pending', date: '18 Mar 2026', order_ref: 'ORD-00270', product: 'Lambda Insecticide', farmer: 'Blessing Eze', bank: 'Access Bank', account: '0123456789' },
  { id: 'pay-005', amount: 27500, status: 'processing', date: '19 Mar 2026', order_ref: 'ORD-00279', product: 'Emamectin Benzoate', farmer: 'Chidi Okonkwo', bank: 'Access Bank', account: '0123456789' },
]

export const getDealerOrders = async () => { await delay(700); return MOCK_DEALER_ORDERS }
export const getDealerStats  = async () => { await delay(500); return { orders_today: 3, revenue_today: 10372, new_leads: 2, total_orders: 6 } }

export const getDealerProfile = async () => {
  await delay(300)
  const stored = getStoredDealer()
  return {
    id:                      stored?.id    || '',
    business_name:           stored?.business_name || '',
    phone:                   stored?.phone || '',
    address:                 stored?.business_address || stored?.address || '',
    business_address:        stored?.business_address || '',
    state:                   stored?.state || '',
    cac_number:              stored?.cac_registration_number || '',
    bank:                    stored?.bank  || '',
    account_number:          stored?.account_number || '',
    account_name:            stored?.business_name || '',
    role:                    'dealer',
    approved:                true,
    verified:                stored?.verified || false,
    member_since:            stored?.member_since || new Date().toLocaleDateString('en-GB', { month:'long', year:'numeric' }),
    rating:                  stored?.rating || 0,
    total_sales:             stored?.total_sales || 0,
  }
}

export const updateOrderStatus = async (orderId, status) => {
  await delay(600)
  const idx = MOCK_DEALER_ORDERS.findIndex(o => o.id === orderId)
  if (idx !== -1) {
    MOCK_DEALER_ORDERS[idx].status = status
    if (status === 'dispatched') {
      MOCK_DEALER_ORDERS[idx].dispatched_at = new Date().toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
      const dealerOrder = MOCK_DEALER_ORDERS[idx]
      const farmerIdx = MOCK_FARMER_ACTIVE_ORDERS.findIndex(o =>
        o.product === dealerOrder.product || o.ref === dealerOrder.ref
      )
      if (farmerIdx !== -1) {
        MOCK_FARMER_ACTIVE_ORDERS[farmerIdx].status = 'dispatched'
        MOCK_FARMER_ACTIVE_ORDERS[farmerIdx].escrow_status = 'held'
      }
    }
  }
  return { success: true, order_id: orderId, status }
}

export const updateDealerProfile = async (data) => {
  await delay(700)
  const stored = getStoredDealer() || {}
  const updated = { ...stored, ...data }
  try {
    const s = localStorage.getItem('farmxnap-auth')
    if (s) {
      const parsed = JSON.parse(s)
      parsed.state.user = updated
      localStorage.setItem('farmxnap-auth', JSON.stringify(parsed))
    }
  } catch {}
  return { success: true, user: updated }
}

// No PATCH /products endpoint yet — update mock locally
export const updateProduct = async (id, data) => {
  return {
    id,
    name:            data.name,
    category:        data.category,
    unit:            data.unit,
    price:           Number(data.price),
    stock:           Number(data.stock),
    stock_quantity:  Number(data.stock),
    in_stock:        Number(data.stock) > 0,
    disease_target:  data.disease_target || '',
    target_problems: data.disease_target || '',
  }
}

// No DELETE /products endpoint yet — mock
export const deleteProduct = async (id) => {
  return { success: true }
}

export const getDealerPayouts = async () => {
  await delay(600)
  const completed = MOCK_DEALER_PAYOUTS.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0)
  const pending   = MOCK_DEALER_PAYOUTS.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0)
  return { payouts: MOCK_DEALER_PAYOUTS, total_earned: 136200, total_paid: completed, pending_payout: pending, next_payout_date: '22 Mar 2026', bank: 'Access Bank', account_number: '0123456789', account_name: 'AgroFirst Port Harcourt' }
}

export const requestPayout = async (amount, pin) => {
  await delay(1200)
  const p = { id: 'pay-' + Date.now(), amount, status: 'processing', date: new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }), order_ref: 'MANUAL-' + Math.random().toString(36).slice(2,8).toUpperCase(), product: 'Manual withdrawal request', farmer: '—', bank: 'Access Bank', account: '0123456789' }
  MOCK_DEALER_PAYOUTS.push(p); return { success: true, payout: p }
}

// ── Admin Mock (stats/scans/escrow/payouts — no real endpoints) ───────────────
const MOCK_ADMIN_STATS     = { total_farmers: 1247, total_dealers: 83, total_scans: 4892, total_revenue: 2840000, scans_today: 47, new_users_today: 12, pending_dealers: 5, treatments_sold: 312 }
const MOCK_ALL_SCANS       = [ { id: 's-001', farmer: 'Emeka Okonkwo',  crop: 'Cassava', disease: 'Cassava mosaic disease', confidence: 93, date: 'Mar 18, 2026', state: 'Rivers',  treated: true  }, { id: 's-002', farmer: 'Bola Adeyemi',  crop: 'Tomato',  disease: 'Early blight',            confidence: 91, date: 'Mar 17, 2026', state: 'Oyo',     treated: true  }, { id: 's-003', farmer: 'Amaka Chukwu', crop: 'Maize',   disease: 'Northern leaf blight',    confidence: 87, date: 'Mar 16, 2026', state: 'Enugu',   treated: false }, { id: 's-004', farmer: 'Sunday Okafor', crop: 'Cassava', disease: 'Cassava mosaic disease',  confidence: 88, date: 'Mar 15, 2026', state: 'Anambra', treated: true  }, { id: 's-005', farmer: 'Chidi Nwosu',  crop: 'Yam',     disease: 'Yam anthracnose',         confidence: 78, date: 'Mar 14, 2026', state: 'Rivers',  treated: false }, { id: 's-006', farmer: 'Fatima Aliyu', crop: 'Rice',    disease: 'Rice blast',              confidence: 89, date: 'Mar 12, 2026', state: 'Kano',    treated: true  } ]
const MOCK_DISEASE_BREAKDOWN = [ { disease: 'Cassava mosaic disease', count: 1243, percent: 34 }, { disease: 'Early blight', count: 876, percent: 24 }, { disease: 'Northern leaf blight', count: 654, percent: 18 }, { disease: 'Rice blast', count: 432, percent: 12 }, { disease: 'Yam anthracnose', count: 287, percent: 8 }, { disease: 'Other', count: 145, percent: 4 } ]
const MOCK_MONTHLY_SCANS   = [ { month: 'Oct', scans: 210 }, { month: 'Nov', scans: 340 }, { month: 'Dec', scans: 290 }, { month: 'Jan', scans: 520 }, { month: 'Feb', scans: 780 }, { month: 'Mar', scans: 1104 } ]

const MOCK_ALL_PAYOUTS = [
  { id: 'ap-001', dealer: 'AgroFirst PH',       bank: 'Access Bank', account: '0123456789', amount: 57600,  orders: 4, status: 'pending',    date: '18 Mar 2026' },
  { id: 'ap-002', dealer: 'GreenField Supplies', bank: 'GTBank',      account: '0234567891', amount: 124300, orders: 9, status: 'pending',    date: '17 Mar 2026' },
  { id: 'ap-003', dealer: 'Farm Solutions Ltd',  bank: 'Zenith Bank', account: '0345678912', amount: 38900,  orders: 3, status: 'processing', date: '16 Mar 2026' },
  { id: 'ap-004', dealer: 'AgriCure Nigeria',    bank: 'First Bank',  account: '0456789123', amount: 91200,  orders: 7, status: 'completed',  date: '14 Mar 2026' },
  { id: 'ap-005', dealer: 'NaturaFarm Store',    bank: 'UBA',         account: '0567891234', amount: 44500,  orders: 5, status: 'completed',  date: '12 Mar 2026' },
]

const MOCK_ESCROW_ORDERS = [
  { id: 'esc-001', ref: 'FXNAP-A7B2C3D4', farmer: 'Emeka Okonkwo', farmer_phone: '+2348034567890', dealer: 'AgroFirst PH',       dealer_id: 'd-001', product: 'Imidacloprid 200SL (500ml)',   amount: 4872, platform_fee: 195, dealer_payout: 4677, status: 'dispatched', escrow_status: 'held',     paid_at: 'Mar 18, 2026 09:14', dispatched_at: 'Mar 18, 2026 14:32', expires_at: 'Mar 21, 2026 14:32', crop: 'Cassava', disease: 'Cassava mosaic disease' },
  { id: 'esc-002', ref: 'FXNAP-E5F6G7H8', farmer: 'Amaka Chukwu',  farmer_phone: '+2348021112233', dealer: 'GreenField Supplies', dealer_id: 'd-002', product: 'Mancozeb 80WP (1kg)',          amount: 3828, platform_fee: 153, dealer_payout: 3675, status: 'paid',       escrow_status: 'held',     paid_at: 'Mar 19, 2026 11:05', dispatched_at: null, expires_at: 'Mar 21, 2026 11:05', crop: 'Maize', disease: 'Northern leaf blight' },
  { id: 'esc-003', ref: 'FXNAP-I9J0K1L2', farmer: 'Bola Adeyemi',  farmer_phone: '+2347056789012', dealer: 'AgroFirst PH',       dealer_id: 'd-001', product: 'Copper oxychloride 50WP (500g)',amount: 2996, platform_fee: 120, dealer_payout: 2876, status: 'delivered',  escrow_status: 'released', paid_at: 'Mar 15, 2026 08:30', dispatched_at: 'Mar 15, 2026 16:00', delivered_at: 'Mar 16, 2026 10:20', crop: 'Tomato', disease: 'Early blight' },
  { id: 'esc-004', ref: 'FXNAP-M3N4O5P6', farmer: 'Chidi Nwosu',   farmer_phone: '+2348062345678', dealer: 'FarmMart',           dealer_id: 'd-002', product: 'Carbendazim 50WP (250g)',      amount: 2228, platform_fee: 89,  dealer_payout: 2139, status: 'disputed',   escrow_status: 'held',     paid_at: 'Mar 14, 2026 13:00', dispatched_at: 'Mar 15, 2026 09:00', dispute_reason: 'Farmer says product was expired. Dealer disputes claim.', dispute_raised_at: 'Mar 17, 2026 10:00', crop: 'Yam', disease: 'Yam anthracnose' },
  { id: 'esc-005', ref: 'FXNAP-Q7R8S9T0', farmer: 'Fatima Aliyu',  farmer_phone: '+2347034561234', dealer: 'GreenLeaf Agro',     dealer_id: 'd-003', product: 'Tricyclazole 75WP (100g)',     amount: 2420, platform_fee: 97,  dealer_payout: 2323, status: 'refunded',   escrow_status: 'refunded', paid_at: 'Mar 12, 2026 10:00', dispatched_at: null, refunded_at: 'Mar 14, 2026 10:01', refund_reason: 'Dealer did not dispatch within 48 hours — auto-refunded', crop: 'Rice', disease: 'Rice blast' },
]

const MOCK_DISPUTES = [
  { id: 'dsp-001', order_ref: 'FXNAP-M3N4O5P6', farmer: 'Chidi Nwosu', dealer: 'FarmMart', amount: 2228, reason: 'Farmer says product was expired. Dealer disputes claim.', raised_at: 'Mar 17, 2026', status: 'open', evidence: 'Farmer submitted photo of product expiry date' },
]

export const getAdminStats = async () => {
  try {
    const { farmers, dealers } = await adminGetAllUsers()
    return {
      total_farmers:   farmers.length,
      total_dealers:   dealers.length,
      pending_dealers: dealers.filter(d => d.status === 'pending').length,
      total_scans: 0, total_revenue: 0, scans_today: 0, new_users_today: 0, treatments_sold: 0,
    }
  } catch {
    return { total_farmers: 0, total_dealers: 0, pending_dealers: 0, total_scans: 0, total_revenue: 0, scans_today: 0, new_users_today: 0, treatments_sold: 0 }
  }
}
export const getAllFarmers = async () => { const { farmers } = await adminGetAllUsers(); return farmers }
export const getAllDealers = async () => { const { dealers } = await adminGetAllUsers(); return dealers }
export const getAllScans          = async () => { await delay(700); return MOCK_ALL_SCANS }
export const getDiseaseBreakdown = async () => { await delay(500); return MOCK_DISEASE_BREAKDOWN }
export const getMonthlyScanData  = async () => { await delay(500); return MOCK_MONTHLY_SCANS }
export const suspendUser         = async (userId) => { await delay(600); return { success: true } }
export const reactivateUser      = async (userId) => { await delay(600); return { success: true, message: 'Account reactivated successfully' } }

export const approveDealer = async (dealerId) => { await delay(700); return { success: true } }
export const rejectDealer  = async (dealerId) => { await delay(700); return { success: true } }
export const approveDealerWithNotification = async (dealerId) => { await delay(700); return { success: true, message: 'Dealer approved. SMS sent.' } }
export const rejectDealerWithReason        = async (dealerId, reason) => { await delay(700); return { success: true, message: 'Dealer rejected. SMS sent with reason.' } }

export const getAdminPayouts = async () => {
  await delay(700)
  return { payouts: MOCK_ALL_PAYOUTS, total_pending: MOCK_ALL_PAYOUTS.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0), total_paid_this_month: 315800, platform_revenue: 28400 }
}
export const triggerPayout    = async (id) => { await delay(1500); const p = MOCK_ALL_PAYOUTS.find(p => p.id === id); if (p) p.status = 'processing'; return { success: true } }
export const markPayoutComplete = async (id) => { await delay(800);  const p = MOCK_ALL_PAYOUTS.find(p => p.id === id); if (p) p.status = 'completed';  return { success: true } }
export const transferDealerPayout = async (id) => { await delay(2000); const p = MOCK_ALL_PAYOUTS.find(p => p.id === id); if (p) p.status = 'processing'; return { success: true, message: 'Transfer initiated via Interswitch', transaction_ref: 'ISNG-PAY-' + Math.random().toString(36).slice(2,8).toUpperCase() } }
export const batchTriggerPayouts  = async () => { await delay(2000); let c = 0; MOCK_ALL_PAYOUTS.forEach(p => { if (p.status === 'pending') { p.status = 'processing'; c++ } }); return { success: true, message: `${c} payouts triggered via Interswitch`, count: c } }

export const getEscrowOrders = async () => {
  await delay(700)
  return { orders: MOCK_ESCROW_ORDERS, stats: { total_held: MOCK_ESCROW_ORDERS.filter(o => o.escrow_status === 'held').reduce((s,o) => s+o.amount,0), total_released: MOCK_ESCROW_ORDERS.filter(o => o.escrow_status === 'released').reduce((s,o) => s+o.amount,0), total_refunded: MOCK_ESCROW_ORDERS.filter(o => o.escrow_status === 'refunded').reduce((s,o) => s+o.amount,0), pending_dispatch: MOCK_ESCROW_ORDERS.filter(o => o.status === 'paid').length, pending_confirm: MOCK_ESCROW_ORDERS.filter(o => o.status === 'dispatched').length, disputed: MOCK_ESCROW_ORDERS.filter(o => o.status === 'disputed').length } }
}
// ── Release Requests (Dealer-initiated) ──────────────────────────────────────
const MOCK_RELEASE_REQUESTS = [
  {
    id: 'rel-001',
    order_id: 'order-005',
    order_ref: 'FXNAP-P6Q7R8',
    type: 'dealer_release',
    farmer: 'Sunday Okafor',
    farmer_phone: '+2347089012345',
    dealer: 'AgroFirst PH',
    product: 'Tricyclazole 75WP (100g)',
    amount: 3300,
    status: 'pending_farmer_response', // pending_farmer_response | farmer_confirmed | farmer_disputed | auto_released | admin_review | resolved_release | resolved_refund
    dealer_note: 'Delivered on Mar 21 at 2pm. Farmer was present and signed.',
    dealer_proof: 'delivery_proof_001.jpg', // mock filename
    dispatched_at: 'Mar 20, 2026',
    request_raised_at: 'Mar 22, 2026',
    farmer_response_deadline: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12hrs from now
    farmer_response: null,
  },
]

// ── Farmer Appeal (Farmer-initiated) ─────────────────────────────────────────
const MOCK_FARMER_APPEALS = [
  {
    id: 'app-001',
    order_id: 'ord-003',
    order_ref: 'ORD-00198',
    type: 'farmer_appeal',
    farmer: 'Demo Farmer',
    dealer: 'NaturaFarm Store',
    product: 'Carbendazim 50WP (250g)',
    amount: 2228,
    status: 'open', // open | dealer_responded | admin_review | resolved_refund | resolved_release
    farmer_reason: 'no_delivery',
    farmer_note: 'It has been 5 days since I paid. The dealer has not delivered.',
    dealer_response: null,
    raised_at: 'Mar 23, 2026',
    dealer_response_deadline: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
  },
]

export const getDisputes = async () => { await delay(600); return MOCK_DISPUTES }

// Dealer: request escrow release with proof
export const requestEscrowRelease = async (orderId, { note, proof_filename }) => {
  await delay(800)
  const req = { id: 'rel-' + Date.now(), order_id: orderId, type: 'dealer_release', status: 'pending_farmer_response', dealer_note: note, dealer_proof: proof_filename || null, request_raised_at: new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }), farmer_response_deadline: new Date(Date.now() + 48*60*60*1000).toISOString() }
  MOCK_RELEASE_REQUESTS.push(req)
  // Update the order status
  const order = MOCK_DEALER_ORDERS.find(o => o.id === orderId)
  if (order) order.release_requested = true
  return { success: true, message: 'Release request submitted. Farmer has 48 hours to respond.', data: req }
}

// Farmer: respond to dealer release request
export const respondToReleaseRequest = async (requestId, { action, note }) => {
  await delay(800)
  const req = MOCK_RELEASE_REQUESTS.find(r => r.id === requestId)
  if (req) {
    req.farmer_response = action // 'confirmed' | 'disputed'
    req.farmer_note = note || ''
    req.status = action === 'confirmed' ? 'farmer_confirmed' : 'admin_review'
    if (action === 'confirmed') {
      // Release escrow
      const order = MOCK_FARMER_ACTIVE_ORDERS.find(o => o.id === req.order_id)
      if (order) { order.status = 'delivered'; order.escrow_status = 'released' }
    }
  }
  return { success: true, message: action === 'confirmed' ? 'Payment released to dealer.' : 'Dispute logged. Admin will review within 24hrs.' }
}

// Farmer: file an appeal (no delivery)
export const fileAppeal = async (orderId, { reason, note }) => {
  await delay(800)
  const appeal = { id: 'app-' + Date.now(), order_id: orderId, type: 'farmer_appeal', status: 'open', farmer_reason: reason, farmer_note: note, raised_at: new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }), dealer_response_deadline: new Date(Date.now() + 48*60*60*1000).toISOString() }
  MOCK_FARMER_APPEALS.push(appeal)
  const order = MOCK_FARMER_ACTIVE_ORDERS.find(o => o.id === orderId)
  if (order) { order.status = 'disputed'; order.appeal_id = appeal.id }
  return { success: true, message: 'Appeal filed. Admin will review within 24–48 hours.', data: appeal }
}

// Admin: get all disputes + release requests
export const getAllDisputes = async () => {
  await delay(600)
  const disputes = MOCK_DISPUTES.map(d => ({ ...d, type: 'farmer_appeal' }))
  const releases = MOCK_RELEASE_REQUESTS.map(r => ({ ...r, reason: r.dealer_note, raised_at: r.request_raised_at }))
  const appeals  = MOCK_FARMER_APPEALS.map(a => ({ ...a }))
  return { disputes: [...disputes, ...releases, ...appeals] }
}

// Admin: resolve release request
export const adminResolveRelease = async (requestId, action) => {
  await delay(1000)
  const req = MOCK_RELEASE_REQUESTS.find(r => r.id === requestId)
  if (req) req.status = action === 'release' ? 'resolved_release' : 'resolved_refund'
  return { success: true, message: action === 'release' ? 'Payment released to dealer.' : 'Refund issued to farmer.' }
}

// Admin: resolve farmer appeal
export const adminResolveAppeal = async (appealId, action) => {
  await delay(1000)
  const appeal = MOCK_FARMER_APPEALS.find(a => a.id === appealId)
  if (appeal) appeal.status = action === 'refund' ? 'resolved_refund' : 'resolved_release'
  return { success: true, message: action === 'refund' ? 'Refund issued to farmer.' : 'Payment released to dealer.' }
}

export const resolveDisputeRefund = async (id) => { await delay(1200); const d = MOCK_DISPUTES.find(d => d.id === id); if (d) d.status = 'resolved_refund'; const o = MOCK_ESCROW_ORDERS.find(o => o.ref === d?.order_ref); if (o) { o.escrow_status = 'refunded'; o.status = 'refunded' } return { success: true, message: 'Dispute resolved — farmer refunded' } }
export const resolveDisputeRelease = async (id) => { await delay(1200); const d = MOCK_DISPUTES.find(d => d.id === id); if (d) d.status = 'resolved_release'; const o = MOCK_ESCROW_ORDERS.find(o => o.ref === d?.order_ref); if (o) { o.escrow_status = 'released'; o.status = 'delivered' } return { success: true, message: 'Dispute resolved — payment released to dealer' } }
export const adminForceRelease = async (id) => { await delay(1000); const o = MOCK_ESCROW_ORDERS.find(o => o.id === id); if (o) { o.escrow_status = 'released'; o.status = 'delivered' } return { success: true, message: 'Escrow force-released to dealer' } }
export const adminForceRefund  = async (id) => { await delay(1000); const o = MOCK_ESCROW_ORDERS.find(o => o.id === id); if (o) { o.escrow_status = 'refunded'; o.status = 'refunded' } return { success: true, message: 'Escrow force-refunded to farmer' } }