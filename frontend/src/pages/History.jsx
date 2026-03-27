import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLogo from '../component/AppLogo'
import {
  Leaf, CheckCircle, AlertCircle, X, ChevronRight,
  Phone, Package, ShieldCheck, Clock, Truck,
} from 'lucide-react'
import { getFarmerHistory } from '../services/api'
import { useCartStore, useScanStore } from '../store'

const FILTERS = ['All', 'Treated', 'Untreated']

// ── Scan detail bottom sheet ──────────────────────────────────────────────────
function ScanDetailSheet({ scan, onClose, onBuyTreatment }) {
  if (!scan) return null
  const isHealthy    = !scan.disease
  const treated      = scan.status === 'treated' || isHealthy
  const isDispatched = scan.order?.status === 'dispatched'
  const confidence   = scan.confidence || 90
  const confColor    = confidence >= 85 ? '#ef4444' : confidence >= 70 ? '#EF9F27' : '#1D9E75'
  const escrowStatus = scan.order?.escrow_status

  return (
    <div className="sheet-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet-panel" style={{ maxHeight: '92vh' }}>

        {/* Header */}
        <div className="sheet-header">
          <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--card-br)' }} />
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className={`badge ${treated ? 'green' : isDispatched ? 'amber' : 'red'}`}>
                  {treated
                    ? <><CheckCircle size={9} /> Treated</>
                    : isDispatched
                      ? <><Truck size={9} /> Dispatched</>
                      : <><AlertCircle size={9} /> Untreated</>
                  }
                </span>
                <span className="text-(--tx-dim) text-xs">{scan.crop} · {scan.date}</span>
              </div>
              <h3 className="font-syne font-extrabold text-xl text-(--tx) leading-tight">{scan.disease || "Healthy crop ✓"}</h3>
            </div>
            <button onClick={onClose} className="nav-close flex-shrink-0"><X size={15} /></button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="sheet-body pb-4">

          {/* Confidence */}
          <div className="rounded-2xl px-4 py-3.5 mb-3"
            style={{ background: `${confColor}10`, border: `1px solid ${confColor}30` }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-(--tx-sub)">AI confidence score</p>
              <p className="font-syne font-extrabold text-2xl" style={{ color: confColor }}>{confidence}%</p>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--card-br)' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${confidence}%`, background: confColor }} />
            </div>
          </div>

          {/* Symptoms */}
          {/* Symptoms from old API, or active_ingredient/category from new API */}
          {(scan.symptoms?.length > 0 || scan.active_ingredient || scan.category) && (
            <div className="glass-card mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-(--tx-sub) mb-3">
                {scan.symptoms?.length > 0 ? 'Symptoms detected' : 'Treatment info'}
              </p>
              <div className="flex flex-col gap-2">
                {scan.symptoms?.length > 0
                  ? scan.symptoms.map((s, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                          style={{ background: confColor }} />
                        <p className="text-sm text-(--tx-sub) leading-snug">{s}</p>
                      </div>
                    ))
                  : [
                      scan.active_ingredient && { label: 'Active ingredient', val: scan.active_ingredient },
                      scan.category          && { label: 'Product category',  val: scan.category },
                      scan.search_term       && { label: 'Treatment target',  val: scan.search_term },
                    ].filter(Boolean).map(({ label, val }) => (
                      <div key={label} className="flex items-center justify-between py-1">
                        <span className="text-xs text-(--tx-dim)">{label}</span>
                        <span className="text-xs font-semibold text-(--tx)">{val}</span>
                      </div>
                    ))
                }
              </div>
            </div>
          )}

          {/* Remedy */}
          {scan.remedy && (
            <div className="rounded-2xl px-4 py-3.5 mb-3 flex items-start gap-3"
              style={{ background: 'rgba(29,158,117,0.07)', border: '1px solid rgba(29,158,117,0.2)' }}>
              <span className="text-xl flex-shrink-0">💊</span>
              <div>
                <p className="text-sm font-syne font-bold text-(--tx) mb-1">Recommended treatment</p>
                <p className="text-xs text-(--tx-sub) leading-relaxed">{scan.remedy}</p>
              </div>
            </div>
          )}

          {/* ── ORDER DETAILS (treated) ── */}
          {treated && scan.order && (
            <div className="mb-3">
              {/* Escrow status pill */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-px" style={{ background: 'var(--card-br)' }} />
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                  escrowStatus === 'released' ? 'text-brand-green' : 'text-brand-amber'
                }`} style={{
                  background: escrowStatus === 'released' ? 'rgba(29,158,117,0.1)' : 'rgba(239,159,39,0.1)',
                  border: escrowStatus === 'released' ? '1px solid rgba(29,158,117,0.25)' : '1px solid rgba(239,159,39,0.25)',
                }}>
                  <ShieldCheck size={10} />
                  {escrowStatus === 'released' ? 'Escrow released' : 'Escrow held'}
                </div>
                <div className="flex-1 h-px" style={{ background: 'var(--card-br)' }} />
              </div>

              {/* Order info cards */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="rounded-2xl px-3 py-3"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--card-br)' }}>
                  <p className="text-[10px] text-(--tx-dim) uppercase tracking-widest mb-1">Product</p>
                  <p className="text-xs font-semibold text-(--tx) leading-snug">{scan.treatment_product?.name || '—'}</p>
                </div>
                <div className="rounded-2xl px-3 py-3"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--card-br)' }}>
                  <p className="text-[10px] text-(--tx-dim) uppercase tracking-widest mb-1">Dealer</p>
                  <p className="text-xs font-semibold text-(--tx) leading-snug truncate">{scan.order.dealer}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="rounded-2xl px-3 py-3"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--card-br)' }}>
                  <p className="text-[10px] text-(--tx-dim) uppercase tracking-widest mb-1">Amount paid</p>
                  <p className="text-sm font-syne font-extrabold text-brand-green">₦{scan.order.amount.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl px-3 py-3"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--card-br)' }}>
                  <p className="text-[10px] text-(--tx-dim) uppercase tracking-widest mb-1">Order ref</p>
                  <p className="text-xs font-mono font-semibold text-(--tx-sub)">{scan.order.ref}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl px-3 py-3"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--card-br)' }}>
                  <p className="text-[10px] text-(--tx-dim) uppercase tracking-widest mb-1">Ordered</p>
                  <p className="text-xs font-semibold text-(--tx)">{scan.order.date_ordered}</p>
                </div>
                <div className="rounded-2xl px-3 py-3"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--card-br)' }}>
                  <p className="text-[10px] text-(--tx-dim) uppercase tracking-widest mb-1">Delivered</p>
                  <p className="text-xs font-semibold text-(--tx)">{scan.order.date_delivered || '—'}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── DISPATCHED: awaiting confirmation ── */}
          {!treated && isDispatched && (
            <div className="rounded-2xl px-4 py-3.5 mb-3 flex items-start gap-3"
              style={{ background: 'rgba(239,159,39,0.07)', border: '1px solid rgba(239,159,39,0.2)' }}>
              <Truck size={16} className="text-brand-amber flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-syne font-bold text-(--tx) mb-0.5">Order dispatched</p>
                <p className="text-xs text-(--tx-sub) leading-relaxed">
                  {scan.order.dealer} has dispatched your order. Confirm delivery to release payment.
                </p>
              </div>
            </div>
          )}

          {/* ── NO ORDER YET ── */}
          {!treated && !scan.order && scan.treatment_product && (
            <div className="rounded-2xl px-4 py-3.5 mb-3 flex items-center gap-3"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-br)' }}>
              <span className="text-2xl flex-shrink-0">📦</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-(--tx) truncate">{scan.treatment_product.name}</p>
                <p className="text-xs text-(--tx-sub)">Recommended treatment</p>
              </div>
              <p className="font-syne font-extrabold text-brand-green flex-shrink-0">
                ₦{scan.treatment_product.price.toLocaleString()}
              </p>
            </div>
          )}

        </div>

        {/* Sticky footer CTAs */}
        <div className="sheet-footer flex flex-col gap-2">
          {!treated && !scan.order && (
            <button className="btn-main w-full" onClick={() => onBuyTreatment(scan)}>
              <Package size={15} /> Buy treatment now
            </button>
          )}
          {!treated && isDispatched && (
            <button className="btn-main w-full" onClick={() => onBuyTreatment(scan)}>
              <CheckCircle size={15} /> Confirm delivery & release payment
            </button>
          )}
          {!treated && (
            <button className="btn-main ghost w-full" onClick={onClose}>
              🔬 Re-scan this crop
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function History() {
  const navigate  = useNavigate()
  const setCart   = useCartStore(s => s.setCart)
  const { setDiagnosis, setCropType } = useScanStore()
  const [history,    setHistory]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState('All')
  const [activeScan, setActiveScan] = useState(null)

  useEffect(() => {
    getFarmerHistory().then(d => { setHistory(d); setLoading(false) })
  }, [])

  // New API: disease===null means healthy, disease present means needs treatment
  const isTreated   = h => h.status === 'treated' || !h.disease
  const isUntreated = h => h.status === 'pending'  || (h.disease && h.status !== 'treated')
  const filtered = filter === 'All' ? history
    : filter === 'Treated'   ? history.filter(isTreated)
    : history.filter(isUntreated)

  const counts = {
    All:       history.length,
    Treated:   history.filter(isTreated).length,
    Untreated: history.filter(isUntreated).length,
  }

  const handleBuyTreatment = (scan) => {
    if (scan.order?.status === 'dispatched') {
      navigate('/order-tracking', { state: { order: scan.order } })
      return
    }
    setCropType(scan.crop)
    setDiagnosis({
      disease: scan.disease,
      confidence: scan.confidence,
      symptoms: scan.symptoms,
      remedy: scan.remedy,
      treatment_product: scan.treatment_product,
      nearby_dealers: [],
    })
    setActiveScan(null)
    navigate('/results')
  }

  return (
    <div className="page-shell grain">
      <div className="orb orb-1" />

      <nav className="app-nav">
        <button className="nav-back" onClick={() => navigate('/dashboard')}>← Back</button>
        <AppLogo />
        <span className="text-xs text-(--tx-sub) bg-(--card-bg) border border-(--card-br) px-2.5 py-1 rounded-full">
          {counts.All} scans
        </span>
      </nav>

      <div className="page-body pt-4">
        <header className="page-header pb-4">
          <p className="page-eyebrow">Your farm</p>
          <h1 className="page-title">Scan history</h1>
        </header>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 mb-5 anim-1">
          <div className="glass-card-green text-center">
            <p className="font-syne font-extrabold text-2xl text-brand-green">{counts.Treated}</p>
            <p className="text-xs text-(--tx-sub) mt-0.5">Treated</p>
          </div>
          <div className="text-center rounded-2xl p-4" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <p className="font-syne font-extrabold text-2xl text-red-400">{counts.Untreated}</p>
            <p className="text-xs text-(--tx-sub) mt-0.5">Untreated</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5 anim-2">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all border ${
                filter === f
                  ? f === 'Untreated'
                    ? 'bg-red-500/15 text-red-400 border-red-500/25'
                    : 'bg-brand-green text-white border-transparent'
                  : 'text-(--tx-sub) border-(--card-br) bg-(--card-bg)'
              }`}>
              {f}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                filter === f ? 'bg-white/20 text-white' : 'bg-(--card-bg) text-(--tx-sub)'
              }`}>{counts[f]}</span>
            </button>
          ))}
        </div>

        {/* Scan list */}
        <div className="flex flex-col gap-3 anim-3">
          {loading ? (
            [1,2,3,4].map(i => <div key={i} className="h-24 shimmer" />)
          ) : filtered.length === 0 ? (
            <div className="glass-card text-center py-10">
              <Leaf size={28} className="text-(--tx-dim) mx-auto mb-3" />
              <p className="font-syne font-bold text-(--tx) text-sm mb-1">No scans here</p>
              <p className="text-xs text-(--tx-sub)">
                {filter === 'Untreated' ? 'All crops treated! 🎉' : 'Start scanning your crops to see history.'}
              </p>
            </div>
          ) : (
            filtered.map((scan, idx) => {
              const isHealthy    = !scan.disease
              const treated      = scan.status === 'treated' || isHealthy
              const isDispatched = scan.order?.status === 'dispatched'
              const cardConf     = scan.confidence || 90
              return (
                <button key={scan.id}
                  className="glass-card text-left w-full active:scale-[0.985] transition-all"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                  onClick={() => setActiveScan(scan)}>

                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      treated ? 'bg-brand-green/10' : isDispatched ? 'bg-brand-amber/10' : 'bg-red-500/10'
                    }`}>
                      <Leaf size={15} className={
                        treated ? 'text-brand-green' : isDispatched ? 'text-brand-amber' : 'text-red-400'
                      } />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-syne font-bold text-sm text-(--tx) truncate mb-0.5">{scan.disease || "Healthy crop ✓"}</p>
                      <p className="text-xs text-(--tx-sub)">{scan.crop} · {scan.date}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`badge ${treated ? 'green' : isDispatched ? 'amber' : 'red'}`}>
                        {treated
                          ? <><CheckCircle size={9} /> Treated</>
                          : isDispatched
                            ? <><Truck size={9} /> Dispatched</>
                            : <><AlertCircle size={9} /> Untreated</>
                        }
                      </span>
                      <ChevronRight size={12} className="text-(--tx-dim)" />
                    </div>
                  </div>

                  {/* Confidence bar */}
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] text-(--tx-dim) w-16 flex-shrink-0">Confidence</span>
                    <div className="conf-track">
                      <div className={`conf-fill ${treated ? 'green' : 'amber'}`}
                        style={{ width: `${cardConf}%` }} />
                    </div>
                    <span className={`text-xs font-semibold font-mono flex-shrink-0 ${
                      treated ? 'text-brand-green' : 'text-brand-amber'
                    }`}>{cardConf}%</span>
                  </div>

                  {isDispatched && (
                    <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ background: 'rgba(239,159,39,0.07)', border: '1px solid rgba(239,159,39,0.18)' }}>
                      <Truck size={12} className="text-brand-amber flex-shrink-0" />
                      <p className="text-xs text-brand-amber">On its way — tap to confirm delivery</p>
                    </div>
                  )}

                  {!treated && !isDispatched && (
                    <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <AlertCircle size={12} className="text-red-400 flex-shrink-0" />
                      <p className="text-xs text-red-400">Treatment not purchased — tap to buy</p>
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>

        <div className="h-8" />
      </div>

      {activeScan && (
        <ScanDetailSheet
          scan={activeScan}
          onClose={() => setActiveScan(null)}
          onBuyTreatment={handleBuyTreatment}
        />
      )}
    </div>
  )
}