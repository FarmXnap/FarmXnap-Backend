// ─── FarmXnap API Service ──────────────────────────────────────────────────────
// REAL:  POST /users                              — init user + OTP
//        POST /users/:id/farmer_profiles          — register farmer
//        POST /users/:id/agro_dealer_profiles     — register dealer
//        POST /auth/login_request                 — login OTP
//        POST /auth/login_verify                  — verify OTP + get token
//        POST /auth/logout                        — invalidate session
//        GET  /users (admin)                      — list all users
//        PATCH /agro_dealer_profiles/:id/verify   — verify dealer
//        GET  /products                           — dealer products
//        POST /products                           — create product
//        POST /farmer_profiles/:id/diagnose       — AI crop diagnosis (multipart)
// MOCK:  Orders, Escrow, Payouts, Dealer/Farmer dashboards, Disputes

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL || 'https://farmxnap.onrender.com/api/v1'
const delay    = (ms = 800) => new Promise(res => setTimeout(res, ms))

// ─── Demo / Live Timer Config ─────────────────────────────────────────────────
// DEMO MODE: All escrow timers set to 2 minutes so you can test the full flow
// TO GO LIVE: set IS_DEMO = false — all timers revert to real production values
export const IS_DEMO = true   // ← flip to false before going live

export const TIMERS = IS_DEMO ? {
  // ── DEMO: 2 minutes each — lets you test the full dispatch → confirm → release flow
  DEALER_DISPATCH_MS:   2 * 60 * 1000,    // dealer must dispatch within 2 mins  (LIVE: 48hrs)
  FARMER_CONFIRM_MS:    2 * 60 * 1000,    // farmer must confirm within 2 mins   (LIVE: 72hrs)
  RELEASE_RESPONSE_MS:  2 * 60 * 1000,    // farmer responds to release in 2 mins(LIVE: 48hrs)
  APPEAL_RESPONSE_MS:   2 * 60 * 1000,    // dealer responds to appeal in 2 mins (LIVE: 48hrs)
  AUTO_RELEASE_MS:      2 * 60 * 1000,    // auto-release escrow after 2 mins    (LIVE: 5 days)
  LABEL_DISPATCH:       '2 mins',         // label shown in UI                   (LIVE: '48hrs')
  LABEL_CONFIRM:        '2 mins',         // label shown in UI                   (LIVE: '72hrs')
  LABEL_RELEASE:        '2 mins',         // label shown in UI                   (LIVE: '48hrs')
  LABEL_AUTO_RELEASE:   '2 mins',         // label shown in UI                   (LIVE: '5 days')
} : {
  // ── LIVE: real production values ──────────────────────────────────────────
  DEALER_DISPATCH_MS:   48  * 60 * 60 * 1000,   // 48 hours
  FARMER_CONFIRM_MS:    72  * 60 * 60 * 1000,   // 72 hours
  RELEASE_RESPONSE_MS:  48  * 60 * 60 * 1000,   // 48 hours
  APPEAL_RESPONSE_MS:   48  * 60 * 60 * 1000,   // 48 hours
  AUTO_RELEASE_MS:      120 * 60 * 60 * 1000,   // 5 days
  LABEL_DISPATCH:       '48hrs',
  LABEL_CONFIRM:        '72hrs',
  LABEL_RELEASE:        '48hrs',
  LABEL_AUTO_RELEASE:   '5 days',
}

const getToken = () => {
  try {
    const s = localStorage.getItem('farmxnap-auth')
    return s ? JSON.parse(s)?.state?.token : null
  } catch { return null }
}

const normalizePhone = (phone) => {
  const digits  = phone.replace(/\D/g, '')
  const stripped = digits.startsWith('234') ? digits.slice(3)
                 : digits.startsWith('0')   ? digits.slice(1)
                 : digits
  return '+234' + stripped
}

// Core JSON fetch
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
      || (json.errors ? (Array.isArray(json.errors) ? json.errors.join(' ') : json.errors) : null)
      || json.message
      || friendlyHttpError(res.status)
    throw new Error(msg)
  }
  return json
}

// Multipart fetch (for image uploads)
const apiUpload = async (method, path, formData, token) => {
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res  = await fetch(`${BASE_URL}${path}`, { method, headers, body: formData })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = json.error
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

// Wake up Render server (free tier sleeps after inactivity)
export const pingServer = async () => {
  try { await fetch(`${BASE_URL}/health`, { method: 'GET' }) } catch {}
}

// Fetch bank list from real API
export const fetchBanks = async () => {
  const res  = await fetch(`${BASE_URL}/banks`)
  const json = await res.json()
  if (!res.ok) throw new Error('Could not load bank list. Please try again.')
  // Return only active Nigerian banks, sorted alphabetically by name
  return (json.data || [])
    .filter(b => b.active !== false)
    .sort((a, b) => a.name.localeCompare(b.name))
}

// Admin fetch — X-Admin-Secret header
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

// ─────────────────────────────────────────────────────────────────────────────
// ✅  REAL API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// 1. POST /users — init user, get OTP
// API returns OTP in response for demo — autofill it
export const requestOTP = async (phone) => {
  const res   = await apiCall('POST', '/users', { phone_number: normalizePhone(phone) })
  const otp   = res.data.OTP
  const uid   = res.data.user.id
  const token = res.data.token
  const norm  = normalizePhone(phone)
  const keys  = { 'farmxnap-otp': otp, 'farmxnap-uid': uid, 'farmxnap-phone': norm, 'farmxnap-temp-token': token }
  Object.entries(keys).forEach(([k, v]) => {
    sessionStorage.setItem(k, v)
    localStorage.setItem(k, v)
  })
  return { success: true, message: res.message, otp } // return OTP for autofill
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
    address:      details.address || '',
    primary_crop: details.crop,
  }, tempToken)

  ;['farmxnap-otp','farmxnap-uid','farmxnap-phone','farmxnap-temp-token'].forEach(k => {
    sessionStorage.removeItem(k); localStorage.removeItem(k)
  })

  // Extract farmer profile ID from HATEOAS links: /api/v1/users/:uid/farmers/:profile_id
  const viewHref        = res.data.links?.view?.href || ''
  const hrefParts       = viewHref.split('/')
  // The last segment of the HATEOAS link is the farmer profile ID
  const hrefProfileId   = hrefParts[hrefParts.length - 1]
  // Validate: must be non-empty and different from user ID (sometimes API returns same value)
  const farmerProfileId = (hrefProfileId && hrefProfileId !== res.data.user.id)
    ? hrefProfileId
    : hrefProfileId || null  // keep it even if same — admin endpoint will verify later

  console.log('[submitFarmerDetails] HATEOAS href:', viewHref, '→ profile_id:', farmerProfileId)

  return {
    success: true,
    message: res.message,
    token:   res.data.token,
    user: {
      id:                res.data.user.id,
      farmer_profile_id: farmerProfileId,
      role:              'farmer',
      phone:             normalizePhone(details.phone),
      name:              details.name,
      crop:              details.crop,
      state:             details.state,
      lga:               details.lga || '',
      address:           details.address || '',
    },
    role: 'farmer',
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
    lga:                     details.lga || '',
    cac_registration_number: details.cac_registration_number,
    bank_code:               details.bank,            // bank code e.g. "044" — API field: bank_code
    bank_account_number:     details.account_number,  // API field: bank_account_number
  }, tempToken)

  ;['farmxnap-otp','farmxnap-uid','farmxnap-phone','farmxnap-temp-token'].forEach(k => {
    sessionStorage.removeItem(k); localStorage.removeItem(k)
  })

  // Extract dealer profile ID from HATEOAS links
  const dealerViewHref    = res.data.links?.view?.href || ''
  const dealerHrefParts   = dealerViewHref.split('/')
  const dealerProfileId   = dealerHrefParts[dealerHrefParts.length - 1] || res.data.user.id

  // API returns role as 'agrodealer' — normalize to 'dealer'
  return {
    success: true,
    message: res.message,
    token:   res.data.token,
    user: {
      id:                      res.data.user.id,
      dealer_profile_id:       dealerProfileId,
      role:                    'dealer',
      business_name:           details.business_name,
      business_address:        details.business_address,
      state:                   details.state,
      lga:                     details.lga || '',
      cac_registration_number: details.cac_registration_number,
      bank:                    details.bank,           // code sent to API
      bank_name:               details.bank_name || details.bank, // display name
      account_number:          details.account_number,
      phone:                   normalizePhone(details.phone || ''),
      member_since:            new Date().toLocaleDateString('en-GB', { month:'long', year:'numeric' }),
    },
    role: 'dealer',
  }
}

