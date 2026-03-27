import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AppLogo from '../component/AppLogo'
import PinSheet from '../component/PinSheet'
import { NIGERIA_STATES, getLgasByState } from '../data/nigeriaApi'
import {
  Camera, Leaf, LogOut, CheckCircle, AlertCircle, Clock,
  Home, Activity, ClipboardList, Lightbulb, UserCircle, ChevronRight,
  TrendingUp, Sprout, MapPin, Phone, Pencil, Check, X, Star,
  Package, Truck, ShieldCheck, Moon, Sun,
} from 'lucide-react'
import { useAuthStore, useThemeStore, useToastStore } from '../store'
import { logoutUser, TIMERS } from '../services/api'
import {
  getFarmerHistory, getFarmTips,
  updateFarmerProfile, getFarmerActiveOrders, farmerConfirmDelivery,
  adminGetAllUsers,
} from '../services/api'

const CROPS  = ['Cassava', 'Maize', 'Tomato', 'Yam', 'Rice', 'Other']
const STATES = ['Rivers', 'Lagos', 'Kano', 'Oyo', 'Kaduna', 'Enugu', 'Delta', 'Anambra', 'Other']

const TABS = [
  { key: 'home',    icon: Home,          label: 'Home'    },
  { key: 'orders',  icon: ClipboardList, label: 'Orders'  },
  { key: 'tips',    icon: Lightbulb,     label: 'Tips'    },
  { key: 'profile', icon: UserCircle,    label: 'Profile' },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const TAB = ({ children }) => <div className="dash-tab">{children}</div>

const SH = ({ title, action, onAction }) => (
  <div className="flex items-center justify-between mb-3">
    <p className="sec-title">{title}</p>
    {action && <button onClick={onAction} className="text-brand-green text-xs">{action}</button>}
  </div>
)

const ScanRow = ({ scan, onClick }) => {
  const treated = scan.status === 'treated'
  return (
    <button className="glass-card flex items-center gap-3 mb-2 w-full text-left active:scale-[0.985] transition-all"
      onClick={onClick}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${treated ? 'bg-brand-green/10' : 'bg-red-500/10'}`}>
        <Leaf size={14} className={treated ? 'text-brand-green' : 'text-red-400'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-(--tx) text-sm font-medium truncate">{scan.disease}</p>
        <p className="text-(--tx-sub) text-xs">{scan.crop} · {scan.date}</p>
      </div>
      <span className={`badge flex-shrink-0 ${treated ? 'green' : 'red'}`}>
        {treated ? 'Treated' : 'Untreated'}
      </span>
    </button>
  )
}

// ── Edit Profile Sheet ──────────────────────────────────────────────────────
function EditSheet({ profile, user, onClose, onSave }) {
  const src = { ...user, ...profile }
  const [form, setForm] = useState({
    name:        src.name        || src.full_name   || '',
    phone:       src.phone       || src.phone_number|| '',
    state:       src.state       || '',
    lga:         src.lga         || '',
    address:     src.address     || '',
    crop:        src.crop        || src.primary_crop|| 'Cassava',
    customCrop:  '',
    farm_size:   src.farm_size   || '',
    experience:  src.experience  || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const lgas = form.state ? getLgasByState(form.state) : []

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { ...form }
      if (form.crop === 'Other') payload.crop = form.customCrop.trim() || 'Other'
      delete payload.customCrop
      const res = await updateFarmerProfile(payload)
      onSave(res.user)
    } finally { setSaving(false) }
  }

  return (
    <div className="sheet-backdrop">
      <div className="sheet-panel">

        {/* Header */}
        <div className="sheet-header">
          <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--card-br)' }} />
          <div className="flex items-center justify-between">
            <h3 className="font-syne font-bold text-lg text-(--tx)">Edit profile</h3>
            <button onClick={onClose} className="nav-close"><X size={15} /></button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="sheet-body pb-4">
          <div className="flex flex-col gap-3">

            <div>
              <span className="field-label">Full name</span>
              <input className="field-input" placeholder="Emeka Okonkwo"
                value={form.name} onChange={e => set('name', e.target.value)} />
            </div>

            <div>
              <span className="field-label">Phone</span>
              <input className="field-input" type="tel" value={form.phone}
                onChange={e => set('phone', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="field-label">State</span>
                <select className="field-select" value={form.state}
                  onChange={e => { set('state', e.target.value); set('lga', '') }}>
                  <option value="">Select state</option>
                  {NIGERIA_STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <span className="field-label">LGA</span>
                <select className="field-select" value={form.lga}
                  onChange={e => set('lga', e.target.value)} disabled={!form.state}>
                  <option value="">{form.state ? 'Select LGA' : '— pick state'}</option>
                  {lgas.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <div>
              <span className="field-label">Delivery address</span>
              <input className="field-input" placeholder="House no, street name, area"
                value={form.address} onChange={e => set('address', e.target.value)} />
            </div>

            {/* Primary crop with Other option */}
            <div>
              <span className="field-label">Primary crop</span>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {CROPS.map(c => (
                  <button key={c} className={`crop-btn ${form.crop === c ? 'on' : ''}`}
                    onClick={() => set('crop', c)}>
                    {c === 'Other' ? '🌱 Other' : c}
                  </button>
                ))}
              </div>
              {form.crop === 'Other' && (
                <div className="mt-2 rounded-2xl overflow-hidden"
                  style={{ background: 'var(--input-bg)', border: '1.5px solid rgba(29,158,117,0.4)' }}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="text-lg flex-shrink-0">🌱</span>
                    <input
                      className="flex-1 bg-transparent outline-none text-sm text-(--tx) font-dm"
                      placeholder="Type your crop name…"
                      value={form.customCrop}
                      autoFocus
                      onChange={e => set('customCrop', e.target.value)}
                      style={{ WebkitUserSelect: 'text', userSelect: 'text' }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="field-label">Farm size</span>
                <input className="field-input" placeholder="e.g. 2 hectares"
                  value={form.farm_size} onChange={e => set('farm_size', e.target.value)} />
              </div>
              <div>
                <span className="field-label">Experience</span>
                <input className="field-input" placeholder="e.g. 5 years"
                  value={form.experience} onChange={e => set('experience', e.target.value)} />
              </div>
            </div>

          </div>
        </div>

        {/* Sticky footer */}
        <div className="sheet-footer">
          <button className="btn-main w-full" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner" /> Saving…</> : <><Check size={15} /> Save changes</>}
          </button>
        </div>

      </div>
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function FarmerDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, updateUser } = useAuthStore()
  const { theme, setTheme }           = useThemeStore()
  const showGlobalToast                = useToastStore(s => s.show)

  const [tab,            setTab]            = useState('home')
  const [history,        setHistory]        = useState([])
  const [profile,        setProfile]        = useState(null)
  const [tips,           setTips]           = useState([])
  const [activeOrders,   setActiveOrders]   = useState([])
  const [loading,        setLoading]        = useState(true)
  const [showEdit,       setShowEdit]       = useState(false)
  const [showNotifs,     setShowNotifs]     = useState(false)
  const [showSignOut,    setShowSignOut]    = useState(false)
  const [pinOrder,       setPinOrder]       = useState(null)
  const [cropFilter,     setCropFilter]     = useState('All')
  const [confirmingOrder, setConfirmingOrder] = useState(null)
  const [orderFilter,    setOrderFilter]    = useState('all')

  useEffect(() => {
    if (!user?.id) return

    // Fetch real profile from API using user id — no fallbacks
    adminGetAllUsers().then(({ raw }) => {
      const rawUser = raw?.find(u => u.id === user.id)
      const p = rawUser?.farmerProfile
      if (p) {
        const realProfile = {
          id:                p.id,
          farmer_profile_id: p.id,
          name:              p.full_name        || '',
          full_name:         p.full_name        || '',
          phone:             rawUser.phone_number || user.phone || '',
          state:             p.state            || '',
          lga:               p.lga              || '',
          address:           p.address          || '',
          crop:              p.primary_crop     || '',
          primary_crop:      p.primary_crop     || '',
          farm_size:         p.farm_size        || '',
          experience:        p.experience       || '',
          member_since:      p.created_at
            ? new Date(p.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
            : user.member_since || new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
          total_scans:       0,
          treatments_bought: 0,
          money_saved:       0,
        }
        setProfile(realProfile)
        // Sync farmer_profile_id back to auth store so diagnosis works
        updateUser({ farmer_profile_id: p.id, name: p.full_name, full_name: p.full_name,
          phone: rawUser.phone_number, state: p.state, lga: p.lga,
          address: p.address, crop: p.primary_crop, primary_crop: p.primary_crop })
      }
    }).catch(() => {
      // API down — still show whatever is in auth store
      setProfile({
        id:                user.id || '',
        farmer_profile_id: user.farmer_profile_id || '',
        name:              user.name      || user.full_name    || '',
        full_name:         user.full_name || user.name         || '',
        phone:             user.phone     || user.phone_number || '',
        state:             user.state     || '',
        lga:               user.lga       || '',
        address:           user.address   || '',
        crop:              user.crop      || user.primary_crop || '',
        primary_crop:      user.primary_crop || user.crop     || '',
        farm_size:         user.farm_size   || '',
        experience:        user.experience  || '',
        member_since:      user.member_since || new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
        total_scans: 0, treatments_bought: 0, money_saved: 0,
      })
    })

    // Load history, tips, orders in parallel
    Promise.all([getFarmerHistory(), getFarmTips(), getFarmerActiveOrders()])
      .then(([h, t, o]) => { setHistory(h); setTips(t); setActiveOrders(o) })
      .finally(() => setLoading(false))
  }, [user?.id])

  // Auto-switch to orders tab if redirected
  useEffect(() => {
    if (location.state?.openOrders) setTab('orders')
  }, [location.state])

  const showToast = msg => showGlobalToast(msg, 'success')

  const handleConfirmDelivery = async (order, pin) => {
    setConfirmingOrder(order.id)
    try {
      await farmerConfirmDelivery(order.id, pin)
      setActiveOrders(prev => prev.filter(o => o.id !== order.id))
      setHistory(prev => prev.map(s =>
        s.order?.id === order.id
          ? { ...s, status: 'treated', order: { ...s.order, status: 'delivered', escrow_status: 'released' } }
          : s
      ))
      showToast('Delivery confirmed! Payment released to dealer.')
    } finally { setConfirmingOrder(null) }
  }

  const stats = {
    scans:   history.length,
    treated: history.filter(h => h.status === 'treated').length,
    pending: history.filter(h => h.status === 'pending').length,
  }
  const score = stats.scans > 0 ? Math.round((stats.treated / stats.scans) * 100) : null
  const name  = profile?.name || profile?.full_name || user?.name || user?.full_name || 'Farmer'
  const filteredTips = cropFilter === 'All' ? tips : tips.filter(t => t.crop === cropFilter || t.crop === 'All crops')

  // All orders from history (has order attached) + active orders
  const allOrders = history
    .filter(s => s.order)
    .map(s => ({ ...s.order, product: s.treatment_product?.name, crop: s.crop, disease: s.disease }))
    .sort((a, b) => (b.date_ordered > a.date_ordered ? 1 : -1))

  const filteredOrders = orderFilter === 'all' ? allOrders
    : orderFilter === 'pending'   ? allOrders.filter(o => o.status !== 'delivered')
    : allOrders.filter(o => o.status === 'delivered')

  const ORDER_STATUS = {
    dispatched: { label: 'Dispatched',  badge: 'amber', icon: Truck       },
    delivered:  { label: 'Delivered',   badge: 'green', icon: CheckCircle },
    pending:    { label: 'Processing',  badge: 'amber', icon: Clock       },
  }

  return (
    <div className="dash-shell">

      {/* Notification panel */}
      {showNotifs && (
        <div className="absolute inset-0 z-40 flex flex-col" style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowNotifs(false)}>
          <div className="mx-4 mt-16 rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-nav)', border: '1px solid var(--card-br)' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid var(--card-br)' }}>
              <p className="font-syne font-bold text-sm text-(--tx)">Notifications</p>
              {activeOrders.length > 0 && (
                <span className="badge red text-[10px]">{activeOrders.length} pending</span>
              )}
            </div>
            {/* Items */}
            <div className="max-h-72 overflow-y-auto">
              {activeOrders.length === 0 && stats.pending === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-2xl mb-2">🔔</p>
                  <p className="text-(--tx-sub) text-sm">No new notifications</p>
                </div>
              ) : (
                <>
                  {activeOrders.map(order => (
                    <button key={order.id}
                      className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-all active:bg-(--card-bg)"
                      style={{ borderBottom: '1px solid var(--card-br)' }}
                      onClick={() => { setShowNotifs(false); navigate('/order-tracking', { state: { order } }) }}>
                      <div className="w-8 h-8 rounded-xl bg-brand-amber/10 border border-brand-amber/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Truck size={13} className="text-brand-amber" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-(--tx) mb-0.5 truncate">{order.product}</p>
                        <p className="text-xs text-(--tx-sub)">Dispatched by {order.dealer} — confirm delivery to release payment</p>
                      </div>
                      <ChevronRight size={13} className="text-(--tx-dim) flex-shrink-0 mt-1" />
                    </button>
                  ))}
                  {stats.pending > 0 && (
                    <button
                      className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-all active:bg-(--card-bg)"
                      onClick={() => { setShowNotifs(false); navigate('/history') }}>
                      <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertCircle size={13} className="text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-(--tx) mb-0.5">
                          {stats.pending} crop{stats.pending > 1 ? 's' : ''} untreated
                        </p>
                        <p className="text-xs text-(--tx-sub)">Buy treatment to protect your harvest</p>
                      </div>
                      <ChevronRight size={13} className="text-(--tx-dim) flex-shrink-0 mt-1" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ HOME ══ */}
      {tab === 'home' && (
        <TAB>
          {/* ── Topbar ── */}
          <div className="flex items-center gap-3 mb-5">
            {/* Avatar */}
            <button
              onClick={() => setTab('profile')}
              className="w-11 h-11 rounded-full flex items-center justify-center font-syne font-extrabold text-base text-brand-green flex-shrink-0 active:scale-90 transition-all"
              style={{ background: 'rgba(29,158,117,0.15)', border: '2px solid rgba(29,158,117,0.3)' }}>
              {name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
            </button>

            {/* Greeting */}
            <div className="flex-1 min-w-0">
              <p className="text-(--tx-sub) text-xs mb-0.5">{getGreeting()},</p>
              <h2 className="font-syne font-extrabold text-xl text-(--tx) leading-tight truncate">{name}</h2>
            </div>
      {/* iOS safe area fill — matches nav background */}
      <div style={{ height: 'env(safe-area-inset-bottom, 0px)', background: 'var(--bg-nav)', flexShrink: 0 }} />

            {/* Bell */}
            <button
              onClick={() => setShowNotifs(v => !v)}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 flex-shrink-0"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-br)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-(--tx-sub)">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {(activeOrders.length > 0 || stats.pending > 0) && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center"
                  style={{ border: '2px solid var(--bg)' }}>
                  <span className="text-[9px] font-bold text-white leading-none">
                    {activeOrders.length + stats.pending}
                  </span>
                </span>
              )}
            </button>
          </div>

          {/* Scan CTA — always dark green bg, text always white */}
          <button onClick={() => navigate('/scan')}
            className="w-full rounded-3xl p-5 text-left mb-4 active:scale-[0.98] transition-all relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)' }}>
            {/* shine */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.15), transparent 60%)' }} />
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <Camera size={20} className="text-white" />
              </div>
              <ChevronRight size={18} className="text-white/60" />
            </div>
            <p className="font-syne font-bold text-white text-base mb-0.5 relative z-10">Scan a crop now</p>
            <p className="text-white/65 text-xs relative z-10">AI diagnosis in under 5 seconds</p>
          </button>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Total scans', val: stats.scans,   color: 'text-(--tx)'    },
              { label: 'Treated',     val: stats.treated, color: 'text-brand-green' },
              { label: 'Untreated',   val: stats.pending, color: stats.pending > 0 ? 'text-red-500' : 'text-(--tx)' },
            ].map(({ label, val, color }) => (
              <div key={label} className="stat-card text-center">
                {loading
                  ? <div className="h-6 w-8 mx-auto mb-1 shimmer" />
                  : <p className={`font-syne font-extrabold text-xl ${color}`}>{val}</p>}
                <p className="text-(--tx-sub) text-[10px] mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Untreated alert */}
          {!loading && stats.pending > 0 && (
            <div className="info-banner red mb-4">
              <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-red-400 text-xs font-medium">
                  {stats.pending} crop{stats.pending > 1 ? 's' : ''} still untreated
                </p>
                <p className="text-red-400/60 text-[11px]">Act quickly to prevent further spread</p>
              </div>
              <button onClick={() => navigate('/history')} className="text-red-400 text-xs underline flex-shrink-0">
                View
              </button>
            </div>
          )}

          {/* Farm health score */}
          {!loading && (
            <div className="glass-card mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-syne font-bold text-sm text-(--tx)">Farm health score</p>
                <span className={`badge ${stats.pending === 0 ? 'green' : 'amber'}`}>
                  {stats.pending === 0 ? 'Excellent' : 'Needs attention'}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <p className="font-syne font-extrabold text-3xl text-(--tx)">
                  {score ?? '—'}
                  {score !== null && <span className="text-(--tx-sub) text-base font-normal">%</span>}
                </p>
                <p className="text-(--tx-sub) text-xs">
                  {score === null ? 'Scan to build your score' : `${stats.treated} of ${stats.scans} treated`}
                </p>
              </div>
              {score !== null && (
                <div className="conf-track h-1.5">
                  <div className={`conf-fill ${stats.pending === 0 ? 'green' : 'amber'}`}
                    style={{ width: `${score}%` }} />
                </div>
              )}
            </div>
          )}

          {/* Pending deliveries */}
          {!loading && activeOrders.length > 0 && (
            <div className="mb-4">
              <SH title="Pending deliveries" action="All orders" onAction={() => setTab('orders')} />
              <div className="flex flex-col gap-2">
                {activeOrders.map(order => (
                  <div key={order.id} className="glass-card">
                    <button className="w-full text-left active:opacity-70 transition-opacity"
                      onClick={() => navigate('/order-tracking', { state: { order } })}>
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-amber/10 border border-brand-amber/20 flex items-center justify-center flex-shrink-0">
                          <Package size={16} className="text-brand-amber" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-syne font-bold text-sm text-(--tx) truncate">{order.product}</p>
                          <p className="text-xs text-(--tx-sub)">{order.crop} · {order.disease}</p>
                        </div>
                        {/* Status badge per actual state */}
                        {order.status === 'pending' && (
                          <span className="badge amber flex-shrink-0 text-[10px]">⏳ Awaiting dispatch</span>
                        )}
                        {order.status === 'paid' && (
                          <span className="badge amber flex-shrink-0 text-[10px]">🔒 Paid</span>
                        )}
                        {order.status === 'dispatched' && (
                          <span className="badge amber flex-shrink-0 text-[10px]"><Truck size={9} /> On its way</span>
                        )}
                        {order.status === 'disputed' && (
                          <span className="badge red flex-shrink-0 text-[10px]">⚠ Disputed</span>
                        )}
                      </div>

                      {/* Escrow status bar */}
                      <div className="flex items-center justify-between px-3 py-2 rounded-xl mb-3"
                        style={{ background: 'rgba(239,159,39,0.06)', border: '1px solid rgba(239,159,39,0.15)' }}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">🔒</span>
                          <div>
                            <p className="text-xs font-semibold text-brand-amber">Escrow held · ₦{order.amount.toLocaleString()}</p>
                            <p className="text-[10px] text-(--tx-dim)">
                              {order.status === 'pending' ? 'Dealer preparing your order' :
                               order.status === 'paid'    ? 'Waiting for dealer to dispatch' :
                               order.status === 'dispatched' ? 'Confirm receipt to release payment to dealer' :
                               order.status === 'disputed'   ? 'Funds frozen — admin review in progress' :
                               'Held by Interswitch'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between"
                        style={{ borderTop: '1px solid var(--card-br)', paddingTop: 10 }}>
                        <div>
                          <p className="text-xs text-(--tx-sub)">From {order.dealer}</p>
                          <p className="text-xs text-(--tx-dim)">Ordered {order.date_ordered}</p>
                        </div>
                        <p className="text-xs text-(--tx-dim) flex items-center gap-1">
                          Tap to track <span>→</span>
                        </p>
                      </div>
                    </button>
                    {order.status === 'dispatched' && (
                      <>
                        <button
                          className="btn-main mt-3"
                          disabled={confirmingOrder === order.id}
                          onClick={() => setPinOrder(order)}>
                          {confirmingOrder === order.id
                            ? <><span className="spinner" /> Confirming…</>
                            : <><CheckCircle size={15} /> I've received this — release payment</>
                          }
                        </button>
                        <p className="text-center text-[11px] text-(--tx-dim) mt-2">
                          Your PIN releases ₦{order.amount.toLocaleString()} from escrow to {order.dealer}
                        </p>
                      </>
                    )}
                    {(order.status === 'pending' || order.status === 'paid') && (
                      <p className="text-center text-[11px] text-(--tx-dim) mt-3">
                        Tap to view tracking · auto-refund if dealer doesn't ship in {TIMERS.LABEL_DISPATCH}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="mb-4">
            <SH title="Quick actions" />
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Scan crop', emoji: '🔬', action: () => navigate('/scan'),    tint: 'bg-brand-green/10' },
                { label: 'History',   emoji: '📋', action: () => navigate('/history'), tint: 'bg-(--card-bg)'   },
                { label: 'Farm tips', emoji: '💡', action: () => setTab('tips'),       tint: 'bg-brand-amber/10' },
              ].map(({ label, emoji, action, tint }) => (
                <button key={label} onClick={action}
                  className={`${tint} rounded-2xl p-3 flex flex-col items-center gap-2 border border-(--card-br) active:scale-95 transition-all`}>
                  <span className="text-xl">{emoji}</span>
                  <span className="text-(--tx-sub) text-[10px] font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent scans */}
          <SH title="Recent scans" action="See all" onAction={() => navigate('/history')} />
          {loading
            ? [1,2,3].map(i => <div key={i} className="h-14 shimmer mb-2" />)
            : history.slice(0,3).map(s => (
              <ScanRow key={s.id} scan={s} onClick={() => navigate('/history')} />
            ))
          }
        </TAB>
      )}

      {/* ══ ORDERS ══ */}
      {tab === 'orders' && (
        <TAB>
          <div className="mb-5">
            <h2 className="font-syne font-extrabold text-xl text-(--tx)">Orders & payments</h2>
            <p className="text-(--tx-sub) text-xs mt-1">All your treatment purchases and escrow status</p>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2 mb-5 anim-1">
            {[
              { label: 'Total orders',   val: allOrders.length,                                  color: 'text-(--tx)'        },
              { label: 'Total spent',    val: `₦${allOrders.reduce((s,o)=>s+(o.amount||0),0).toLocaleString()}`, color: 'text-brand-green' },
              { label: 'Pending',        val: activeOrders.length,                               color: activeOrders.length > 0 ? 'text-brand-amber' : 'text-(--tx)' },
            ].map(({ label, val, color }) => (
              <div key={label} className="stat-card text-center">
                <p className={`font-syne font-extrabold text-lg ${color} leading-tight`}>{val}</p>
                <p className="text-(--tx-sub) text-[10px] mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Escrow explainer */}
          <div className="info-banner green mb-5 anim-1">
            <ShieldCheck size={15} className="text-brand-green flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-(--tx) mb-0.5">Escrow protects every payment</p>
              <p className="text-xs text-(--tx-sub) leading-relaxed">
                Funds are held by Interswitch and only released to the dealer after you confirm delivery. Auto-refund if no delivery in {TIMERS.LABEL_DISPATCH}.
              </p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-4 anim-2">
            {[
              { key: 'all',      label: `All (${allOrders.length})`                                  },
              { key: 'pending',  label: `Active (${allOrders.filter(o=>o.status!=='delivered').length})` },
              { key: 'done',     label: `Completed (${allOrders.filter(o=>o.status==='delivered').length})` },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setOrderFilter(key)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all border ${
                  orderFilter === key
                    ? 'bg-brand-green text-white border-transparent'
                    : 'text-(--tx-sub) border-(--card-br) bg-(--card-bg)'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Order list */}
          <div className="flex flex-col gap-3 anim-3">
            {loading ? (
              [1,2,3].map(i => <div key={i} className="h-28 shimmer" />)
            ) : filteredOrders.length === 0 ? (
              <div className="glass-card text-center py-10">
                <ClipboardList size={28} className="text-(--tx-dim) mx-auto mb-3" />
                <p className="font-syne font-bold text-(--tx) text-sm mb-1">No orders here</p>
                <p className="text-xs text-(--tx-sub)">Scan a crop to get started</p>
              </div>
            ) : (
              filteredOrders.map(order => {
                const cfg = ORDER_STATUS[order.status] || ORDER_STATUS.pending
                const Icon = cfg.icon
                const isPending = order.status !== 'delivered'
                return (
                  <div key={order.id} className="glass-card">
                    {/* Tappable top section → order tracking */}
                    <button className="w-full text-left active:opacity-70 transition-opacity"
                      onClick={() => isPending && navigate('/order-tracking', { state: { order } })}>
                    {/* Top */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isPending ? 'bg-brand-amber/10 border border-brand-amber/20'
                                  : 'bg-brand-green/10 border border-brand-green/20'
                      }`}>
                        <Package size={15} className={isPending ? 'text-brand-amber' : 'text-brand-green'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-syne font-bold text-sm text-(--tx) truncate">{order.product}</p>
                        <p className="text-xs text-(--tx-sub)">{order.crop} · {order.disease}</p>
                      </div>
                      <span className={`badge flex-shrink-0 text-[10px] ${cfg.badge}`}>
                        <Icon size={9} /> {cfg.label}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex flex-col gap-1.5 mb-3 pb-3"
                      style={{ borderBottom: '1px solid var(--card-br)' }}>
                      <div className="flex justify-between">
                        <span className="text-xs text-(--tx-sub)">Dealer</span>
                        <span className="text-xs text-(--tx) font-medium">{order.dealer}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-(--tx-sub)">Order ref</span>
                        <span className="text-xs text-(--tx-sub) font-mono">{order.ref}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-(--tx-sub)">Ordered</span>
                        <span className="text-xs text-(--tx-sub)">{order.date_ordered}</span>
                      </div>
                      {order.date_delivered && (
                        <div className="flex justify-between">
                          <span className="text-xs text-(--tx-sub)">Delivered</span>
                          <span className="text-xs text-(--tx-sub)">{order.date_delivered}</span>
                        </div>
                      )}
                    </div>

                    {/* Amount + escrow */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-syne font-extrabold text-lg text-(--tx)">
                          ₦{order.amount.toLocaleString()}
                        </p>
                        <p className={`text-[10px] ${order.escrow_status === 'released' ? 'text-brand-green' : 'text-brand-amber'}`}>
                          {order.escrow_status === 'released' ? '✓ Escrow released' : '🔒 In escrow'}
                        </p>
                      </div>
                    </div>
                    </button>
                    {isPending && (
                      <button
                        className="btn-main mt-3"
                        style={{ width: '100%', padding: '10px 16px', fontSize: 12 }}
                        disabled={confirmingOrder === order.id}
                        onClick={() => setPinOrder(activeOrders.find(o => o.id === order.id) || order)}>
                        {confirmingOrder === order.id
                          ? <><span className="spinner" /> …</>
                          : <><CheckCircle size={13} /> Confirm delivery</>
                        }
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </TAB>
      )}

      {/* ══ TIPS ══ */}
      {tab === 'tips' && (
        <TAB>
          <div className="mb-4">
            <h2 className="font-syne font-extrabold text-xl text-(--tx)">Farm tips</h2>
            <p className="text-(--tx-sub) text-xs mt-1">Expert advice to protect your harvest</p>
          </div>

          <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 mb-4">
            {['All', ...CROPS].map(c => (
              <button key={c} onClick={() => setCropFilter(c)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all border ${
                  cropFilter === c
                    ? 'bg-brand-green text-white border-transparent'
                    : 'text-(--tx-sub) border-(--card-br) bg-(--card-bg)'
                }`}>
                {c}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 mb-4">
            {loading
              ? [1,2,3].map(i => <div key={i} className="h-28 shimmer" />)
              : filteredTips.length === 0
                ? (
                  <div className="glass-card text-center py-10">
                    <p className="text-3xl mb-3">💡</p>
                    <p className="font-syne font-bold text-(--tx) text-sm mb-1">No tips for this crop yet</p>
                    <p className="text-(--tx-sub) text-xs">Check back soon or browse All</p>
                  </div>
                )
                : filteredTips.map(tip => (
                  <div key={tip.id} className="glass-card">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-9 h-9 rounded-xl bg-brand-amber/10 border border-brand-amber/20 flex items-center justify-center flex-shrink-0">
                        <Lightbulb size={15} className="text-brand-amber" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="badge amber text-[10px]">{tip.tag}</span>
                          <span className="text-(--tx-sub) text-[10px]">{tip.crop}</span>
                        </div>
                        <h4 className="font-syne font-bold text-(--tx) text-sm leading-snug">{tip.title}</h4>
                      </div>
                    </div>
                    <p className="text-(--tx-sub) text-xs leading-relaxed">{tip.body}</p>
                  </div>
                ))
            }
          </div>

          <div className="info-banner green">
            <span className="text-lg flex-shrink-0">🌱</span>
            <div className="flex-1 min-w-0">
              <p className="text-brand-green text-xs font-medium">See something unusual?</p>
              <p className="text-brand-green/60 text-xs">Get instant AI diagnosis</p>
            </div>
            <button onClick={() => navigate('/scan')}
              className="bg-brand-green text-white text-xs font-syne font-bold px-3 py-2 rounded-xl active:scale-95 transition-all flex-shrink-0">
              Scan now
            </button>
          </div>
        </TAB>
      )}

      {/* ══ PROFILE ══ */}
      {tab === 'profile' && (
        <TAB>
          <h2 className="font-syne font-extrabold text-xl text-(--tx) mb-4">My profile</h2>

          {loading
            ? <div className="flex flex-col gap-3">{[1,2,3].map(i => <div key={i} className="h-24 shimmer" />)}</div>
            : profile && (
              <div className="flex flex-col gap-3">
                <div className="glass-card">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 font-syne font-extrabold text-lg text-brand-green"
                      style={{ background: 'rgba(29,158,117,0.12)', border: '2px solid rgba(29,158,117,0.25)' }}>
                      {(profile.name || user?.name || '?').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-syne font-bold text-base text-(--tx) leading-tight">
                        {profile.name || user?.name || user?.full_name || 'Farmer'}
                      </h3>
                      <p className="text-(--tx-sub) text-xs mt-0.5">
                        Farmer · {profile.crop || user?.crop || user?.primary_crop || 'No crop set'}
                      </p>
                      <p className="text-(--tx-sub) text-xs">Since {profile.member_since || user?.member_since}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} size={10} className={i <= 4 ? 'text-brand-amber fill-brand-amber' : 'text-(--tx-dim)'} />
                        ))}
                        <span className="text-(--tx-sub) text-[10px] ml-1">Good farmer</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setShowEdit(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-syne font-bold text-brand-green active:scale-95 transition-all"
                    style={{ border: '1px solid rgba(29,158,117,0.25)', background: 'rgba(29,158,117,0.05)' }}>
                    <Pencil size={13} /> Edit profile
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Scans',   val: history.length,                                            color: 'text-(--tx)'       },
                    { label: 'Treated', val: history.filter(h => h.status === 'treated').length,        color: 'text-brand-green'  },
                    { label: 'Orders',  val: activeOrders.length + history.filter(h => h.order).length, color: 'text-brand-amber'  },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="stat-card text-center">
                      <p className={`font-syne font-extrabold text-xl ${color}`}>{val}</p>
                      <p className="text-(--tx-sub) text-[10px] mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="glass-card">
                  <p className="text-(--tx-dim) text-[10px] uppercase tracking-widest mb-3">Farming details</p>
                  <div className="flex flex-col gap-3">
                    {[
                      { icon: Sprout, label: 'Primary crop', val: profile.crop     || user?.crop || user?.primary_crop || '—' },
                      { icon: MapPin, label: 'Location',     val: (profile.lga || user?.lga)
                          ? `${profile.lga || user?.lga}, ${profile.state || user?.state}`
                          : (profile.state || user?.state || '—') },
                      { icon: Leaf,   label: 'Farm size',    val: profile.farm_size  || user?.farm_size  || 'Not set' },
                      { icon: Clock,  label: 'Experience',   val: profile.experience || user?.experience || 'Not set' },
                      { icon: Phone,  label: 'Phone',        val: profile.phone      || user?.phone      || user?.phone_number || '—' },
                    ].map(({ icon: Icon, label, val }) => (
                      <div key={label} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-(--card-bg)">
                          <Icon size={13} className="text-(--tx-sub)" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-(--tx-sub) text-[10px]">{label}</p>
                          <p className="text-(--tx) text-sm truncate">{val}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Theme picker */}
                <div className="glass-card">
                  <div className="flex items-center gap-2 mb-3">
                    {theme === 'dark'  && <Moon size={14} className="text-brand-amber" />}
                    {theme === 'light' && <Sun  size={14} className="text-brand-amber" />}
                    {theme === 'green' && <span className="text-sm">🌿</span>}
                    <p className="text-sm font-medium text-(--tx)">Appearance</p>
                  </div>
                  <div className="theme-switcher">
                    {[
                      { key: 'dark',  label: '🌙 Dark'  },
                      { key: 'light', label: '☀️ Light' },
                      { key: 'green', label: '🌿 Green' },
                    ].map(({ key, label }) => (
                      <button key={key} onClick={() => setTheme(key)}
                        className={`theme-btn ${theme === key ? 'active' : ''}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={() => setShowSignOut(true)} className="btn-main danger">
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            )
          }
        </TAB>
      )}

      {/* ══ BOTTOM NAV ══ */}
      <div className="dash-nav">
        {TABS.map(({ key, icon: Icon, label }) => (
          <button key={key} className={`dash-nav-btn ${tab === key ? 'on' : ''}`}
            onClick={() => setTab(key)}>
            <div className="relative">
              <Icon size={20} strokeWidth={tab === key ? 2.5 : 1.8} />
              {key === 'orders' && activeOrders.length > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[14px] h-3.5 bg-brand-amber text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5 pointer-events-none">
                  {activeOrders.length}
                </span>
              )}
            </div>
            {label}
          </button>
        ))}
      </div>

      {/* Edit sheet */}
      {showEdit && (
        <EditSheet
          profile={profile}
          user={user}
          onClose={() => setShowEdit(false)}
          onSave={updated => {
            setProfile(prev => ({ ...prev, ...updated }))
            updateUser(updated)
            setShowEdit(false)
            showToast('Profile updated')
          }}
        />
      )}

      {/* ── Sign-out confirm sheet ── */}
      {showSignOut && (
        <div className="sheet-backdrop" onClick={() => setShowSignOut(false)}>
          <div className="sheet-panel" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/15 flex items-center justify-center mx-auto mb-4">
                <LogOut size={22} className="text-red-400" />
              </div>
              <p className="font-syne font-bold text-lg text-(--tx) mb-2">Sign out?</p>
              <p className="text-(--tx-sub) text-sm leading-relaxed">
                You'll need to verify your phone number again to sign back in.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="btn-main danger"
                onClick={async () => {
                  // Logout locally first — instant UX
                  setShowSignOut(false)
                  logout()
                  navigate('/', { replace: true })
                  // Then invalidate token on server in background
                  logoutUser().catch(() => {})
                }}>
                <LogOut size={15} /> Yes, sign me out
              </button>
              <button
                className="btn-main ghost"
                onClick={() => setShowSignOut(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction PIN — confirm delivery */}
      <PinSheet
        open={!!pinOrder}
        title="Confirm delivery"
        subtitle={pinOrder ? `Release ₦${pinOrder.amount?.toLocaleString()} to ${pinOrder.dealer}` : ''}
        onSuccess={(pin) => handleConfirmDelivery(pinOrder, pin)}
        onClose={() => setPinOrder(null)}
      />
    </div>
  )
}