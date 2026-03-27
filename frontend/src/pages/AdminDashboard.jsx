import { TIMERS } from '../services/api'
import { useState, useEffect, useRef } from 'react'
import AppLogo from '../component/AppLogo'
import { useToastStore, useThemeStore } from '../store'
import {
  LayoutDashboard, Users, Store, ScanLine, BarChart2, Activity,
  CheckCircle, AlertTriangle, Search, Check, X, Shield,
  Ban, Clock, TrendingUp, Truck, RefreshCw, ArrowUpRight, ArrowDownRight,
  Menu, ChevronRight, FileText, DollarSign, AlertCircle, Zap, Moon, Sun, LogOut,
} from 'lucide-react'
import {
  getAdminStats, getAllFarmers, getAllDealers, getAllScans,
  getDiseaseBreakdown, getMonthlyScanData,
  approveDealer, rejectDealer, suspendUser, reactivateUser,
  getEscrowOrders, getDisputes, getAllDisputes, adminResolveRelease, adminResolveAppeal,
  resolveDisputeRefund, resolveDisputeRelease,
  adminForceRelease, adminForceRefund,
  approveDealerWithNotification, rejectDealerWithReason,
  adminGetAllUsers, adminVerifyDealer, pingServer,
} from '../services/api'

const NAV = [
  { key: 'overview',  label: 'Overview',  icon: LayoutDashboard },
  { key: 'approvals', label: 'Approvals', icon: Store           },
  { key: 'escrow',    label: 'Escrow',    icon: Shield          },
  { key: 'ledger',    label: 'Ledger',    icon: Activity        },
  { key: 'farmers',   label: 'Farmers',   icon: Users           },
  { key: 'scans',     label: 'Scans',     icon: ScanLine        },
]

const CC = ['#10b981','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#6b7280']

const BADGE = {
  approved:   'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  pending:    'bg-amber-500/15   text-amber-400   border border-amber-500/20',
  rejected:   'bg-red-500/15     text-red-400     border border-red-500/20',
  active:     'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  suspended:  'bg-red-500/15     text-red-400     border border-red-500/20',
  held:       'bg-amber-500/15   text-amber-400   border border-amber-500/20',
  released:   'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  refunded:   'bg-blue-500/15    text-blue-400    border border-blue-500/20',
  processing: 'bg-blue-500/15    text-blue-400    border border-blue-500/20',
  completed:  'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function ACard({ label, value, sub, icon: Icon, color = 'text-brand-green', trend }) {
  return (
    <div className="glass-card">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-(--card-bg) border border-(--card-br)">
          <Icon size={15} className={color} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="font-syne font-extrabold text-xl text-(--tx) mb-0.5">{value}</p>
      <p className="text-(--tx-sub) text-xs">{label}</p>
      {sub && <p className="text-(--tx-dim) text-[10px] mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Bar chart ──────────────────────────────────────────────────────────────────
function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.scans), 1)
  return (
    <div className="flex items-end gap-2 h-28 w-full">
      {data.map(({ month, scans }) => (
        <div key={month} className="flex-1 flex flex-col items-center gap-1.5">
          <span className="text-(--tx-dim) text-[10px] font-mono">{scans}</span>
          <div className="w-full rounded-t-lg"
            style={{ height:`${Math.max(4, Math.round((scans / max) * 72))}px`,
                     background:'linear-gradient(to top, rgba(29,158,117,0.6), rgba(29,158,117,0.2))',
                     borderTop:'2px solid #1D9E75' }} />
          <span className="text-(--tx-sub) text-[10px]">{month}</span>
        </div>
      ))}
    </div>
  )
}

// ── Donut chart ────────────────────────────────────────────────────────────────
function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  let cum = 0
  const r = 48, cx = 64, cy = 64, sw = 16, circ = 2 * Math.PI * r
  const segs = data.map((d, i) => {
    const pct = d.count / total
    const dash = pct * circ; const offset = circ - cum * circ; cum += pct
    return { ...d, dash, gap: circ - dash, offset, color: CC[i] }
  })
  return (
    <div className="flex items-center gap-5">
      <svg width="128" height="128" viewBox="0 0 128 128" className="flex-shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--card-br)" strokeWidth={sw} />
        {segs.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={sw}
            strokeDasharray={`${s.dash} ${s.gap}`} strokeDashoffset={s.offset}
            style={{ transform:'rotate(-90deg)', transformOrigin:`${cx}px ${cy}px` }} />
        ))}
        <text x={cx} y={cy-4} textAnchor="middle" fill="var(--tx)" fontSize="14" fontWeight="700" fontFamily="Clash Display">{total.toLocaleString()}</text>
        <text x={cx} y={cy+10} textAnchor="middle" fill="var(--tx-sub)" fontSize="8">total</text>
      </svg>
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CC[i] }} />
            <span className="text-(--tx-sub) text-xs flex-1 truncate">{d.disease}</span>
            <span className="text-(--tx) text-xs font-mono font-bold">{d.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Confirm modal ──────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel, confirmColor = 'bg-brand-green', onConfirm, onClose }) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-sm rounded-3xl p-6" style={{ background:'var(--bg-nav)', border:'1px solid var(--card-br)' }}>
        <h3 className="font-syne font-bold text-base text-(--tx) mb-2">{title}</h3>
        <p className="text-(--tx-sub) text-sm leading-relaxed mb-4">{message}</p>
        {err && (
          <p className="text-red-400 text-xs mb-4 px-3 py-2 rounded-xl"
            style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}>
            ⚠ {err}
          </p>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-3 rounded-2xl text-(--tx-sub) text-sm font-medium transition-all active:scale-95"
            style={{ border:'1px solid var(--card-br)', background:'var(--card-bg)' }}>
            Cancel
          </button>
          <button disabled={loading}
            onClick={async () => {
              setLoading(true); setErr('')
              try {
                await onConfirm()
                onClose()
              } catch (e) {
                setErr(e.message || 'Something went wrong. Please try again.')
              } finally { setLoading(false) }
            }}
            className={`flex-1 py-3 rounded-2xl text-white text-sm font-syne font-bold active:scale-95 disabled:opacity-60 ${confirmColor}`}>
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Search bar ─────────────────────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="relative w-full">
      <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-(--tx-dim)" />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="field-input pl-10" />
    </div>
  )
}