// 4. POST /auth/login_request — request login OTP
export const requestLoginOTP = async (phone) => {
  const res = await apiCall('POST', '/auth/login_request', { phone_number: normalizePhone(phone) })
  // API returns OTP in response for demo — store for autofill
  if (res.data?.OTP) {
    sessionStorage.setItem('farmxnap-otp', res.data.OTP)
    localStorage.setItem('farmxnap-otp', res.data.OTP)
  }
  sessionStorage.setItem('farmxnap-phone', normalizePhone(phone))
  return { success: true, message: res.message, otp: res.data?.OTP }
}

// 5. POST /auth/login_verify — verify OTP, get token + role
export const verifyOTP = async (phone, code) => {
  const res = await apiCall('POST', '/auth/login_verify', {
    phone_number: normalizePhone(phone),
    otp: code,
  })
  sessionStorage.removeItem('farmxnap-otp')
  localStorage.removeItem('farmxnap-otp')

  // API returns role as 'farmer' or 'agrodealer' — normalize agrodealer → dealer
  const rawRole = res.data.user.role
  const role    = rawRole === 'agrodealer' ? 'dealer' : rawRole
  const userId  = res.data.user.id
  const token   = res.data.token

  // Fetch full profile data from admin endpoint to populate dashboard fields
  let profileData = {}
  try {
    const { farmers, dealers, raw } = await adminGetAllUsers()
    const rawUser = raw?.find(u => u.id === userId)
    if (rawUser) {
      if (role === 'farmer' && rawUser.farmerProfile) {
        const p = rawUser.farmerProfile
        profileData = {
          farmer_profile_id: p.id,
          name:              p.full_name,
          full_name:         p.full_name,
          state:             p.state,
          lga:               p.lga,
          address:           p.address || '',
          crop:              p.primary_crop,
          primary_crop:      p.primary_crop,
          member_since:      p.created_at
            ? new Date(p.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
            : new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
        }
      } else if (role === 'dealer' && rawUser.agroDealerProfile) {
        const p = rawUser.agroDealerProfile
        profileData = {
          dealer_profile_id:       p.id,
          business_name:           p.business_name,
          business_address:        p.business_address,
          state:                   p.state,
          lga:                     p.lga,
          cac_registration_number: p.cac_registration_number,
          cac_number:              p.cac_registration_number,
          bank:                    p.bank_name        || p.bank,
          account_number:          p.bank_account_number || p.account_number,
          bank_account_name:       p.bank_account_name  || null,
          is_verified:             p.is_verified,
          member_since:            p.created_at
            ? new Date(p.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
            : new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
        }
      }
    }
  } catch { /* silently ignore — dashboard will use fallback */ }

  return {
    success: true,
    message: res.message,
    token,
    user: {
      id:    userId,
      role,
      phone: res.data.user.phone_number,
      ...profileData,
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

// 7. GET /users (admin) — list all users
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
        bank:             p.bank_name        || p.bank        || '—',
        account_number:   p.bank_account_number || p.account_number || '—',
        bank_account_name: p.bank_account_name || null,
        is_verified:      p.is_verified === true,
        status:           p.is_verified ? 'approved' : 'pending',
        joined:           p.created_at
          ? new Date(p.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
          : '—',
        verify_href:      verifyHref,
        products: 0, orders: 0, revenue: 0,
      }
    })

  // Mock suspended dealer for demo — shows the suspended flow
  const mockSuspended = {
    id: 'mock-suspended-001', profile_id: 'mock-profile-001',
    business_name: 'FarmCure Supplies', business_address: '34 Market Rd, Aba',
    phone: '+2348099887766', state: 'Abia', lga: 'Aba North',
    cac_number: 'RC-5544332', bank: 'Zenith Bank', account_number: '2109876543',
    is_verified: false, status: 'suspended',
    joined: '10 Feb 2026', verify_href: null, products: 0, orders: 0, revenue: 0,
  }
  const allDealers = [...dealers]
  if (!allDealers.find(d => d.status === 'suspended')) allDealers.push(mockSuspended)

  return { farmers, dealers: allDealers, raw: users }
}

// 8. PATCH /users/:user_id/agro_dealer_profiles/:id/verify
export const adminVerifyDealer = async (userId, profileId, verifyHref) => {
  const path = `/users/${userId}/agro_dealer_profiles/${profileId}/verify`
  const res  = await adminCall('PATCH', path)
  return {
    success: true,
    message: res.message || 'AgroDealer verified successfully.',
    data:    res.data,
  }
}

// 7b. GET /users/:user_id/farmer_profiles/:id — fetch farmer profile
export const fetchFarmerProfile = async (userId, profileId) => {
  const token = getToken()
  if (!userId || !profileId) return null
  try {
    const res = await apiCall('GET', `/users/${userId}/farmer_profiles/${profileId}`, undefined, token)
    const p   = res.data?.farmerProfile
    if (!p) return null
    return {
      id:           p.id,
      user_id:      p.user_id,
      name:         p.full_name,
      full_name:    p.full_name,
      phone:        res.data.phone_number,
      state:        p.state,
      lga:          p.lga,
      address:      p.address,
      crop:         p.primary_crop,
      primary_crop: p.primary_crop,
      created_at:   p.created_at,
    }
  } catch { return null }
}

// 7c. GET /users/:user_id/agro_dealer_profiles/:id — fetch dealer profile
export const fetchDealerProfile = async (userId, profileId) => {
  const token = getToken()
  if (!userId || !profileId) return null
  try {
    const res = await apiCall('GET', `/users/${userId}/agro_dealer_profiles/${profileId}`, undefined, token)
    const p   = res.data?.agroDealerProfile
    if (!p) return null
    return {
      id:                      p.id,
      user_id:                 p.user_id,
      business_name:           p.business_name,
      business_address:        p.business_address,
      state:                   p.state,
      lga:                     p.lga,
      cac_registration_number: p.cac_registration_number,
      // Updated field names per API docs
      bank:                    p.bank_name        || p.bank,           // bank_name in new docs
      account_number:          p.bank_account_number || p.account_number, // bank_account_number in new docs
      bank_account_name:       p.bank_account_name || null,
      is_verified:             p.is_verified,
      phone:                   res.data.phone_number,
      created_at:              p.created_at,
    }
  } catch { return null }
}

// 9. GET /products — dealer's own products
export const getDealerProducts = async () => {
  const token = getToken()
  const res   = await apiCall('GET', '/products', undefined, token)
  const raw   = res.data || []
  return raw.map(p => ({
    id:              p.id,
    name:            p.name,
    category:        p.category,
    unit:            p.unit,
    price:           parseFloat(p.price) || 0,
    stock:           p.stock_quantity ?? 0,
    stock_quantity:  p.stock_quantity ?? 0,
    in_stock:        (p.stock_quantity ?? 0) > 0,
    disease_target:  p.target_problems || '',
    target_problems: p.target_problems || '',
    active_ingredient: p.active_ingredient || '',
    description:     p.description || '',
    links:           p.links,
  }))
}

// 10. POST /products — create product (returns full product object per updated docs)
export const addProduct = async (data) => {
  const token = getToken()
  const res   = await apiCall('POST', '/products', {
    name:               data.name,
    active_ingredient:  data.active_ingredient || data.name,
    price:              Number(data.price),
    stock_quantity:     Number(data.stock),
    description:        data.description || undefined,
    category:           data.category,
    unit:               data.unit,
    target_problems:    data.disease_target || data.target_problems || undefined,
  }, token)
  const d = res.data || {}
  return {
    id:               d.id              || 'prod-' + Date.now(),
    name:             d.name            || data.name,
    category:         d.category        || data.category,
    unit:             d.unit            || data.unit,
    price:            parseFloat(d.price) || Number(data.price),
    stock:            d.stock_quantity  ?? Number(data.stock),
    stock_quantity:   d.stock_quantity  ?? Number(data.stock),
    in_stock:         (d.stock_quantity ?? Number(data.stock)) > 0,
    disease_target:   d.target_problems || data.disease_target || '',
    target_problems:  d.target_problems || data.disease_target || '',
    active_ingredient: d.active_ingredient || data.active_ingredient || '',
    description:      d.description     || data.description || '',
  }
}

// 11. PUT /products/:id — update product (real API, all fields required per docs)
export const updateProduct = async (id, data) => {
  const token = getToken()
  const res   = await apiCall('PUT', `/products/${id}`, {
    name:               data.name,
    active_ingredient:  data.active_ingredient || data.name,
    price:              Number(data.price),
    stock_quantity:     Number(data.stock),
    description:        data.description || undefined,
    category:           data.category,
    unit:               data.unit,
    target_problems:    data.disease_target || data.target_problems || undefined,
  }, token)
  const d = res.data || {}
  return {
    id:               d.id              || id,
    name:             d.name            || data.name,
    category:         d.category        || data.category,
    unit:             d.unit            || data.unit,
    price:            parseFloat(d.price) || Number(data.price),
    stock:            d.stock_quantity  ?? Number(data.stock),
    stock_quantity:   d.stock_quantity  ?? Number(data.stock),
    in_stock:         (d.stock_quantity ?? Number(data.stock)) > 0,
    disease_target:   d.target_problems || data.disease_target || '',
    target_problems:  d.target_problems || data.disease_target || '',
    active_ingredient: d.active_ingredient || data.active_ingredient || '',
    description:      d.description     || data.description || '',
  }
}

export const deleteProduct = async (id) => ({ success: true })

// OTP flow helpers (OTP verified inside submitFarmerDetails/submitDealerDetails)
export const verifyFarmerPhone = async (phone, code) => ({ success: true, phone })
export const verifyDealerPhone = async (phone, code) => ({ success: true, phone })

// 11. POST /farmer_profiles/:id/diagnose — real AI diagnosis, NO mock fallbacks
export const diagnoseCrop = async (imageDataOrFile, cropType) => {
  const token = getToken()

  // Get farmer profile ID from auth store
  const stored = (() => {
    try { return JSON.parse(localStorage.getItem('farmxnap-auth'))?.state?.user } catch { return null }
  })()

  let farmerProfileId = stored?.farmer_profile_id

  console.log('[diagnoseCrop] stored user:', JSON.stringify({
    id: stored?.id,
    farmer_profile_id: stored?.farmer_profile_id,
    role: stored?.role,
    hasToken: !!token,
  }))

  // If farmer_profile_id is missing or same as user id (bad fallback), fetch it live
  if ((!farmerProfileId || farmerProfileId === stored?.id) && stored?.id && token) {
    console.log('[diagnoseCrop] farmer_profile_id missing — fetching from admin endpoint')
    try {
      const { raw } = await adminGetAllUsers()
      const rawUser = raw?.find(u => u.id === stored.id)
      if (rawUser?.farmerProfile?.id) {
        farmerProfileId = rawUser.farmerProfile.id
        console.log('[diagnoseCrop] Recovered farmer_profile_id:', farmerProfileId)
        // Persist so future scans don't need to re-fetch
        try {
          const authRaw = localStorage.getItem('farmxnap-auth')
          if (authRaw) {
            const parsed = JSON.parse(authRaw)
            parsed.state.user.farmer_profile_id = farmerProfileId
            localStorage.setItem('farmxnap-auth', JSON.stringify(parsed))
          }
        } catch {}
      }
    } catch (e) {
      console.warn('[diagnoseCrop] Could not recover profile id:', e.message)
    }
  }

  // Hard fail — no mock fallback
  if (!token) throw new Error('You are not logged in. Please sign in and try again.')
  if (!farmerProfileId) throw new Error('Farmer profile not found. Please sign out and sign in again.')

  // Build FormData — accept base64 string or File/Blob
  const formData = new FormData()
  if (typeof imageDataOrFile === 'string' && imageDataOrFile.startsWith('data:')) {
    const [meta, b64] = imageDataOrFile.split(',')
    const mime = meta.match(/:(.*?);/)?.[1] || 'image/jpeg'
    const bytes = atob(b64)
    const arr   = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    formData.append('image', new Blob([arr], { type: mime }), 'crop.jpg')
  } else if (imageDataOrFile instanceof File || imageDataOrFile instanceof Blob) {
    formData.append('image', imageDataOrFile, imageDataOrFile.name || 'crop.jpg')
  } else {
    throw new Error('Invalid image. Please take a new photo and try again.')
  }

  console.log('[diagnoseCrop] Sending to API — farmer_profile_id:', farmerProfileId)

  const res = await apiUpload('POST', `/farmer_profiles/${farmerProfileId}/diagnose`, formData, token)
  const d   = res.data

  console.log('[diagnoseCrop] Raw API response:', JSON.stringify(d))

  // Healthy crop — API returns diagnosis without a disease field
  if (!d?.diagnosis?.disease) {
    return {
      healthy:        true,
      crop:           d?.diagnosis?.crop || cropType,
      remedy:         d?.diagnosis?.instructions || 'Your crop looks healthy! Keep up the good work.',
      treatments:     [],
      nearby_dealers: [],
      scanned_at:     new Date().toISOString(),
    }
  }

  // Match label per API docs rank values
  const getMatchLabel = (rank) => {
    if (rank > 2.5) return 'Best Match'
    if (rank > 0.5) return 'Recommended'
    return 'General Treatment'
  }

  return {
    healthy:    false,
    disease:    d.diagnosis.disease,
    crop:       d.diagnosis.crop || cropType,
    confidence: 90,
    symptoms:   [],
    remedy:     d.diagnosis.instructions || '',
    treatments: (d.treatments || []).map(t => ({
      id:                t.id,
      name:              t.name,
      active_ingredient: t.active_ingredient,
      price:             parseFloat(t.price) || 0,
      stock_quantity:    t.stock_quantity,
      unit:              t.unit,
      description:       t.description || '',
      disease_target:    t.target_problems || '',
      category:          t.category || 'Fungicide',
      dealer_name:       t.business_name,
      dealer_address:    t.business_address,
      dealer_phone:      t.phone_number,
      dealer_state:      t.state,
      dealer_bank:         t.bank_name        || t.bank,
      dealer_account:      t.bank_account_number || t.account_number,
      dealer_account_name: t.bank_account_name || null,
      rank:              t.rank,
      match_label:       getMatchLabel(t.rank),
      in_stock:          (t.stock_quantity ?? 0) > 0,
    })),
    nearby_dealers: (d.treatments || []).map(t => ({
      id:           t.id,
      name:         t.business_name,
      address:      t.business_address,
      phone:        t.phone_number,
      state:        t.state,
      price:        parseFloat(t.price) || 0,
      in_stock:     (t.stock_quantity ?? 0) > 0,
      verified:     true,
      rank:         t.rank,
      match_label:  getMatchLabel(t.rank),
      product_name: t.name,
      product:      t,
    })),
    treatment_product: d.treatments?.[0] ? {
      id:    d.treatments[0].id,
      name:  d.treatments[0].name,
      price: parseFloat(d.treatments[0].price) || 0,
    } : null,
    scanned_at: new Date().toISOString(),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔶  MOCK DATA — no backend endpoints yet
// ─────────────────────────────────────────────────────────────────────────────

// Mock diagnosis fallback (used when no token/profile or API fails)
const MOCK_DIAGNOSES = {
  cassava: { disease: 'Cassava mosaic disease', confidence: 93, symptoms: ['Yellow mosaic pattern on leaves','Leaf distortion and curling','Stunted plant growth','Pale green or yellow leaf color'], remedy: 'Apply Imidacloprid 200SL to control whitefly vectors. Remove and destroy infected stems immediately. Use certified disease-free planting material for replanting.', treatment_product: { id: 'prod-001', name: 'Imidacloprid 200SL (500ml)', price: 4200 } },
  maize:   { disease: 'Northern leaf blight',  confidence: 87, symptoms: ['Long elliptical grey-green lesions','Lesions turn tan as they mature','Premature death of leaves'], remedy: 'Apply Mancozeb 80WP fungicide at first sign of disease. Ensure proper plant spacing for air circulation. Remove infected crop debris after harvest.', treatment_product: { id: 'prod-002', name: 'Mancozeb 80WP (1kg)', price: 3500 } },
  tomato:  { disease: 'Early blight',          confidence: 91, symptoms: ['Dark brown spots with concentric rings','Yellow halo around lesions','Lower leaves affected first'], remedy: 'Spray Copper oxychloride 50WP every 7-10 days. Remove affected leaves and destroy them. Avoid overhead irrigation to reduce leaf wetness.', treatment_product: { id: 'prod-003', name: 'Copper oxychloride 50WP (500g)', price: 2800 } },
  yam:     { disease: 'Yam anthracnose',        confidence: 78, symptoms: ['Dark water-soaked lesions on leaves','Die-back of shoot tips','Reddish-brown streaks on stems'], remedy: 'Apply Carbendazim 50WP fungicide. Treat seed yams with wood ash before planting. Rotate crops to reduce soil-borne infection.', treatment_product: { id: 'prod-004', name: 'Carbendazim 50WP (250g)', price: 1900 } },
  rice:    { disease: 'Rice blast',             confidence: 89, symptoms: ['Diamond-shaped lesions with grey centres','Reddish-brown borders on lesions','Neck rot causing panicle to fall'], remedy: 'Apply Tricyclazole 75WP at booting stage. Use resistant varieties. Avoid excessive nitrogen fertilisation.', treatment_product: { id: 'prod-005', name: 'Tricyclazole 75WP (100g)', price: 2200 } },
  pepper:  { disease: 'Pepper mosaic virus',    confidence: 82, symptoms: ['Mosaic yellowing on young leaves','Leaf curling and distortion','Reduced fruit size and yield'], remedy: 'Remove and destroy infected plants immediately. Control aphid vectors with Acetamiprid spray. Use virus-free transplants.', treatment_product: { id: 'prod-006', name: 'Acetamiprid 20SP (100g)', price: 1500 } },
}

const MOCK_DEALERS_NEARBY = [
  { id: 'dealer-001', name: 'AgroFirst PH',  address: '12 Agricultural Rd, Rumuola, PH',  distance_km: 1.2, price: 4200, in_stock: true,  phone: '+234 701 234 5678', rating: 4.8, reviews: 124, verified: true,  delivery_hours: 4, stock_count: 18, badge: 'Top seller' },
  { id: 'dealer-002', name: 'FarmMart',       address: '45 Oil Mill Rd, Diobu, PH',         distance_km: 2.8, price: 3900, in_stock: true,  phone: '+234 802 345 6789', rating: 4.5, reviews: 87,  verified: true,  delivery_hours: 6, stock_count: 7,  badge: 'Best price' },
  { id: 'dealer-003', name: 'GreenLeaf Agro', address: '8 Ikwerre Rd, Mile 3, PH',          distance_km: 4.1, price: 4500, in_stock: false, phone: '+234 703 456 7890', rating: 4.2, reviews: 43,  verified: false, delivery_hours: 8, stock_count: 0,  badge: null },
  { id: 'dealer-004', name: 'AgriWorld',      address: '3 Aba Rd, Rumuomasi, PH',           distance_km: 5.3, price: 4100, in_stock: true,  phone: '+234 806 567 8901', rating: 4.6, reviews: 61,  verified: true,  delivery_hours: 5, stock_count: 23, badge: 'Fast delivery' },
]

const diagnoseCropMock = async (cropType) => {
  await delay(2200)
  const key    = cropType?.toLowerCase() || 'cassava'
  const result = MOCK_DIAGNOSES[key] || MOCK_DIAGNOSES.cassava
  return { ...result, nearby_dealers: MOCK_DEALERS_NEARBY, scanned_at: new Date().toISOString() }
}

// ── Farmer Mock Data ──────────────────────────────────────────────────────────
const MOCK_FARMER_ACTIVE_ORDERS = [
  { id: 'ord-003', ref: 'ORD-00198', scan_id: 'scan-004', product: 'Carbendazim 50WP (250g)', crop: 'Yam', disease: 'Yam anthracnose', dealer: 'NaturaFarm Store', dealer_phone: '+234 803 456 7891', dealer_address: '45 Farm Road, Enugu', amount: 2228, status: 'dispatched', date_ordered: 'Feb 28, 2026', escrow_status: 'held', expires_at: new Date(Date.now() + TIMERS.FARMER_CONFIRM_MS).toISOString() },
  { id: 'ord-005', ref: 'ORD-00315', scan_id: 'scan-001', product: 'Imidacloprid 200SL (500ml)', crop: 'Cassava', disease: 'Cassava mosaic disease', dealer: 'AgroFirst PH', dealer_phone: '+234 701 234 5678', dealer_address: '12 Agricultural Rd, Rumuola, PH', amount: 4872, status: 'pending', date_ordered: 'Mar 22, 2026', escrow_status: 'held', expires_at: new Date(Date.now() + TIMERS.DEALER_DISPATCH_MS).toISOString() },
  { id: 'ord-006', ref: 'ORD-00321', scan_id: 'scan-002', product: 'Mancozeb 80WP (1kg)', crop: 'Maize', disease: 'Northern leaf blight', dealer: 'GreenField Supplies', dealer_phone: '+234 802 345 6789', dealer_address: '88 Market Rd, Onitsha', amount: 3500, status: 'paid', date_ordered: 'Mar 24, 2026', escrow_status: 'held', expires_at: new Date(Date.now() + TIMERS.DEALER_DISPATCH_MS).toISOString() },
]

const getStoredUser = () => {
  try { return JSON.parse(localStorage.getItem('farmxnap-auth'))?.state?.user } catch { return null }
}

const MOCK_TIPS = [
  { id: 1, title: 'Best time to spray fungicide',   body: 'Apply fungicide in the early morning or late evening to prevent evaporation and maximise leaf absorption. Avoid spraying before rain.',   crop: 'All crops', tag: 'Prevention'  },
  { id: 2, title: 'Cassava mosaic early signs',      body: 'Watch for yellowing and twisting of young leaves. Early detection and treatment saves up to 80% of your yield.',                          crop: 'Cassava',   tag: 'Detection'   },
  { id: 3, title: 'Crop rotation benefits',          body: 'Rotating maize with legumes like cowpea replenishes soil nitrogen and breaks pest cycles naturally. Rotate every season.',                crop: 'Maize',     tag: 'Soil health' },
  { id: 4, title: 'Escrow protects your money',      body: 'Your payment is held safely in FarmXnap Escrow until you confirm delivery. Never release escrow before inspecting your treatment products.',  crop: 'All crops', tag: 'Finance'     },
  { id: 5, title: 'How to confirm delivery',         body: 'After your dealer delivers, go to Orders tab → tap the order → enter your PIN to confirm. This releases payment to the dealer.',           crop: 'All crops', tag: 'How-to'      },
  { id: 6, title: 'Tomato blight prevention',        body: 'Space tomato plants at least 60cm apart for airflow. Avoid watering leaves — drip irrigate at the base to prevent fungal spread.',       crop: 'Tomato',    tag: 'Prevention'  },
]

// GET /farmer_profiles/:farmer_profile_id/crop_scans — real scan history
export const getFarmerHistory = async () => {
  const token = getToken()
  const stored = (() => {
    try { return JSON.parse(localStorage.getItem('farmxnap-auth'))?.state?.user } catch { return null }
  })()
  let farmerProfileId = stored?.farmer_profile_id

  // Recover profile ID if missing
  if ((!farmerProfileId || farmerProfileId === stored?.id) && stored?.id && token) {
    try {
      const { raw } = await adminGetAllUsers()
      const rawUser = raw?.find(u => u.id === stored.id)
      if (rawUser?.farmerProfile?.id) farmerProfileId = rawUser.farmerProfile.id
    } catch {}
  }

  if (!farmerProfileId || !token) return []

  try {
    const res  = await apiCall('GET', `/farmer_profiles/${farmerProfileId}/crop_scans`, undefined, token)
    const scans = res.data || []

    return scans.map(s => ({
      id:               s.id,
      crop:             s.crop             || 'Unknown',
      disease:          s.disease          || null,       // null = healthy
      date:             s.created_at
        ? new Date(s.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
        : '—',
      confidence:       90,                              // API doesn't return confidence
      status:           s.disease ? 'pending' : 'healthy',
      remedy:           s.instructions    || '',
      symptoms:         [],                              // API doesn't return symptoms
      active_ingredient: s.active_ingredient || '',
      search_term:      s.search_term      || '',
      category:         s.category         || '',
      // treatment_product and order will be null until order API is implemented
      treatment_product: null,
      order:             null,
      farmer_profile_id: s.farmer_profile_id,
      raw:               s,
    }))
  } catch (e) {
    console.warn('[getFarmerHistory] Failed:', e.message)
    return []
  }
}

export const getFarmerActiveOrders = async () => { await delay(600); return MOCK_FARMER_ACTIVE_ORDERS }
export const getFarmerProfile      = async () => {
  await delay(200)
  const stored = getStoredUser()
  return {
    id:                stored?.id    || '',
    farmer_profile_id: stored?.farmer_profile_id || stored?.id || '',
    name:              stored?.name  || stored?.full_name || '',
    full_name:         stored?.name  || stored?.full_name || '',
    phone:             stored?.phone || stored?.phone_number || '',
    state:             stored?.state || '',
    lga:               stored?.lga   || '',
    address:           stored?.address || '',
    crop:              stored?.crop  || stored?.primary_crop || '',
    primary_crop:      stored?.crop  || stored?.primary_crop || '',
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
  const stored  = getStoredUser() || {}
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
  if (idx !== -1) { MOCK_FARMER_ACTIVE_ORDERS[idx].status = 'delivered'; MOCK_FARMER_ACTIVE_ORDERS[idx].escrow_status = 'released' }
  // History now comes from real API — no local mutation needed
  return { success: true }
}

// ── Orders — REAL API ─────────────────────────────────────────────────────────
// POST /products/:product_id/orders — no request body
export const createOrder = async ({ item, dealer, payment_method, tx_ref, interswitch_ref }) => {
  const token     = getToken()
  const productId = item?.id

  // Log what we're sending for debugging
  console.log('[createOrder] product_id:', productId, 'item:', item?.name)

  if (!productId || !token) {
    // Fallback to mock if no product_id (e.g. from mock diagnosis)
    console.warn('[createOrder] No product_id or token — using mock order')
    const orderId = 'ORD-' + Math.random().toString(36).slice(2, 8).toUpperCase()
    const ref     = tx_ref || 'FXNAP-' + Math.random().toString(36).slice(2, 10).toUpperCase()
    return { success: true, order: { id: orderId, reference: ref, item, dealer, payment_method, status: 'escrow_held', escrow_status: 'held', paid_at: new Date().toISOString(), expires_at: new Date(Date.now() + TIMERS.DEALER_DISPATCH_MS).toISOString() } }
  }

  const res = await apiCall('POST', `/products/${productId}/orders`, undefined, token)

  // Response structure TBD — normalise whatever comes back
  const data = res.data || res
  console.log('[createOrder] API response:', data)

  return {
    success:   true,
    order: {
      id:             data?.id            || data?.order_id || ('ORD-' + Math.random().toString(36).slice(2,8).toUpperCase()),
      reference:      data?.reference     || data?.ref      || tx_ref || interswitch_ref || '',
      item,
      dealer,
      payment_method,
      tx_ref,
      interswitch_ref,
      status:         data?.status        || 'escrow_held',
      escrow_status:  data?.escrow_status || 'held',
      paid_at:        data?.paid_at       || new Date().toISOString(),
      expires_at:     data?.expires_at    || new Date(Date.now() + TIMERS.DEALER_DISPATCH_MS).toISOString(),
      raw:            data,
    }
  }
}
export const initiatePayment  = async () => { await delay(2000); return { status: 'success', reference: 'FXNAP-' + Math.random().toString(36).slice(2, 10).toUpperCase() } }
export const confirmDelivery  = async () => { await delay(1200); return { success: true, status: 'completed', funds_released: true } }
export const getOrderStatus   = async () => { await delay(600);  return { status: 'dispatched', dispatched_at: new Date().toISOString() } }
export const releaseEscrow    = async () => { await delay(1400); return { success: true, message: 'Escrow released. Dealer payout queued.' } }
export const refundEscrow     = async () => { await delay(1200); return { success: true, message: 'Refund initiated to farmer via FarmXnap Escrow' } }
export const initiateInterswitchPayment = async ({ amount }) => { await delay(1200); return { success: true, payment_ref: 'ISNG-' + Math.random().toString(36).slice(2, 10).toUpperCase(), payment_url: 'https://pay.interswitch.com/pay/mock', amount, status: 'pending' } }
export const verifyInterswitchPayment   = async () => { await delay(1000); return { success: true, status: 'escrow_held', message: 'Payment verified by Interswitch and held in FarmXnap Escrow' } }

// ── Dealer Mock Data ──────────────────────────────────────────────────────────
const getStoredDealer = () => {
  try { return JSON.parse(localStorage.getItem('farmxnap-auth'))?.state?.user } catch { return null }
}

const MOCK_DEALER_ORDERS = [
  { id: 'order-001', ref: 'FXNAP-A7B2C3', farmer: 'Emeka Okonkwo',  farmer_phone: '+2348034567890', farmer_location: 'Rumuola, Obio-Akpor LGA',    farmer_state: 'Rivers State', crop: 'Cassava', disease: 'Cassava mosaic disease', product: 'Imidacloprid 200SL (500ml)',    quantity: 1, unit_price: 4200, delivery_fee: 500, platform_fee: 190, amount: 4750, escrow_status: 'held',     status: 'pending',    date: 'Mar 19, 2026', paid_at: 'Mar 19, 2026 09:14', notes: 'Please deliver between 9am–5pm weekdays' },
  { id: 'order-002', ref: 'FXNAP-E5F6G7', farmer: 'Amaka Chukwu',   farmer_phone: '+2348021112233', farmer_location: 'Abakpa Nike, Enugu East LGA', farmer_state: 'Enugu State',  crop: 'Tomato',  disease: 'Early blight',            product: 'Copper oxychloride 50WP (500g)', quantity: 2, unit_price: 2800, delivery_fee: 500, platform_fee: 116, amount: 3200, escrow_status: 'released', status: 'delivered',  date: 'Mar 18, 2026', paid_at: 'Mar 16, 2026 11:30', delivered_at: 'Mar 18, 2026 14:20', notes: '' },
  { id: 'order-003', ref: 'FXNAP-I9J0K1', farmer: 'Bola Adeyemi',   farmer_phone: '+2347056789012', farmer_location: 'Bodija, Ibadan North LGA',    farmer_state: 'Oyo State',    crop: 'Maize',   disease: 'Northern leaf blight',    product: 'Mancozeb 80WP (1kg)',            quantity: 1, unit_price: 3500, delivery_fee: 500, platform_fee: 140, amount: 2800, escrow_status: 'released', status: 'delivered',  date: 'Mar 17, 2026', paid_at: 'Mar 15, 2026 08:45', delivered_at: 'Mar 17, 2026 10:00', notes: 'Call before arriving' },
  { id: 'order-004', ref: 'FXNAP-M3N4O5', farmer: 'Chidi Nwosu',    farmer_phone: '+2348062345678', farmer_location: 'Rumuokoro, Obio-Akpor LGA',   farmer_state: 'Rivers State', crop: 'Yam',     disease: 'Yam anthracnose',         product: 'Carbendazim 50WP (250g)',        quantity: 2, unit_price: 1900, delivery_fee: 500, platform_fee: 76,  amount: 2200, escrow_status: 'held',     status: 'pending',    date: 'Mar 17, 2026', paid_at: 'Mar 17, 2026 15:22', notes: '' },
  { id: 'order-005', ref: 'FXNAP-P6Q7R8', farmer: 'Sunday Okafor',  farmer_phone: '+2347089012345', farmer_location: 'Ikeja, Lagos Island LGA',      farmer_state: 'Lagos State',  crop: 'Rice',    disease: 'Rice blast',              product: 'Tricyclazole 75WP (100g)',       quantity: 3, unit_price: 2200, delivery_fee: 500, platform_fee: 88,  amount: 3300, escrow_status: 'held',     status: 'dispatched', date: 'Mar 20, 2026', paid_at: 'Mar 20, 2026 07:30', notes: 'Call before delivery' },
  { id: 'order-006', ref: 'FXNAP-S9T0U1', farmer: 'Fatima Aliyu',   farmer_phone: '+2348112223344', farmer_location: 'Kano Municipal LGA',            farmer_state: 'Kano State',   crop: 'Pepper',  disease: 'Pepper mosaic virus',     product: 'Acetamiprid 20SP (100g)',        quantity: 1, unit_price: 1500, delivery_fee: 500, platform_fee: 60,  amount: 1500, escrow_status: 'refunded', status: 'refunded',   date: 'Mar 15, 2026', paid_at: 'Mar 15, 2026 12:00', notes: 'Product was out of stock' },
]

export const getDealerOrders  = async () => { await delay(700); return MOCK_DEALER_ORDERS }
export const getDealerStats   = async () => { await delay(500); return { orders_today: 3, revenue_today: 10372, new_leads: 2, total_orders: 6 } }
export const getDealerProfile = async () => {
  await delay(200)
  const stored = getStoredDealer()
  return {
    id:                      stored?.id    || '',
    dealer_profile_id:       stored?.dealer_profile_id || stored?.id || '',
    business_name:           stored?.business_name || '',
    phone:                   stored?.phone || '',
    address:                 stored?.business_address || stored?.address || '',
    business_address:        stored?.business_address || '',
    state:                   stored?.state || '',
    lga:                     stored?.lga   || '',
    cac_number:              stored?.cac_registration_number || stored?.cac_number || '',
    cac_registration_number: stored?.cac_registration_number || '',
    bank:                    stored?.bank  || '',
    account_number:          stored?.account_number || '',
    account_name:            stored?.business_name || '',
    role:                    'dealer',
    approved:                stored?.is_verified === true,
    verified:                stored?.is_verified === true,
    is_verified:             stored?.is_verified === true,
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
      const farmerIdx   = MOCK_FARMER_ACTIVE_ORDERS.findIndex(o => o.product === dealerOrder.product || o.ref === dealerOrder.ref)
      if (farmerIdx !== -1) {
        MOCK_FARMER_ACTIVE_ORDERS[farmerIdx].status       = 'dispatched'
        MOCK_FARMER_ACTIVE_ORDERS[farmerIdx].escrow_status = 'held'
      }
    }
  }
  return { success: true, order_id: orderId, status }
}

export const updateDealerProfile = async (data) => {
  await delay(700)
  const stored  = getStoredDealer() || {}
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

export const createProduct    = async (data) => addProduct(data)
export const getDealerPayouts = async () => { await delay(600); return { payouts: [], total_earned: 0, total_paid: 0, pending_payout: 0 } }
export const requestPayout    = async () => ({ success: true })

// ── Admin Mock ────────────────────────────────────────────────────────────────
const MOCK_ALL_SCANS         = [ { id: 's-001', farmer: 'Emeka Okonkwo',  crop: 'Cassava', disease: 'Cassava mosaic disease', confidence: 93, date: 'Mar 18, 2026', state: 'Rivers',  treated: true  }, { id: 's-002', farmer: 'Bola Adeyemi',  crop: 'Tomato',  disease: 'Early blight',           confidence: 91, date: 'Mar 17, 2026', state: 'Oyo',     treated: true  }, { id: 's-003', farmer: 'Amaka Chukwu', crop: 'Maize',   disease: 'Northern leaf blight',   confidence: 87, date: 'Mar 16, 2026', state: 'Enugu',   treated: false }, { id: 's-004', farmer: 'Sunday Okafor', crop: 'Cassava', disease: 'Cassava mosaic disease', confidence: 88, date: 'Mar 15, 2026', state: 'Anambra', treated: true  }, { id: 's-005', farmer: 'Chidi Nwosu',  crop: 'Yam',     disease: 'Yam anthracnose',        confidence: 78, date: 'Mar 14, 2026', state: 'Rivers',  treated: false }, { id: 's-006', farmer: 'Fatima Aliyu', crop: 'Rice',    disease: 'Rice blast',             confidence: 89, date: 'Mar 12, 2026', state: 'Kano',    treated: true  } ]
const MOCK_DISEASE_BREAKDOWN = [ { disease: 'Cassava mosaic disease', count: 1243, percent: 34 }, { disease: 'Early blight', count: 876, percent: 24 }, { disease: 'Northern leaf blight', count: 654, percent: 18 }, { disease: 'Rice blast', count: 432, percent: 12 }, { disease: 'Yam anthracnose', count: 287, percent: 8 }, { disease: 'Other', count: 145, percent: 4 } ]
const MOCK_MONTHLY_SCANS     = [ { month: 'Oct', scans: 210 }, { month: 'Nov', scans: 340 }, { month: 'Dec', scans: 290 }, { month: 'Jan', scans: 520 }, { month: 'Feb', scans: 780 }, { month: 'Mar', scans: 1104 } ]

const MOCK_ESCROW_ORDERS = [
  { id: 'esc-001', ref: 'FXNAP-A7B2C3D4', farmer: 'Emeka Okonkwo', farmer_phone: '+2348034567890', dealer: 'AgroFirst PH',       dealer_id: 'd-001', product: 'Imidacloprid 200SL (500ml)',    amount: 4872, platform_fee: 195, dealer_payout: 4677, status: 'dispatched', escrow_status: 'held',     paid_at: 'Mar 18, 2026 09:14', dispatched_at: 'Mar 18, 2026 14:32', crop: 'Cassava', disease: 'Cassava mosaic disease' },
  { id: 'esc-002', ref: 'FXNAP-E5F6G7H8', farmer: 'Amaka Chukwu',  farmer_phone: '+2348021112233', dealer: 'GreenField Supplies', dealer_id: 'd-002', product: 'Mancozeb 80WP (1kg)',            amount: 3828, platform_fee: 153, dealer_payout: 3675, status: 'paid',       escrow_status: 'held',     paid_at: 'Mar 19, 2026 11:05', crop: 'Maize', disease: 'Northern leaf blight' },
  { id: 'esc-003', ref: 'FXNAP-I9J0K1L2', farmer: 'Bola Adeyemi',  farmer_phone: '+2347056789012', dealer: 'AgroFirst PH',       dealer_id: 'd-001', product: 'Copper oxychloride 50WP (500g)', amount: 2996, platform_fee: 120, dealer_payout: 2876, status: 'delivered',  escrow_status: 'released', paid_at: 'Mar 15, 2026 08:30', crop: 'Tomato', disease: 'Early blight' },
  { id: 'esc-004', ref: 'FXNAP-M3N4O5P6', farmer: 'Chidi Nwosu',   farmer_phone: '+2348062345678', dealer: 'FarmMart',           dealer_id: 'd-002', product: 'Carbendazim 50WP (250g)',        amount: 2228, platform_fee: 89,  dealer_payout: 2139, status: 'disputed',   escrow_status: 'held',     paid_at: 'Mar 14, 2026 13:00', dispute_reason: 'Farmer says product was expired. Dealer disputes claim.', crop: 'Yam', disease: 'Yam anthracnose' },
  { id: 'esc-005', ref: 'FXNAP-Q7R8S9T0', farmer: 'Fatima Aliyu',  farmer_phone: '+2347034561234', dealer: 'GreenLeaf Agro',     dealer_id: 'd-003', product: 'Tricyclazole 75WP (100g)',       amount: 2420, platform_fee: 97,  dealer_payout: 2323, status: 'refunded',   escrow_status: 'refunded', paid_at: 'Mar 12, 2026 10:00', crop: 'Rice', disease: 'Rice blast' },
]

const MOCK_DISPUTES = [
  { id: 'dsp-001', order_ref: 'FXNAP-M3N4O5P6', farmer: 'Chidi Nwosu', dealer: 'FarmMart', amount: 2228, reason: 'Farmer says product was expired. Dealer disputes claim.', raised_at: 'Mar 17, 2026', status: 'open', evidence: 'Farmer submitted photo of product expiry date' },
]

const MOCK_RELEASE_REQUESTS = [
  { id: 'rel-001', order_id: 'order-005', order_ref: 'FXNAP-P6Q7R8', type: 'dealer_release', farmer: 'Sunday Okafor', farmer_phone: '+2347089012345', dealer: 'AgroFirst PH', product: 'Tricyclazole 75WP (100g)', amount: 3300, status: 'pending_farmer_response', dealer_note: 'Delivered on Mar 21 at 2pm. Farmer was present and signed.', dealer_proof: 'delivery_proof_001.jpg', dispatched_at: 'Mar 20, 2026', request_raised_at: 'Mar 22, 2026', farmer_response_deadline: new Date(Date.now() + TIMERS.RELEASE_RESPONSE_MS).toISOString(), farmer_response: null },
]

const MOCK_FARMER_APPEALS = [
  { id: 'app-001', order_id: 'ord-003', order_ref: 'ORD-00198', type: 'farmer_appeal', farmer: 'Demo Farmer', dealer: 'NaturaFarm Store', product: 'Carbendazim 50WP (250g)', amount: 2228, status: 'open', farmer_reason: 'no_delivery', farmer_note: 'It has been 5 days since I paid. The dealer has not delivered.', dealer_response: null, raised_at: 'Mar 23, 2026', dealer_response_deadline: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString() },
]

export const getAdminStats = async () => {
  try {
    const { farmers, dealers } = await adminGetAllUsers()
    return { total_farmers: farmers.length, total_dealers: dealers.length, pending_dealers: dealers.filter(d => d.status === 'pending').length, total_scans: 0, total_revenue: 0, scans_today: 0, new_users_today: 0, treatments_sold: 0 }
  } catch {
    return { total_farmers: 0, total_dealers: 0, pending_dealers: 0, total_scans: 0, total_revenue: 0, scans_today: 0, new_users_today: 0, treatments_sold: 0 }
  }
}

export const getAllFarmers        = async () => { const { farmers } = await adminGetAllUsers(); return farmers }
export const getAllDealers        = async () => { const { dealers } = await adminGetAllUsers(); return dealers }
export const getAllScans          = async () => { await delay(700); return MOCK_ALL_SCANS }
export const getDiseaseBreakdown = async () => { await delay(500); return MOCK_DISEASE_BREAKDOWN }
export const getMonthlyScanData  = async () => { await delay(500); return MOCK_MONTHLY_SCANS }
export const suspendUser         = async ()  => { await delay(600); return { success: true } }
export const reactivateUser      = async ()  => { await delay(600); return { success: true, message: 'Account reactivated successfully' } }
export const approveDealer       = async ()  => { await delay(700); return { success: true } }
export const rejectDealer        = async ()  => { await delay(700); return { success: true } }
export const approveDealerWithNotification = async () => { await delay(700); return { success: true, message: 'Dealer approved. SMS sent.' } }
export const rejectDealerWithReason        = async () => { await delay(700); return { success: true, message: 'Dealer rejected.' } }

export const getEscrowOrders = async () => {
  await delay(700)
  return { orders: MOCK_ESCROW_ORDERS, stats: { total_held: MOCK_ESCROW_ORDERS.filter(o => o.escrow_status === 'held').reduce((s,o) => s+o.amount,0), total_released: MOCK_ESCROW_ORDERS.filter(o => o.escrow_status === 'released').reduce((s,o) => s+o.amount,0), total_refunded: MOCK_ESCROW_ORDERS.filter(o => o.escrow_status === 'refunded').reduce((s,o) => s+o.amount,0), pending_dispatch: MOCK_ESCROW_ORDERS.filter(o => o.status === 'paid').length, pending_confirm: MOCK_ESCROW_ORDERS.filter(o => o.status === 'dispatched').length, disputed: MOCK_ESCROW_ORDERS.filter(o => o.status === 'disputed').length } }
}

export const getDisputes         = async () => { await delay(600); return MOCK_DISPUTES }
export const getAllDisputes       = async () => {
  await delay(600)
  return { disputes: [ ...MOCK_DISPUTES.map(d => ({ ...d, type: 'farmer_appeal' })), ...MOCK_RELEASE_REQUESTS.map(r => ({ ...r, reason: r.dealer_note, raised_at: r.request_raised_at })), ...MOCK_FARMER_APPEALS ] }
}

export const requestEscrowRelease = async (orderId, { note, proof_filename }) => {
  await delay(800)
  const req = { id: 'rel-' + Date.now(), order_id: orderId, type: 'dealer_release', status: 'pending_farmer_response', dealer_note: note, dealer_proof: proof_filename || null, request_raised_at: new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }), farmer_response_deadline: new Date(Date.now() + TIMERS.RELEASE_RESPONSE_MS).toISOString() }
  MOCK_RELEASE_REQUESTS.push(req)
  const order = MOCK_DEALER_ORDERS.find(o => o.id === orderId)
  if (order) order.release_requested = true
  return { success: true, message: `Release request submitted. Farmer has ${TIMERS.LABEL_RELEASE} to respond.`, data: req }
}

export const respondToReleaseRequest = async (requestId, { action, note }) => {
  await delay(800)
  const req = MOCK_RELEASE_REQUESTS.find(r => r.id === requestId)
  if (req) {
    req.farmer_response = action
    req.farmer_note     = note || ''
    req.status          = action === 'confirmed' ? 'farmer_confirmed' : 'admin_review'
    if (action === 'confirmed') {
      const order = MOCK_FARMER_ACTIVE_ORDERS.find(o => o.id === req.order_id)
      if (order) { order.status = 'delivered'; order.escrow_status = 'released' }
    }
  }
  return { success: true, message: action === 'confirmed' ? 'Payment released to dealer.' : 'Dispute logged. Admin will review within 24hrs.' }
}

export const fileAppeal = async (orderId, { reason, note }) => {
  await delay(800)
  const appeal = { id: 'app-' + Date.now(), order_id: orderId, type: 'farmer_appeal', status: 'open', farmer_reason: reason, farmer_note: note, raised_at: new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }), dealer_response_deadline: new Date(Date.now() + TIMERS.APPEAL_RESPONSE_MS).toISOString() }
  MOCK_FARMER_APPEALS.push(appeal)
  const order = MOCK_FARMER_ACTIVE_ORDERS.find(o => o.id === orderId)
  if (order) { order.status = 'disputed'; order.appeal_id = appeal.id }
  return { success: true, message: `Appeal filed. Admin will review shortly (demo: ${TIMERS.LABEL_RELEASE}).`, data: appeal }
}

export const adminResolveRelease = async (requestId, action) => {
  await delay(1000)
  const req = MOCK_RELEASE_REQUESTS.find(r => r.id === requestId)
  if (req) req.status = action === 'release' ? 'resolved_release' : 'resolved_refund'
  return { success: true, message: action === 'release' ? 'Payment released to dealer.' : 'Refund issued to farmer.' }
}

export const adminResolveAppeal = async (appealId, action) => {
  await delay(1000)
  const appeal = MOCK_FARMER_APPEALS.find(a => a.id === appealId)
  if (appeal) appeal.status = action === 'refund' ? 'resolved_refund' : 'resolved_release'
  return { success: true, message: action === 'refund' ? 'Refund issued to farmer.' : 'Payment released to dealer.' }
}

export const resolveDisputeRefund   = async (id) => { await delay(1200); const d = MOCK_DISPUTES.find(d => d.id === id); if (d) d.status = 'resolved_refund';   const o = MOCK_ESCROW_ORDERS.find(o => o.ref === d?.order_ref); if (o) { o.escrow_status = 'refunded'; o.status = 'refunded' }  return { success: true, message: 'Dispute resolved — farmer refunded' } }
export const resolveDisputeRelease  = async (id) => { await delay(1200); const d = MOCK_DISPUTES.find(d => d.id === id); if (d) d.status = 'resolved_release';  const o = MOCK_ESCROW_ORDERS.find(o => o.ref === d?.order_ref); if (o) { o.escrow_status = 'released'; o.status = 'delivered' } return { success: true, message: 'Dispute resolved — payment released to dealer' } }
export const adminForceRelease      = async (id) => { await delay(1000); const o = MOCK_ESCROW_ORDERS.find(o => o.id === id); if (o) { o.escrow_status = 'released'; o.status = 'delivered' } return { success: true, message: 'Escrow force-released to dealer' } }
export const adminForceRefund       = async (id) => { await delay(1000); const o = MOCK_ESCROW_ORDERS.find(o => o.id === id); if (o) { o.escrow_status = 'refunded'; o.status = 'refunded' } return { success: true, message: 'Escrow force-refunded to farmer' } }
export const getAdminPayouts        = async () => { await delay(700); return { payouts: [], total_pending: 0, total_paid_this_month: 0, platform_revenue: 0 } }
export const triggerPayout          = async () => ({ success: true })
export const markPayoutComplete     = async () => ({ success: true })
export const transferDealerPayout   = async () => ({ success: true, message: 'Transfer initiated via Interswitch', transaction_ref: 'ISNG-PAY-' + Math.random().toString(36).slice(2,8).toUpperCase() })
export const batchTriggerPayouts    = async () => ({ success: true, message: 'Payouts triggered', count: 0 })