// ── Section header ─────────────────────────────────────────────────────────────
function SH({ title, sub, badge, action, onAction }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-syne font-bold text-sm text-(--tx)">{title}</h3>
          {badge !== undefined && badge > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>
          )}
        </div>
        {sub && <p className="text-(--tx-dim) text-xs mt-0.5">{sub}</p>}
      </div>
      {action && <button onClick={onAction} className="text-brand-green text-xs">{action}</button>}
    </div>
  )
}

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  return (
    <div className="fixed top-4 left-4 right-4 max-w-[390px] mx-auto z-50 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-(--tx) anim-1"
      style={{ background: type === 'error' ? '#EF4444' : '#1D9E75', boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }}>
      {type === 'error' ? <AlertCircle size={14} /> : <Check size={14} />}
      <span className="flex-1">{msg}</span>
      <button onClick={onClose}><X size={14} /></button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [nav,         setNav]         = useState('overview')
  const [stats,       setStats]       = useState(null)
  const [farmers,     setFarmers]     = useState([])
  const [dealers,     setDealers]     = useState([])
  const [scans,       setScans]       = useState([])
  const [diseases,    setDiseases]    = useState([])
  const [monthData,   setMonthData]   = useState([])
  const [escrowData,  setEscrowData]  = useState(null)
  const [disputes,    setDisputes]    = useState([])
  const [rejectReason, setRejectReason] = useState('')
  const [rejectTarget, setRejectTarget] = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [apiError,    setApiError]    = useState('')
  const [waking,      setWaking]      = useState(false)
  const [search,      setSearch]      = useState('')
  const [confirm,     setConfirm]     = useState(null)
  const [drawerOpen,  setDrawerOpen]  = useState(false)

  const showToast        = useToastStore(s => s.show)
  const { theme, setTheme } = useThemeStore()

  // Admin defaults to dark theme
  useEffect(() => {
    setTheme('dark') // Admin always dark
  }, [])

  // Track known pending dealer IDs to detect new registrations
  const knownPendingIds = useRef(new Set())

  useEffect(() => {
    const loadUsers = (isInitial = false) => {
      adminGetAllUsers()
        .then(({ farmers: f, dealers: d }) => {
          setFarmers(f)
          setDealers(d)

          // Check for new pending dealers since last poll
          const currentPending = d.filter(x => x.status === 'pending')
          if (!isInitial) {
            const newOnes = currentPending.filter(x => !knownPendingIds.current.has(x.id))
            if (newOnes.length > 0) {
              newOnes.forEach(dealer => {
                showToast(`🏪 New dealer application: ${dealer.business_name}`, 'info')
              })
            }
          }
          // Update known IDs
          knownPendingIds.current = new Set(currentPending.map(x => x.id))
        })
        .catch(async (err) => {
          console.error('[FarmXnap Admin] adminGetAllUsers failed:', err.message)
          if (isInitial) {
            // If 403 — wrong secret. Otherwise try waking the server.
            if (err.message?.includes('not authorized') || err.message?.includes('403')) {
              setApiError('Admin secret key rejected (403). Check X-Admin-Secret value.')
              setLoading(false)
            } else {
              // Server likely sleeping — ping and retry once after 5s
              setWaking(true)
              await pingServer()
              setTimeout(() => {
                adminGetAllUsers()
                  .then(({ farmers: f, dealers: d }) => {
                    setFarmers(f); setDealers(d)
                    setWaking(false); setLoading(false)
                    knownPendingIds.current = new Set(d.filter(x => x.status === 'pending').map(x => x.id))
                  })
                  .catch(e2 => {
                    setApiError(e2.message || 'Server unavailable. Try again shortly.')
                    setWaking(false); setLoading(false)
                  })
              }, 5000)
            }
          }
        })
    }

    loadUsers(true)
    // Poll every 30 seconds for new dealer registrations
    const poll = setInterval(() => loadUsers(false), 30000)
    return () => clearInterval(poll)
  }, [])

  useEffect(() => {
    Promise.all([
      getAdminStats(), getAllScans(),
      getDiseaseBreakdown(), getMonthlyScanData(),
    ]).then(([s, sc, dis, mo]) => {
      setStats(s); setScans(sc)
      setDiseases(dis); setMonthData(mo)
      setLoading(false)
    })
    getEscrowOrders().then(setEscrowData).catch(() => {})
    getAllDisputes().then(r => setDisputes(r.disputes || [])).catch(() => getDisputes().then(setDisputes))
  }, [])

  const pendingDealers   = dealers.filter(d => d.status === 'pending')
  const approvedDealers  = dealers.filter(d => d.status === 'approved')
  const suspendedDealers = dealers.filter(d => d.status === 'suspended')

  // Escrow data from API (loaded in useEffect)
  const escrowOrders = escrowData?.orders || []
  const escrowStats  = escrowData?.stats  || {}

  // ── Common card wrapper ───────────────────────────────────────────────────────
  const Card = ({ children, className = '' }) => (
    <div className={`rounded-2xl p-4 ${className}`}
      style={{ background:'var(--card-bg)', border:'1px solid var(--card-br)' }}>
      {children}
    </div>
  )

  // ── Overview ──────────────────────────────────────────────────────────────────
  const OverviewSection = () => (
    <div className="flex flex-col gap-5">
      <SH title="Platform overview" sub="Real-time FarmXnap metrics" />

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl shimmer" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <ACard label="Total farmers"  value={stats?.farmers?.toLocaleString() || '0'} icon={Users}     color="text-brand-green" trend={12} />
          <ACard label="Active dealers" value={stats?.dealers?.toLocaleString() || '0'} icon={Store}     color="text-brand-amber" trend={8}  />
          <ACard label="Total scans"    value={stats?.scans?.toLocaleString()   || '0'} icon={ScanLine}  color="text-blue-400"    trend={23} />
          <ACard label="Escrow volume"  value={`₦${((stats?.revenue||0)/1000).toFixed(0)}k`} icon={Shield} color="text-brand-green" trend={15} />
        </div>
      )}

      {/* Pending actions */}
      {(pendingDealers.length > 0 || escrowOrders.filter(o=>o.status==='held' && o.daysLeft<=1).length > 0) && (
        <Card>
          <p className="font-syne font-bold text-sm text-(--tx) mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-brand-amber" /> Requires attention
          </p>
          <div className="flex flex-col gap-2">
            {pendingDealers.length > 0 && (
              <button onClick={() => setNav('approvals')}
                className="flex items-center justify-between p-3 rounded-xl active:scale-[0.98] transition-all"
                style={{ background:'rgba(239,159,39,0.08)', border:'1px solid rgba(239,159,39,0.2)' }}>
                <div className="flex items-center gap-2.5">
                  <Store size={14} className="text-brand-amber" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-(--tx)">{pendingDealers.length} dealer{pendingDealers.length>1?'s':''} awaiting approval</p>
                    <p className="text-xs text-(--tx-sub)">Review CAC docs and activate accounts</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-(--tx-sub)" />
              </button>
            )}
            {escrowOrders.filter(o=>o.status==='held' && o.daysLeft<=1).map(o => (
              <button key={o.id} onClick={() => setNav('escrow')}
                className="flex items-center justify-between p-3 rounded-xl active:scale-[0.98] transition-all"
                style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}>
                <div className="flex items-center gap-2.5">
                  <Clock size={14} className="text-red-400" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-(--tx)">Escrow expiring: {o.farmer}</p>
                    <p className="text-xs text-(--tx-sub)">{o.daysLeft === 0 ? 'Auto-refund today' : `${o.daysLeft}d left — dealer hasn't dispatched`}</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-(--tx-sub)" />
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Monthly chart */}
      {monthData.length > 0 && (
        <Card>
          <SH title="Monthly scans" sub="Last 6 months" />
          <BarChart data={monthData} />
        </Card>
      )}

      {/* Disease breakdown */}
      {diseases.length > 0 && (
        <Card>
          <SH title="Disease breakdown" />
          <DonutChart data={diseases} />
        </Card>
      )}

      {/* Platform revenue */}
      <Card>
        <SH title="Platform earnings (4% fee)" sub="From all completed transactions" />
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: 'This month',  value: '₦48.2k', color: 'text-brand-green' },
            { label: 'Last month',  value: '₦39.7k', color: 'text-(--tx)'       },
            { label: 'All time',    value: '₦312k',  color: 'text-brand-amber' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-3" style={{ background:'var(--card-bg)' }}>
              <p className={`font-syne font-extrabold text-lg ${color}`}>{value}</p>
              <p className="text-(--tx-sub) text-[10px] mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )

  // ── Dealer approvals ──────────────────────────────────────────────────────────
  const ApprovalsSection = () => {
    const [refreshing,  setRefreshing]  = useState(false)
    const [lastChecked, setLastChecked] = useState(new Date())
    const [drawerDealer, setDrawerDealer] = useState(null)

    const handleRefresh = async () => {
      setRefreshing(true)
      try {
        const { farmers: f, dealers: d } = await adminGetAllUsers()
        setFarmers(f); setDealers(d)
        setLastChecked(new Date())
        showToast('Dealer list refreshed', 'success')
      } catch { showToast('Refresh failed', 'error') }
      finally { setRefreshing(false) }
    }

    const statusStyle = {
      pending:   { bg:'rgba(239,159,39,0.12)',  br:'rgba(239,159,39,0.25)', color:'#EF9F27', label:'Pending'   },
      approved:  { bg:'rgba(29,158,117,0.12)',  br:'rgba(29,158,117,0.25)', color:'#1D9E75', label:'Active'    },
      suspended: { bg:'rgba(239,68,68,0.12)',   br:'rgba(239,68,68,0.25)',  color:'#f87171', label:'Suspended' },
    }

    const DealerRow = ({ d }) => {
      const s = statusStyle[d.status] || statusStyle.approved
      return (
        <button
          onClick={() => setDrawerDealer(d)}
          className="w-full text-left flex items-center gap-3 px-4 py-3.5 transition-all active:scale-[0.98]"
          style={{
            background: d.status === 'suspended' ? 'rgba(239,68,68,0.04)' : 'var(--card-bg)',
            border: d.status === 'suspended' ? '1px solid rgba(239,68,68,0.15)' : '1px solid var(--card-br)',
            borderRadius: 16,
            opacity: d.status === 'suspended' ? 0.85 : 1,
          }}>
          {/* Avatar */}
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-syne font-bold text-sm"
            style={{ background: s.bg, border: `1.5px solid ${s.br}`, color: s.color }}>
            {d.business_name.slice(0,2).toUpperCase()}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-(--tx) text-sm font-semibold truncate">{d.business_name}</p>
            <p className="text-(--tx-sub) text-xs truncate">{d.phone} · {d.state}</p>
          </div>
          {/* Badge + chevron */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: s.bg, color: s.color, border: `1px solid ${s.br}` }}>
              {s.label}
            </span>
            <ChevronRight size={14} className="text-(--tx-dim)" />
          </div>
        </button>
      )
    }

    return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-syne font-bold text-sm text-(--tx)">Dealer approvals</h3>
            {pendingDealers.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingDealers.length}
              </span>
            )}
          </div>
          <p className="text-(--tx-dim) text-[10px]">
            Last: {lastChecked.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })} · auto-refreshes every 30s
          </p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-brand-green active:scale-95 transition-all"
          style={{ background:'rgba(29,158,117,0.1)', border:'1px solid rgba(29,158,117,0.25)' }}>
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Checking…' : 'Refresh'}
        </button>
      </div>

      {/* Pending list */}
      {pendingDealers.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-amber flex items-center gap-1.5">
            <Clock size={10} /> Pending review ({pendingDealers.length})
          </p>
          {pendingDealers.map(d => <DealerRow key={d.id} d={d} />)}
        </div>
      )}

      {/* Active list */}
      {approvedDealers.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-green flex items-center gap-1.5">
            <CheckCircle size={10} /> Active dealers ({approvedDealers.length})
          </p>
          {approvedDealers.map(d => <DealerRow key={d.id} d={d} />)}
        </div>
      )}

      {/* Suspended list */}
      {suspendedDealers.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400 flex items-center gap-1.5">
            <Ban size={10} /> Suspended ({suspendedDealers.length})
          </p>
          {suspendedDealers.map(d => <DealerRow key={d.id} d={d} />)}
        </div>
      )}

      {/* Empty */}
      {pendingDealers.length === 0 && approvedDealers.length === 0 && suspendedDealers.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <p className="text-3xl mb-3">✅</p>
            <p className="font-syne font-bold text-sm text-(--tx) mb-1">All caught up!</p>
            <p className="text-xs text-(--tx-sub)">No dealers waiting for approval or suspension</p>
          </div>
        </Card>
      )}

      {/* Dealer detail drawer */}
      {drawerDealer && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background:'rgba(0,0,0,0.75)', maxWidth:430, margin:'0 auto' }}
          onClick={e => { if (e.target === e.currentTarget) setDrawerDealer(null) }}>
          <div className="rounded-t-3xl overflow-hidden flex flex-col"
            style={{ background:'var(--bg-nav)', border:'1px solid var(--card-br)', borderBottom:'none', maxHeight:'88vh' }}>

            {/* Handle + header */}
            <div className="px-5 pt-4 pb-3 flex-shrink-0">
              <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background:'var(--card-br)' }} />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-syne font-bold text-base flex-shrink-0"
                    style={
                      drawerDealer.status === 'pending'   ? { background:'rgba(239,159,39,0.12)', border:'1.5px solid rgba(239,159,39,0.25)', color:'#EF9F27' } :
                      drawerDealer.status === 'suspended' ? { background:'rgba(239,68,68,0.12)',  border:'1.5px solid rgba(239,68,68,0.25)',  color:'#f87171' } :
                                                            { background:'rgba(29,158,117,0.12)', border:'1.5px solid rgba(29,158,117,0.25)', color:'#1D9E75' }
                    }>
                    {drawerDealer.business_name.slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-syne font-bold text-base text-(--tx)">{drawerDealer.business_name}</p>
                    <p className="text-(--tx-sub) text-xs">{drawerDealer.phone}</p>
                  </div>
                </div>
                <button onClick={() => setDrawerDealer(null)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background:'var(--card-bg)', border:'1px solid var(--card-br)' }}>
                  <X size={14} className="text-(--tx-sub)" />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">

              {/* Details — full width business address first */}
              <div className="rounded-2xl px-3 py-2.5 mb-2" style={{ background:'var(--card-bg)', border:'1px solid var(--card-br)' }}>
                <p className="text-(--tx-dim) text-[10px] uppercase tracking-wide mb-0.5">Business address</p>
                <p className="text-(--tx) text-sm font-semibold">{drawerDealer.business_address || '—'}</p>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { label: 'CAC No.',  val: drawerDealer.cac_number || '—' },
                  { label: 'State',    val: drawerDealer.state       || '—' },
                  { label: 'LGA',      val: drawerDealer.lga         || '—' },
                  { label: 'Applied',  val: drawerDealer.joined      || '—' },
                ].map(({ label, val }) => (
                  <div key={label} className="rounded-2xl px-3 py-2.5" style={{ background:'var(--card-bg)', border:'1px solid var(--card-br)' }}>
                    <p className="text-(--tx-dim) text-[10px] uppercase tracking-wide mb-0.5">{label}</p>
                    <p className="text-(--tx) text-sm font-semibold">{val}</p>
                  </div>
                ))}
              </div>

              {/* Payout details */}
              <p className="text-[10px] font-semibold uppercase tracking-widest text-(--tx-dim) mb-2">Payout details</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="rounded-2xl px-3 py-2.5" style={{ background:'var(--card-bg)', border:'1px solid var(--card-br)' }}>
                  <p className="text-(--tx-dim) text-[10px] uppercase tracking-wide mb-0.5">Bank</p>
                  <p className="text-(--tx) text-sm font-semibold">{drawerDealer.bank || '—'}</p>
                </div>
                <div className="rounded-2xl px-3 py-2.5" style={{ background:'var(--card-bg)', border:'1px solid var(--card-br)' }}>
                  <p className="text-(--tx-dim) text-[10px] uppercase tracking-wide mb-0.5">Account No.</p>
                  <p className="text-(--tx) text-sm font-semibold font-mono">
                    {drawerDealer.account_number && drawerDealer.account_number !== '—'
                      ? drawerDealer.account_number.slice(0,3) + '****' + drawerDealer.account_number.slice(-3)
                      : '—'}
                  </p>
                </div>
              </div>

              {/* KYC Documents */}
              <div className="mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-(--tx-dim) mb-2">KYC Documents</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'CAC Certificate', icon: FileText },
                    { label: 'Govt ID',          icon: Shield   },
                  ].map(({ label, icon: Icon }) => (
                    <div key={label} className="rounded-2xl px-3 py-3 flex flex-col items-center gap-2 text-center"
                      style={{ background:'var(--card-bg)', border:'1px solid var(--card-br)' }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background:'rgba(29,158,117,0.08)', border:'1px solid rgba(29,158,117,0.15)' }}>
                        <Icon size={16} className="text-brand-green" />
                      </div>
                      <p className="text-(--tx-sub) text-[11px]">{label}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background:'rgba(239,159,39,0.1)', color:'#EF9F27', border:'1px solid rgba(239,159,39,0.2)' }}>
                        Not uploaded
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-(--tx-dim) mt-2">Document upload not yet implemented in API</p>
              </div>

              {/* Actions */}
              {drawerDealer.status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setConfirm({
                        title: `Approve ${drawerDealer.business_name}?`,
                        message: 'This will activate their dealer account. Their bank account will be registered with Interswitch for payouts.',
                        confirmLabel: 'Approve & activate',
                        confirmColor: 'bg-brand-green',
                        onConfirm: async () => {
                          const res = await adminVerifyDealer(drawerDealer.id, drawerDealer.profile_id, drawerDealer.verify_href)
                          setDealers(prev => prev.map(x => x.id===drawerDealer.id ? {...x,status:'approved'} : x))
                          showToast(res.message || `${drawerDealer.business_name} verified successfully`)
                          setDrawerDealer(null)
                        }
                      })
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-syne font-bold text-white bg-brand-green active:scale-95 transition-all">
                    <Check size={15} /> Approve
                  </button>
                  <button
                    onClick={() => {
                      setConfirm({
                        title: `Reject ${drawerDealer.business_name}?`,
                        message: 'The dealer will be notified. They can reapply after 30 days.',
                        confirmLabel: 'Reject',
                        confirmColor: 'bg-red-500',
                        onConfirm: async () => {
                          const res = await rejectDealerWithReason(drawerDealer.id, 'Documents could not be verified')
                          setDealers(prev => prev.map(x => x.id===drawerDealer.id ? {...x,status:'rejected'} : x))
                          showToast(res.message, 'error')
                          setDrawerDealer(null)
                        }
                      })
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-syne font-bold active:scale-95 transition-all"
                    style={{ background:'rgba(239,68,68,0.12)', color:'#f87171', border:'1px solid rgba(239,68,68,0.25)' }}>
                    <X size={15} /> Reject
                  </button>
                </div>
              )}
              {drawerDealer.status === 'approved' && (
                <button
                  onClick={() => {
                    setConfirm({
                      title: `Suspend ${drawerDealer.business_name}?`,
                      message: 'Their account will be deactivated. Active orders will continue to process.',
                      confirmLabel: 'Suspend account',
                      confirmColor: 'bg-red-500',
                      onConfirm: async () => {
                        await suspendUser(drawerDealer.id)
                        setDealers(prev => prev.map(x => x.id===drawerDealer.id ? {...x,status:'suspended'} : x))
                        showToast(`${drawerDealer.business_name} suspended`, 'error')
                        setDrawerDealer(null)
                      }
                    })
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-syne font-bold active:scale-95 transition-all"
                  style={{ background:'rgba(239,68,68,0.08)', color:'#f87171', border:'1px solid rgba(239,68,68,0.2)' }}>
                  <Ban size={15} /> Suspend account
                </button>
              )}
              {drawerDealer.status === 'suspended' && (
                <div className="flex flex-col gap-2">
                  <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
                    style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)' }}>
                    <Ban size={14} className="text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-red-400">Account suspended</p>
                      <p className="text-[11px] text-(--tx-dim)">This dealer cannot receive orders or log in</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setConfirm({
                        title: `Reactivate ${drawerDealer.business_name}?`,
                        message: 'Their account will be restored. They can receive orders and log in again.',
                        confirmLabel: 'Reactivate account',
                        confirmColor: 'bg-brand-green',
                        onConfirm: async () => {
                          await reactivateUser(drawerDealer.id)
                          setDealers(prev => prev.map(x => x.id===drawerDealer.id ? {...x,status:'approved'} : x))
                          showToast(`${drawerDealer.business_name} reactivated`)
                          setDrawerDealer(null)
                        }
                      })
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-syne font-bold text-white bg-brand-green active:scale-95 transition-all">
                    <CheckCircle size={15} /> Reactivate account
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    )
  }

  // ── Escrow management ──────────────────────────────────────────────────────────
  const EscrowSection = () => {
    const orders   = escrowOrders
    const stats    = escrowStats
    const held     = orders.filter(o => o.escrow_status === 'held')
    const disputed = orders.filter(o => o.status === 'disputed')

    const STATUS_LABEL = {
      paid:      { label: 'Awaiting dispatch', color: 'text-brand-amber',  bg: 'rgba(239,159,39,0.1)',  br: 'rgba(239,159,39,0.25)'  },
      dispatched:{ label: 'Dispatched',         color: 'text-blue-400',    bg: 'rgba(59,130,246,0.1)', br: 'rgba(59,130,246,0.25)'  },
      delivered: { label: 'Delivered',          color: 'text-brand-green', bg: 'rgba(29,158,117,0.1)', br: 'rgba(29,158,117,0.25)'  },
      disputed:  { label: 'Disputed ⚠',         color: 'text-red-400',     bg: 'rgba(239,68,68,0.1)',  br: 'rgba(239,68,68,0.25)'   },
      refunded:  { label: 'Refunded',           color: 'text-blue-400',    bg: 'rgba(59,130,246,0.1)', br: 'rgba(59,130,246,0.25)'  },
    }

    return (
      <div className="flex flex-col gap-5">
        <SH title="Escrow management" sub="All Interswitch escrow transactions" badge={disputed.length > 0 ? disputed.length : undefined} />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'In escrow',  val: stats.total_held     || 0, color: 'text-brand-amber', icon: '🔒' },
            { label: 'Released',   val: stats.total_released  || 0, color: 'text-brand-green', icon: '✅' },
            { label: 'Refunded',   val: stats.total_refunded  || 0, color: 'text-blue-400',    icon: '↩️' },
          ].map(({ label, val, color, icon }) => (
            <div key={label} className="rounded-2xl p-3 text-center"
              style={{ background:'var(--card-bg)', border:'1px solid var(--card-br)' }}>
              <p className="text-xl mb-1">{icon}</p>
              <p className={`font-syne font-extrabold text-base ${color}`}>₦{(val/1000).toFixed(1)}k</p>
              <p className="text-(--tx-dim) text-[10px] mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Interswitch flow explainer */}
        <Card>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-(--tx-dim) mb-3">Interswitch escrow flow</p>
          {[
            { step:'1', label:'Farmer pays',         desc:'Interswitch holds funds in escrow — not accessible by dealer', dot:'#1D9E75' },
            { step:'2', label:'Dealer dispatches',   desc:`Dealer ships and marks order sent. ${TIMERS.LABEL_CONFIRM} farmer confirm window starts`, dot:'#EF9F27' },
            { step:'3', label:'Farmer confirms',     desc:'Farmer verifies receipt with PIN. Backend signals Interswitch', dot:'#1D9E75' },
            { step:'4', label:'Interswitch releases',desc:'Net amount (minus 4% fee) transferred to dealer bank account', dot:'#1D9E75' },
            { step:'⏱', label:`${TIMERS.LABEL_DISPATCH} auto-refund`, desc:'Dealer no-show → Interswitch returns full amount to farmer', dot:'#3B82F6' },
          ].map(({ step, label, desc, dot }, i, arr) => (
            <div key={step} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full flex items-center justify-center font-syne font-bold text-xs text-(--tx) flex-shrink-0"
                  style={{ background: `${dot}25`, border: `1.5px solid ${dot}60` }}>
                  {step}
                </div>
                {i < arr.length - 1 && <div className="w-0.5 flex-1 my-1" style={{ background:'var(--card-br)' }} />}
              </div>
              <div className="pb-4">
                <p className="text-sm text-(--tx) font-medium">{label}</p>
                <p className="text-xs text-(--tx-dim) leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </Card>

        {/* ── Unified Disputes Queue ── */}
        {disputes.length > 0 && (() => {
          const open     = disputes.filter(d => !['resolved_refund','resolved_release'].includes(d.status))
          const resolved = disputes.filter(d =>  ['resolved_refund','resolved_release'].includes(d.status))
          return (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-red-400 mb-3 flex items-center gap-2">
                <AlertTriangle size={11} /> Disputes & release requests ({open.length} open)
              </p>
              <div className="flex flex-col gap-3">
                {open.map(d => {
                  const isDealerRelease = d.type === 'dealer_release'
                  const isFarmerAppeal  = d.type === 'farmer_appeal'
                  const typeColor = isDealerRelease ? 'rgba(239,159,39' : 'rgba(239,68,68'
                  const typeLabel = isDealerRelease ? '📤 Dealer release request' : '🚨 Farmer appeal'
                  const isAdminReview = d.status === 'admin_review' || d.status === 'pending_farmer_response'
                  return (
                    <Card key={d.id}>
                      {/* Type badge */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                          style={{ background:`${typeColor},0.1)`, color: isDealerRelease ? '#EF9F27' : '#f87171', border:`1px solid ${typeColor},0.25)` }}>
                          {typeLabel}
                        </span>
                        <span className="text-[10px] text-(--tx-dim)">{d.raised_at}</span>
                      </div>

                      {/* Parties */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {[
                          { label: 'Farmer', val: d.farmer },
                          { label: 'Dealer', val: d.dealer },
                          { label: 'Product', val: d.product },
                          { label: 'Amount', val: `₦${d.amount?.toLocaleString()}` },
                        ].map(({ label, val }) => (
                          <div key={label} className="rounded-xl px-3 py-2" style={{ background:'var(--card-bg)', border:'1px solid var(--card-br)' }}>
                            <p className="text-(--tx-dim) text-[10px] mb-0.5">{label}</p>
                            <p className="text-(--tx) text-xs font-semibold truncate">{val}</p>
                          </div>
                        ))}
                      </div>

                      {/* Reason / note */}
                      {(d.farmer_note || d.dealer_note || d.reason) && (
                        <div className="rounded-xl p-3 mb-3" style={{ background:'var(--card-bg)', border:'1px solid var(--card-br)' }}>
                          <p className="text-(--tx-dim) text-[10px] uppercase tracking-wide mb-1">
                            {isDealerRelease ? 'Dealer note' : 'Farmer reason'}
                          </p>
                          <p className="text-xs text-(--tx-sub) leading-relaxed italic">
                            "{d.dealer_note || d.farmer_note || d.reason}"
                          </p>
                        </div>
                      )}

                      {/* Delivery proof (dealer release only) */}
                      {isDealerRelease && d.dealer_proof && (
                        <div className="rounded-xl p-3 mb-3 flex items-center gap-3"
                          style={{ background:'rgba(239,159,39,0.06)', border:'1px solid rgba(239,159,39,0.2)' }}>
                          <span className="text-xl flex-shrink-0">📎</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-brand-amber uppercase tracking-wide mb-0.5">Delivery proof</p>
                            <p className="text-xs text-(--tx) truncate font-mono">{d.dealer_proof}</p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background:'rgba(239,159,39,0.1)', color:'#EF9F27' }}>View</span>
                        </div>
                      )}

                      {/* Farmer response status */}
                      {isDealerRelease && (
                        <div className="rounded-xl px-3 py-2.5 mb-3 flex items-center justify-between"
                          style={{ background:'var(--card-bg)', border:'1px solid var(--card-br)' }}>
                          <p className="text-[10px] text-(--tx-dim) uppercase tracking-wide">Farmer response</p>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            d.status === 'pending_farmer_response' ? 'text-brand-amber' :
                            d.status === 'farmer_confirmed'        ? 'text-brand-green' :
                            'text-red-400'
                          }`} style={{ background: d.status === 'pending_farmer_response' ? 'rgba(239,159,39,0.1)' : d.status === 'farmer_confirmed' ? 'rgba(29,158,117,0.1)' : 'rgba(239,68,68,0.1)' }}>
                            {d.status === 'pending_farmer_response' ? '⏳ Awaiting (47h left)' :
                             d.status === 'farmer_confirmed'        ? '✓ Farmer confirmed' :
                             '⚠ Farmer disputed'}
                          </span>
                        </div>
                      )}

                      {/* Auto-release notice */}
                      {isDealerRelease && d.status === 'pending_farmer_response' && (
                        <div className="info-banner amber mb-3">
                          <Clock size={12} className="text-brand-amber flex-shrink-0" />
                          <p className="text-xs text-(--tx-sub)">Payment auto-releases to dealer if farmer doesn't respond in {TIMERS.LABEL_RELEASE}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirm({
                            title: 'Refund farmer?',
                            message: `Return ₦${d.amount?.toLocaleString()} to ${d.farmer} via Interswitch.`,
                            confirmLabel: 'Refund farmer',
                            confirmColor: 'bg-blue-500',
                            onConfirm: async () => {
                              if (isDealerRelease) await adminResolveRelease(d.id, 'refund')
                              else await adminResolveAppeal(d.id, 'refund')
                              setDisputes(prev => prev.map(x => x.id === d.id ? {...x, status:'resolved_refund'} : x))
                              showToast(`Refund issued to ${d.farmer}`)
                            }
                          })}
                          className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-blue-400 active:scale-95 transition-all"
                          style={{ background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.25)' }}>
                          ↩ Refund farmer
                        </button>
                        <button
                          onClick={() => setConfirm({
                            title: 'Release to dealer?',
                            message: `Pay ₦${d.amount?.toLocaleString()} to ${d.dealer} via Interswitch.`,
                            confirmLabel: 'Release to dealer',
                            confirmColor: 'bg-brand-green',
                            onConfirm: async () => {
                              if (isDealerRelease) await adminResolveRelease(d.id, 'release')
                              else await adminResolveAppeal(d.id, 'release')
                              setDisputes(prev => prev.map(x => x.id === d.id ? {...x, status:'resolved_release'} : x))
                              showToast(`Payment released to ${d.dealer}`)
                            }
                          })}
                          className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-brand-green active:scale-95 transition-all"
                          style={{ background:'rgba(29,158,117,0.1)', border:'1px solid rgba(29,158,117,0.25)' }}>
                          ✓ Release to dealer
                        </button>
                      </div>
                    </Card>
                  )
                })}
              </div>

              {/* Resolved */}
              {resolved.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-(--tx-dim) mb-2">Resolved ({resolved.length})</p>
                  <div className="flex flex-col gap-2">
                    {resolved.map(d => (
                      <div key={d.id} className="flex items-center justify-between px-4 py-3 rounded-2xl"
                        style={{ background:'var(--card-bg)', border:'1px solid var(--card-br)' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-(--tx) truncate">{d.farmer} → {d.dealer}</p>
                          <p className="text-xs text-(--tx-dim)">₦{d.amount?.toLocaleString()}</p>
                        </div>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${d.status === 'resolved_refund' ? 'text-blue-400' : 'text-brand-green'}`}
                          style={{ background: d.status === 'resolved_refund' ? 'rgba(59,130,246,0.1)' : 'rgba(29,158,117,0.1)' }}>
                          {d.status === 'resolved_refund' ? '↩ Refunded' : '✓ Released'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* All escrow orders */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-(--tx-dim) mb-3">All escrow orders</p>
          <div className="flex flex-col gap-3">
            {orders.length === 0 ? (
              <Card><div className="text-center py-8">
                <p className="text-3xl mb-3">🔒</p>
                <p className="font-syne font-bold text-sm text-(--tx) mb-1">No escrow orders yet</p>
                <p className="text-xs text-(--tx-dim)">Orders will appear here once farmers make payments</p>
              </div></Card>
            ) : orders.map(order => {
              const s = STATUS_LABEL[order.status] || STATUS_LABEL.paid
              return (
                <Card key={order.id}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-semibold text-(--tx)">{order.farmer}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: s.bg, border:`1px solid ${s.br}`, color: s.color.replace('text-','') }}>
                          {s.label}
                        </span>
                      </div>
                      <p className="text-xs text-(--tx-sub) truncate">{order.product}</p>
                      <p className="text-xs text-(--tx-dim)">{order.dealer} · {order.ref}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-syne font-extrabold text-brand-green text-base">₦{order.amount.toLocaleString()}</p>
                      <p className="text-[10px] text-(--tx-dim)">Fee: ₦{order.platform_fee}</p>
                    </div>
                  </div>

                  {/* Timing info */}
                  <div className="flex flex-col gap-1 mb-3 text-xs text-(--tx-dim)">
                    <div className="flex justify-between">
                      <span>Paid</span><span className="text-(--tx-sub)">{order.paid_at}</span>
                    </div>
                    {order.dispatched_at && (
                      <div className="flex justify-between">
                        <span>Dispatched</span><span className="text-(--tx-sub)">{order.dispatched_at}</span>
                      </div>
                    )}
                    {order.delivered_at && (
                      <div className="flex justify-between">
                        <span>Delivered</span><span className="text-(--tx-sub)">{order.delivered_at}</span>
                      </div>
                    )}
                    {order.expires_at && order.escrow_status === 'held' && (
                      <div className="flex justify-between">
                        <span>Expires</span>
                        <span className="text-brand-amber">{order.expires_at}</span>
                      </div>
                    )}
                  </div>

                  {/* Admin actions — only for held orders */}
                  {order.escrow_status === 'held' && order.status !== 'disputed' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirm({
                          title: 'Force release escrow?',
                          message: `Release ₦${order.dealer_payout.toLocaleString()} to ${order.dealer}. Only use after confirming delivery with farmer.`,
                          confirmLabel: 'Force release',
                          confirmColor: 'bg-brand-green',
                          onConfirm: async () => {
                            await adminForceRelease(order.id)
                            setEscrowData(prev => ({
                              ...prev,
                              orders: prev.orders.map(o => o.id === order.id
                                ? {...o, escrow_status:'released', status:'delivered'} : o)
                            }))
                            showToast(`Escrow released to ${order.dealer}`)
                          }
                        })}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold text-brand-green active:scale-95 transition-all"
                        style={{ background:'rgba(29,158,117,0.1)', border:'1px solid rgba(29,158,117,0.25)' }}>
                        Force release
                      </button>
                      <button
                        onClick={() => setConfirm({
                          title: 'Force refund to farmer?',
                          message: `Refund ₦${order.amount.toLocaleString()} to ${order.farmer}. Use for non-delivery or expired window.`,
                          confirmLabel: 'Issue refund',
                          confirmColor: 'bg-blue-500',
                          onConfirm: async () => {
                            await adminForceRefund(order.id)
                            setEscrowData(prev => ({
                              ...prev,
                              orders: prev.orders.map(o => o.id === order.id
                                ? {...o, escrow_status:'refunded', status:'refunded'} : o)
                            }))
                            showToast(`Refund issued to ${order.farmer}`)
                          }
                        })}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold text-blue-400 active:scale-95 transition-all"
                        style={{ background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)' }}>
                        Force refund
                      </button>
                    </div>
                  )}
                  {order.escrow_status === 'released' && (
                    <p className="text-xs text-brand-green flex items-center gap-1.5">
                      <CheckCircle size={11} /> Released to dealer via Interswitch
                    </p>
                  )}
                  {order.escrow_status === 'refunded' && (
                    <div>
                      <p className="text-xs text-blue-400 flex items-center gap-1.5 mb-1">
                        <RefreshCw size={11} /> Refunded to farmer via Interswitch
                      </p>
                      {order.refund_reason && (
                        <p className="text-[10px] text-(--tx-dim) italic">{order.refund_reason}</p>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Payouts ────────────────────────────────────────────────────────────────────
  // ── Transaction Log ──────────────────────────────────────────────────────────
  const LedgerSection = () => {
    const allOrders = escrowOrders
    const released  = allOrders.filter(o => o.escrow_status === 'released')
    const refunded  = allOrders.filter(o => o.escrow_status === 'refunded')
    const held      = allOrders.filter(o => o.escrow_status === 'held')
    const all       = [...allOrders].sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at))
    const resolvedDisputes = disputes.filter(d => ['resolved_refund','resolved_release'].includes(d.status))

    const totalReleased = released.reduce((s, o) => s + (o.dealer_payout || Math.round(o.amount * 0.96)), 0)
    const totalRefunded = refunded.reduce((s, o) => s + o.amount, 0)
    const totalHeld     = held.reduce((s, o) => s + o.amount, 0)
    const totalFees     = released.reduce((s, o) => s + (o.platform_fee || Math.round(o.amount * 0.04)), 0)

    const [filter, setFilter] = useState('all')
    const [searchQ, setSearchQ] = useState('')

    const filtered = all.filter(o => {
      if (filter !== 'all' && o.escrow_status !== filter) return false
      if (searchQ) {
        const q = searchQ.toLowerCase()
        return o.farmer?.toLowerCase().includes(q) || o.dealer?.toLowerCase().includes(q) || o.product?.toLowerCase().includes(q) || o.ref?.toLowerCase().includes(q)
      }
      return true
    })

    const STATUS = {
      released: { label: 'Released',  color: '#10b981', bg: 'rgba(16,185,129,0.08)',  br: 'rgba(16,185,129,0.2)',  icon: '✅' },
      refunded: { label: 'Refunded',  color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  br: 'rgba(59,130,246,0.2)',  icon: '↩' },
      held:     { label: 'In escrow', color: '#EF9F27', bg: 'rgba(239,159,39,0.08)',  br: 'rgba(239,159,39,0.2)',  icon: '🔒' },
      disputed: { label: 'Disputed',  color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   br: 'rgba(239,68,68,0.2)',   icon: '⚠' },
    }

    return (
      <div className="flex flex-col gap-5">

        {/* Header */}
        <div>
          <h2 className="font-syne font-extrabold text-lg text-(--tx) mb-0.5">Transaction ledger</h2>
          <p className="text-(--tx-sub) text-xs">Read-only · All Interswitch escrow movements</p>
        </div>

        {/* Summary hero */}
        <div className="rounded-3xl p-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(29,158,117,0.15) 0%, rgba(29,158,117,0.04) 100%)', border: '1.5px solid rgba(29,158,117,0.25)' }}>
          <div style={{ position:'absolute', top:-30, right:-30, width:150, height:150, background:'radial-gradient(circle, rgba(29,158,117,0.12) 0%, transparent 70%)', borderRadius:'50%' }} />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-green/70 mb-1">Total platform fees collected</p>
          <p className="font-syne font-extrabold text-brand-green mb-0.5" style={{ fontSize: 32, lineHeight: 1 }}>
            ₦{totalFees.toLocaleString()}
          </p>
          <p className="text-brand-green/50 text-xs">4% of ₦{(totalReleased).toLocaleString()} released</p>
        </div>

        {/* 4-stat grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Released to dealers', val: `₦${(totalReleased/1000).toFixed(1)}k`, icon: '✅', color: '#10b981', bg: 'rgba(16,185,129,0.08)', br: 'rgba(16,185,129,0.2)' },
            { label: 'Held in escrow',      val: `₦${(totalHeld/1000).toFixed(1)}k`,     icon: '🔒', color: '#EF9F27', bg: 'rgba(239,159,39,0.08)', br: 'rgba(239,159,39,0.2)' },
            { label: 'Refunded to farmers', val: `₦${(totalRefunded/1000).toFixed(1)}k`, icon: '↩',  color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', br: 'rgba(59,130,246,0.2)'  },
            { label: 'Platform fees',        val: `₦${(totalFees/1000).toFixed(1)}k`,    icon: '📊', color: '#1D9E75', bg: 'rgba(29,158,117,0.08)', br: 'rgba(29,158,117,0.2)'  },
          ].map(({ label, val, icon, color, bg, br }) => (
            <div key={label} className="rounded-2xl p-3.5" style={{ background: bg, border: `1px solid ${br}` }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-base">{icon}</span>
                <p className="font-syne font-extrabold text-lg leading-none" style={{ color }}>{val}</p>
              </div>
              <p className="text-(--tx-dim) text-[11px] leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* How Interswitch works */}
        <Card>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-(--tx-dim) mb-4">How Interswitch handles money</p>
          <div className="flex flex-col gap-0">
            {[
              { icon:'💳', step:'Farmer pays',          desc:'Interswitch locks funds in escrow — neither FarmXnap nor dealer can touch it', color:'#1D9E75' },
              { icon:'🚚', step:'Dealer ships',          desc:'Escrow stays locked during transit',                                          color:'#EF9F27' },
              { icon:'✅', step:'Farmer confirms',       desc:'Triggers automatic Interswitch release — no manual step',                    color:'#1D9E75' },
              { icon:'🏦', step:'Dealer bank credited',  desc:'Net amount (minus 4% fee) sent directly to dealer bank account',            color:'#1D9E75' },
              { icon:'↩',  step:'Dispute → refund',     desc:'Admin rules for farmer → Interswitch reverses funds back to farmer',        color:'#3b82f6' },
            ].map(({ icon, step, desc, color }, i, arr) => (
              <div key={step} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: `${color}18`, border: `1.5px solid ${color}40` }}>{icon}</div>
                  {i < arr.length - 1 && <div className="w-px flex-1 my-1" style={{ background:'var(--card-br)' }} />}
                </div>
                <div className="pb-3 pt-1 flex-1">
                  <p className="text-sm font-semibold text-(--tx)">{step}</p>
                  <p className="text-xs text-(--tx-dim) leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1 px-3 py-2.5 rounded-xl" style={{ background:'rgba(29,158,117,0.06)', border:'1px solid rgba(29,158,117,0.15)' }}>
            <p className="text-xs text-brand-green font-semibold">FarmXnap never holds money</p>
            <p className="text-[11px] text-(--tx-dim) mt-0.5">All funds flow through Interswitch directly. Admin only triggers release/refund instructions.</p>
          </div>
        </Card>

        {/* Filter + search */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {[
              { key: 'all',      label: `All (${all.length})` },
              { key: 'held',     label: `Held (${held.length})` },
              { key: 'released', label: `Released (${released.length})` },
              { key: 'refunded', label: `Refunded (${refunded.length})` },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setFilter(key)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all"
                style={{
                  background: filter === key ? '#1D9E75' : 'var(--card-bg)',
                  color: filter === key ? '#fff' : 'var(--tx-sub)',
                  border: filter === key ? '1px solid transparent' : '1px solid var(--card-br)',
                }}>
                {label}
              </button>
            ))}
          </div>
          <SearchBar value={searchQ} onChange={setSearchQ} placeholder="Search farmer, dealer, product…" />
        </div>

        {/* Transaction rows */}
        {filtered.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <p className="text-3xl mb-3">📋</p>
              <p className="font-syne font-bold text-sm text-(--tx) mb-1">No transactions found</p>
              <p className="text-xs text-(--tx-dim)">Try adjusting your filter</p>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(o => {
              const s = STATUS[o.escrow_status] || STATUS.held
              const net = o.dealer_payout || Math.round(o.amount * 0.96)
              const fee = o.platform_fee   || Math.round(o.amount * 0.04)
              return (
                <div key={o.id} className="rounded-2xl overflow-hidden"
                  style={{ background:'var(--card-bg)', border:'1px solid var(--card-br)' }}>
                  {/* Status strip */}
                  <div className="px-4 py-1.5 flex items-center justify-between"
                    style={{ background: s.bg, borderBottom: `1px solid ${s.br}` }}>
                    <p className="text-[10px] font-semibold" style={{ color: s.color }}>{s.icon} {s.label}</p>
                    <p className="text-[10px] text-(--tx-dim) font-mono">{o.ref || o.id?.slice(-8).toUpperCase()}</p>
                  </div>
                  {/* Body */}
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-(--tx) truncate">{o.product}</p>
                        <p className="text-xs text-(--tx-sub)">{o.farmer} → {o.dealer}</p>
                        <p className="text-[10px] text-(--tx-dim) mt-0.5">{o.paid_at}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-syne font-bold text-base text-(--tx)">₦{o.amount.toLocaleString()}</p>
                        {o.escrow_status === 'released' && (
                          <>
                            <p className="text-[10px] text-emerald-400">₦{net.toLocaleString()} → dealer</p>
                            <p className="text-[10px] text-(--tx-dim)">₦{fee.toLocaleString()} fee</p>
                          </>
                        )}
                        {o.escrow_status === 'refunded' && (
                          <p className="text-[10px] text-blue-400">Full refund</p>
                        )}
                      </div>
                    </div>
                    {o.dispute_reason && (
                      <div className="mt-2 px-3 py-2 rounded-xl text-xs text-red-400 italic"
                        style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)' }}>
                        ⚠ {o.dispute_reason}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Dispute resolution log */}
        {resolvedDisputes.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-(--tx-dim) mb-3">Dispute resolutions</p>
            <div className="flex flex-col gap-2">
              {resolvedDisputes.map(d => (
                <div key={d.id} className="flex items-center justify-between px-4 py-3 rounded-2xl"
                  style={{ background:'var(--card-bg)', border:'1px solid var(--card-br)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-(--tx) truncate">{d.product || d.order_ref}</p>
                    <p className="text-[11px] text-(--tx-dim)">{d.farmer} · {d.raised_at}</p>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold flex-shrink-0"
                    style={{
                      background: d.status === 'resolved_refund' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
                      color: d.status === 'resolved_refund' ? '#3b82f6' : '#10b981',
                    }}>
                    {d.status === 'resolved_refund' ? '↩ Refunded' : '✓ Released'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }


  // ── Farmers ────────────────────────────────────────────────────────────────────
  const FarmersSection = () => {
    const [drawerFarmer, setDrawerFarmer] = useState(null)

    const filtered = farmers.filter(f =>
      !search || f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.phone.includes(search)
    )

    return (
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div>
          <h2 className="font-syne font-extrabold text-lg text-(--tx) mb-0.5">Farmers</h2>
          <p className="text-(--tx-sub) text-xs">{farmers.length} registered</p>
        </div>

        <SearchBar value={search} onChange={setSearch} placeholder="Search by name or phone…" />

        {/* List */}
        {loading
          ? [1,2,3].map(i => <div key={i} className="h-16 rounded-2xl shimmer" />)
          : filtered.length === 0
            ? (
              <Card>
                <div className="text-center py-8">
                  <p className="text-3xl mb-3">🌾</p>
                  <p className="font-syne font-bold text-sm text-(--tx) mb-1">No farmers found</p>
                  <p className="text-xs text-(--tx-sub)">Try adjusting your search</p>
                </div>
              </Card>
            )
            : (
              <div className="flex flex-col gap-2">
                {filtered.map(f => (
                  <button key={f.id}
                    onClick={() => setDrawerFarmer(f)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3.5 transition-all active:scale-[0.98]"
                    style={{ background:'var(--card-bg)', border:'1px solid var(--card-br)', borderRadius:16 }}>
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-syne font-bold text-sm"
                      style={{ background:'rgba(29,158,117,0.12)', border:'1.5px solid rgba(29,158,117,0.25)', color:'#1D9E75' }}>
                      {f.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-(--tx) text-sm font-semibold truncate">{f.name}</p>
                      <p className="text-(--tx-sub) text-xs truncate">{f.phone} · {f.state}</p>
                    </div>
                    {/* Badge + chevron */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${BADGE[f.status] || BADGE.active}`}>
                        {f.status}
                      </span>
                      <ChevronRight size={14} className="text-(--tx-dim)" />
                    </div>
                  </button>
                ))}
              </div>
            )
        }

        {/* Farmer detail drawer */}
        {drawerFarmer && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end"
            style={{ background:'rgba(0,0,0,0.75)', maxWidth:430, margin:'0 auto' }}
            onClick={e => { if (e.target === e.currentTarget) setDrawerFarmer(null) }}>
            <div className="rounded-t-3xl overflow-hidden flex flex-col"
              style={{ background:'var(--bg-nav)', border:'1px solid var(--card-br)', borderBottom:'none', maxHeight:'88vh' }}>

              {/* Handle + header */}
              <div className="px-5 pt-4 pb-3 flex-shrink-0">
                <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background:'var(--card-br)' }} />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-syne font-bold text-base flex-shrink-0"
                      style={{ background:'rgba(29,158,117,0.12)', border:'1.5px solid rgba(29,158,117,0.25)', color:'#1D9E75' }}>
                      {drawerFarmer.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-syne font-bold text-base text-(--tx)">{drawerFarmer.name}</p>
                      <p className="text-(--tx-sub) text-xs">{drawerFarmer.phone}</p>
                    </div>
                  </div>
                  <button onClick={() => setDrawerFarmer(null)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background:'var(--card-bg)', border:'1px solid var(--card-br)' }}>
                    <X size={14} className="text-(--tx-sub)" />
                  </button>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: 'Scans',   val: drawerFarmer.scans || 0,  color: 'text-brand-green' },
                    { label: 'Crop',    val: drawerFarmer.crop  || '—', color: 'text-(--tx)'      },
                    { label: 'Status',  val: drawerFarmer.status,       color: drawerFarmer.status === 'active' ? 'text-brand-green' : 'text-red-400' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="rounded-2xl px-3 py-2.5 text-center" style={{ background:'var(--card-bg)', border:'1px solid var(--card-br)' }}>
                      <p className={`font-syne font-bold text-base ${color}`}>{val}</p>
                      <p className="text-(--tx-dim) text-[10px] mt-0.5 uppercase tracking-wide">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { label: 'State',       val: drawerFarmer.state  || '—' },
                    { label: 'LGA',         val: drawerFarmer.lga    || '—' },
                    { label: 'Farm size',   val: drawerFarmer.farm_size || '—' },
                    { label: 'Experience',  val: drawerFarmer.experience || '—' },
                    { label: 'Joined',      val: drawerFarmer.joined || '—' },
                    { label: 'Primary crop',val: drawerFarmer.crop   || '—' },
                  ].map(({ label, val }) => (
                    <div key={label} className="rounded-2xl px-3 py-2.5" style={{ background:'var(--card-bg)', border:'1px solid var(--card-br)' }}>
                      <p className="text-(--tx-dim) text-[10px] uppercase tracking-wide mb-0.5">{label}</p>
                      <p className="text-(--tx) text-sm font-semibold">{val}</p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                {drawerFarmer.status === 'active' ? (
                  <button
                    onClick={() => {
                      setConfirm({
                        title: `Suspend ${drawerFarmer.name}?`,
                        message: 'This farmer will lose all access to FarmXnap.',
                        confirmLabel: 'Suspend',
                        confirmColor: 'bg-red-500',
                        onConfirm: async () => {
                          await suspendUser(drawerFarmer.id)
                          setFarmers(prev => prev.map(x => x.id===drawerFarmer.id ? {...x,status:'suspended'} : x))
                          showToast(`${drawerFarmer.name} suspended`, 'error')
                          setDrawerFarmer(null)
                        }
                      })
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-syne font-bold active:scale-95 transition-all"
                    style={{ background:'rgba(239,68,68,0.08)', color:'#f87171', border:'1px solid rgba(239,68,68,0.2)' }}>
                    <Ban size={15} /> Suspend account
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
                      style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)' }}>
                      <Ban size={14} className="text-red-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-red-400">Account suspended</p>
                        <p className="text-[11px] text-(--tx-dim)">This farmer cannot access FarmXnap</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setConfirm({
                          title: `Reactivate ${drawerFarmer.name}?`,
                          message: 'Their account will be restored and they can log in again.',
                          confirmLabel: 'Reactivate',
                          confirmColor: 'bg-brand-green',
                          onConfirm: async () => {
                            await reactivateUser(drawerFarmer.id)
                            setFarmers(prev => prev.map(x => x.id===drawerFarmer.id ? {...x,status:'active'} : x))
                            showToast(`${drawerFarmer.name} reactivated`)
                            setDrawerFarmer(null)
                          }
                        })
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-syne font-bold text-white bg-brand-green active:scale-95 transition-all">
                      <CheckCircle size={15} /> Reactivate account
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Scans ──────────────────────────────────────────────────────────────────────
  const ScansSection = () => {
    const filtered = scans.filter(s =>
      !search || s.farmer.toLowerCase().includes(search.toLowerCase()) ||
      s.disease.toLowerCase().includes(search.toLowerCase())
    )
    return (
      <div className="flex flex-col gap-4">
        <SH title="Scan history" sub={`${scans.length} total diagnoses`} />
        <SearchBar value={search} onChange={setSearch} placeholder="Search farmer or disease…" />
        {loading
          ? [1,2,3].map(i => <div key={i} className="h-24 rounded-2xl shimmer" />)
          : filtered.map(s => (
              <Card key={s.id}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-(--tx) text-sm font-semibold">{s.farmer}</p>
                    <p className="text-(--tx-sub) text-xs">{s.crop} · {s.state}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                    s.treated ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                              : 'bg-red-500/15 text-red-400 border border-red-500/20'
                  }`}>
                    {s.treated ? 'Treated' : 'Untreated'}
                  </span>
                </div>
                <p className="text-(--tx-sub) text-xs mb-3 truncate">{s.disease}</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background:'var(--card-br)' }}>
                    <div className={`h-1 rounded-full ${s.confidence>=90?'bg-brand-green':s.confidence>=75?'bg-brand-amber':'bg-red-400'}`}
                      style={{ width:`${s.confidence}%` }} />
                  </div>
                  <span className={`text-xs font-mono font-bold flex-shrink-0 ${s.confidence>=90?'text-brand-green':s.confidence>=75?'text-brand-amber':'text-red-400'}`}>
                    {s.confidence}%
                  </span>
                  <p className="text-(--tx-dim) text-xs flex-shrink-0">{s.date}</p>
                </div>
              </Card>
            ))
        }
      </div>
    )
  }

  const SECTIONS = { overview: OverviewSection, approvals: ApprovalsSection, escrow: EscrowSection, ledger: LedgerSection, farmers: FarmersSection, scans: ScansSection }
  const ActiveSection = SECTIONS[nav] || OverviewSection

  return (
    <div className="h-screen w-full overflow-hidden flex font-dm" style={{ background:'var(--bg)', position:'relative' }}>
      {/* Ambient green glow — top left */}
      <div style={{ position:'fixed', top:-100, left:-80, width:400, height:400, background:'radial-gradient(circle, rgba(29,158,117,0.1) 0%, transparent 70%)', pointerEvents:'none', zIndex:0, borderRadius:'50%' }} />
      <div style={{ position:'fixed', bottom:-80, right:-80, width:300, height:300, background:'radial-gradient(circle, rgba(29,158,117,0.06) 0%, transparent 70%)', pointerEvents:'none', zIndex:0, borderRadius:'50%' }} />

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 h-full"
        style={{ background:'var(--bg-nav)', borderRight:'1px solid var(--card-br)' }}>
        {/* Logo */}
        <div className="px-5 pt-6 pb-5" style={{ borderBottom:'1px solid var(--card-br)' }}>
          <div className="flex items-center gap-3">
            <AppLogo />
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <Shield size={10} className="text-brand-green" />
            <p className="text-[10px] font-semibold text-brand-green">Admin Console</p>
          </div>
        </div>
        {/* Nav items */}
        <nav className="flex-1 px-3 py-5 flex flex-col gap-0.5 overflow-y-auto">
          {NAV.map(({ key, label, icon: Icon }) => {
            const badge = key === 'approvals' ? pendingDealers.length : 0
            const isActive = nav === key
            return (
              <button key={key} onClick={() => setNav(key)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all w-full text-left"
                style={{
                  background: isActive ? 'rgba(29,158,117,0.15)' : 'transparent',
                  color: isActive ? '#1D9E75' : 'var(--tx-sub)',
                  fontWeight: isActive ? 600 : 400,
                  borderLeft: isActive ? '2px solid #1D9E75' : '2px solid transparent',
                }}>
                <Icon size={15} />
                {label}
                {badge > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>
                )}
              </button>
            )
          })}
        </nav>
        {/* Admin badge */}
        <div className="px-4 pb-6 pt-3 flex-shrink-0" style={{ borderTop:'1px solid rgba(29,158,117,0.1)' }}>
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
            style={{ background:'rgba(29,158,117,0.08)', border:'1px solid rgba(29,158,117,0.15)' }}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background:'rgba(29,158,117,0.2)' }}>
              <Shield size={12} className="text-brand-green" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Super Admin</p>
              <p className="text-[10px] text-(--tx-dim)">Logout</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-56 h-full flex flex-col"
            style={{ background:'var(--bg-nav)', borderRight:'1px solid var(--card-br)' }}>
            {/* Logo — same as desktop */}
            <div className="px-5 pt-6 pb-5" style={{ borderBottom:'1px solid var(--card-br)', paddingTop:'calc(env(safe-area-inset-top, 0px) + 24px)' }}>
              <div className="flex items-center justify-between">
                <AppLogo />
                <button onClick={() => setDrawerOpen(false)} className="text-(--tx-dim) w-8 h-8 flex items-center justify-center rounded-xl" style={{ background:'var(--card-bg)', border:'1px solid var(--card-br)' }}>
                  <X size={15} />
                </button>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <Shield size={10} className="text-brand-green" />
                <p className="text-[10px] font-semibold text-brand-green">Admin Console</p>
              </div>
            </div>
            {/* Nav items — same style as desktop */}
            <nav className="flex-1 px-3 py-5 flex flex-col gap-0.5 overflow-y-auto">
              {NAV.map(({ key, label, icon: Icon }) => {
                const badge = key === 'approvals' ? pendingDealers.length : 0
                const isActive = nav === key
                return (
                  <button key={key} onClick={() => { setNav(key); setDrawerOpen(false) }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full text-left transition-all"
                    style={{
                      background: isActive ? 'rgba(29,158,117,0.15)' : 'transparent',
                      color: isActive ? '#1D9E75' : 'var(--tx-sub)',
                      fontWeight: isActive ? 600 : 400,
                      borderLeft: isActive ? '2px solid #1D9E75' : '2px solid transparent',
                    }}>
                    <Icon size={15} />
                    {label}
                    {badge > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>}
                  </button>
                )
              })}
            </nav>
            {/* Admin badge — same as desktop */}
            <div className="px-4 pb-6 pt-3 flex-shrink-0" style={{ borderTop:'1px solid var(--card-br)' }}>
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                style={{ background:'rgba(29,158,117,0.08)', border:'1px solid rgba(29,158,117,0.15)' }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background:'rgba(29,158,117,0.2)' }}>
                  <Shield size={12} className="text-brand-green" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-(--tx)">Super Admin</p>
                  <p className="text-[10px] text-(--tx-dim)">hack-one-milli</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1" onClick={() => setDrawerOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 flex items-center justify-between px-5 pb-3.5"
          style={{ background:'var(--bg-nav)', borderBottom:'1px solid var(--card-br)', backdropFilter:'blur(12px)', paddingTop:'calc(env(safe-area-inset-top, 0px) + 14px)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setDrawerOpen(true)} className="lg:hidden w-8 h-8 rounded-xl flex items-center justify-center text-(--tx-sub)"
              style={{ background:'var(--card-bg)', border:'1px solid var(--card-br)' }}>
              <Menu size={16} />
            </button>
            <div className="lg:hidden">
              <p className="text-(--tx-dim) text-[10px]">FarmXnap Admin</p>
            </div>
            <div className="hidden lg:block">
              <p className="text-(--tx-dim) text-[10px]">FarmXnap Admin</p>
            </div>
            {nav === 'approvals' && pendingDealers.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingDealers.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-xl font-semibold"
              style={{ background:'rgba(29,158,117,0.1)', color:'#1D9E75', border:'1px solid rgba(29,158,117,0.2)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green" style={{ animation:'pulse-dot 2s ease-in-out infinite' }} />
              Live
            </div>
          </div>
        </header>

        {/* Bottom nav (mobile) */}
        <div className="lg:hidden flex-shrink-0 order-last"
          style={{ background:'var(--bg-nav)', borderTop:'1px solid var(--card-br)', paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 4px)' }}>
          <div className="flex items-center">
            {NAV.map(({ key, label, icon: Icon }) => {
              const badge = key === 'approvals' ? pendingDealers.length : 0
              return (
                <button key={key} onClick={() => setNav(key)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[9px] relative transition-all ${
                    nav === key ? 'text-brand-green' : 'text-(--tx-sub)'
                  }`}>
                  <div className="relative">
                    <Icon size={17} strokeWidth={nav === key ? 2.5 : 1.8} />
                    {badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                        {badge}
                      </span>
                    )}
                  </div>
                  {label}
                </button>
              )
            })}
            {/* Compact theme toggle in mobile nav */}
            <div className="flex flex-col items-center gap-1 py-2.5 px-2">
              <button
                onClick={() => {
                  const t = ['dark','light','green']
                  setTheme(t[(t.indexOf(theme)+1)%3])
                }}
                className="w-8 h-7 rounded-lg flex items-center justify-center text-sm transition-all"
                style={{ background:'var(--card-bg)', border:'1px solid var(--card-br)' }}>
                {theme==='dark'?'🌙':theme==='light'?'☀️':'🌿'}
              </button>
              <span className="text-[9px] text-(--tx-dim)">Theme</span>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <main className="flex-1 min-h-0 overflow-y-auto p-5" style={{ background:'var(--bg)', position:'relative', zIndex:1 }}>
          <div className="max-w-lg mx-auto">
            {waking && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-5"
                style={{ background:'rgba(239,159,39,0.08)', border:'1px solid rgba(239,159,39,0.25)' }}>
                <span className="spinner" style={{ borderColor:'#EF9F27', borderTopColor:'transparent' }} />
                <div>
                  <p className="text-sm font-semibold text-brand-amber mb-0.5">Waking up server…</p>
                  <p className="text-xs text-(--tx-sub)">Render free tier sleeps after inactivity. Retrying in 5 seconds.</p>
                </div>
              </div>
            )}
            {apiError && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-2xl mb-5"
                style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)' }}>
                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-400 mb-0.5">API Error</p>
                  <p className="text-xs text-(--tx-sub) break-words">{apiError}</p>
                </div>
                <button
                  onClick={() => {
                    setApiError('')
                    adminGetAllUsers()
                      .then(({ farmers: f, dealers: d }) => { setFarmers(f); setDealers(d) })
                      .catch(e => setApiError(e.message))
                  }}
                  className="text-xs text-brand-amber underline flex-shrink-0">
                  Retry
                </button>
              </div>
            )}
            <ActiveSection />
            <div className="h-8" />
          </div>
        </main>
      </div>

      {/* Confirm modal */}
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          confirmColor={confirm.confirmColor}
          onConfirm={confirm.onConfirm}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  )
}