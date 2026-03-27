import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLogo from '../component/AppLogo'
import { ShieldCheck, CheckCircle, ChevronRight, Phone, MapPin, Package, Leaf, Star } from 'lucide-react'
import { useScanStore, useCartStore } from '../store'

// Match label from API rank value
const getMatchLabel = (rank) => {
  if (rank === undefined || rank === null) return null
  if (rank > 2.5) return { label: 'Best Match', color: '#1D9E75', bg: 'rgba(29,158,117,0.12)', br: 'rgba(29,158,117,0.25)' }
  if (rank > 0.5) return { label: 'Recommended', color: '#EF9F27', bg: 'rgba(239,159,39,0.1)', br: 'rgba(239,159,39,0.22)' }
  return { label: 'General', color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.05)', br: 'rgba(255,255,255,0.1)' }
}

export default function Results() {
  const navigate  = useNavigate()
  const { diagnosis, capturedImage, cropType } = useScanStore()
  const setCart = useCartStore(s => s.setCart)
  const [selected, setSelected] = useState(null)
  const [showAll,  setShowAll]  = useState(false)

  useEffect(() => {
    if (!diagnosis) navigate('/scan')
  }, [diagnosis])

  if (!diagnosis) return null

  const {
    healthy       = false,
    disease,
    crop,
    confidence    = 90,
    symptoms      = [],
    remedy,
    treatments    = [],   // real API: merged product+dealer list
    nearby_dealers = [],  // mock fallback
    treatment_product,
  } = diagnosis

  // Build unified treatment+dealer list
  // Real API: treatments[] already has dealer info merged in
  // Mock: nearby_dealers[] with separate treatment_product
  const isMock = treatments.length === 0 && nearby_dealers.length > 0

  const allTreatments = isMock
    ? nearby_dealers.map((d, i) => ({
        id:             d.id || `dealer-${i}`,
        name:           treatment_product?.name || 'Treatment product',
        active_ingredient: '',
        price:          d.price || treatment_product?.price || 0,
        stock_quantity: d.stock_count || 0,
        unit:           '',
        description:    '',
        disease_target: '',
        category:       'Fungicide',
        dealer_name:    d.name,
        dealer_address: d.address,
        dealer_phone:   d.phone,
        dealer_state:   '',
        in_stock:       d.in_stock,
        rank:           null,
        match_label:    null,
        // mock extras
        rating:         d.rating,
        reviews:        d.reviews,
        distance_km:    d.distance_km,
        delivery_hours: d.delivery_hours,
        badge:          d.badge,
      }))
    : treatments

  const inStock    = allTreatments.filter(t => t.in_stock !== false)
  const outOfStock = allTreatments.filter(t => t.in_stock === false)
  const displayed  = showAll ? inStock : inStock.slice(0, 3)

  const selectedTreatment = allTreatments.find(t => t.id === selected)

  const highConf  = confidence >= 85
  const severity  = highConf ? 'Severe' : confidence >= 70 ? 'Moderate' : 'Mild'
  const sevColor  = highConf ? '#ef4444' : confidence >= 70 ? '#EF9F27' : '#1D9E75'

  // ── Healthy crop screen ─────────────────────────────────────────────────────
  if (healthy) return (
    <div className="page-shell grain flex flex-col items-center justify-center text-center px-8">
      <div className="orb orb-1" />
      <div className="relative z-10 flex flex-col items-center gap-5 anim-1">
        <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
          style={{ background: 'rgba(29,158,117,0.1)', border: '2px solid rgba(29,158,117,0.25)' }}>
          🌿
        </div>
        <div>
          <p className="text-brand-green text-[11px] font-bold uppercase tracking-[0.2em] mb-2">No disease detected</p>
          <p className="font-syne font-extrabold text-2xl text-(--tx) mb-3">Your crop looks healthy!</p>
          <p className="text-sm text-(--tx-sub) leading-relaxed max-w-[260px]">{remedy || 'Keep up the good work with regular watering and weeding.'}</p>
        </div>
        {capturedImage && (
          <div className="w-full max-w-[280px] h-32 rounded-2xl overflow-hidden">
            <img src={capturedImage} alt="Scanned crop" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex flex-col gap-2 w-full max-w-[280px]">
          <button className="btn-main" onClick={() => navigate('/scan')}>🔬 Scan another crop</button>
          <button className="btn-main ghost" onClick={() => navigate('/dashboard')}>← Back to dashboard</button>
        </div>
      </div>
    </div>
  )

  // ── Disease result screen ───────────────────────────────────────────────────
  return (
    <div className="page-shell grain">
      <div className="orb orb-1" />

      <nav className="app-nav">
        <button className="nav-back" onClick={() => navigate('/scan')}>← Back</button>
        <AppLogo />
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
          style={{ background: `${sevColor}20`, color: sevColor, border: `1px solid ${sevColor}40` }}>
          {severity}
        </span>
      </nav>

      <div className="page-body pt-3">

        {/* Captured image */}
        {capturedImage && (
          <div className="h-40 rounded-2xl overflow-hidden mb-4 anim-1 relative">
            <img src={capturedImage} alt="Scanned" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-3 left-4">
              <p className="text-white text-xs font-semibold capitalize">{crop || cropType}</p>
            </div>
          </div>
        )}

        {/* Disease result */}
        <div className="glass-card mb-3 anim-1">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-(--tx-sub) mb-1">
                Disease detected
              </p>
              <h2 className="font-syne font-extrabold text-xl text-(--tx) leading-snug">{disease}</h2>
            </div>
            <div className="text-right shrink-0">
              <p className="font-syne font-extrabold text-2xl" style={{ color: sevColor }}>{confidence}%</p>
              <p className="text-[10px] text-(--tx-sub)">confidence</p>
            </div>
          </div>

          {/* Confidence bar */}
          <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'var(--card-br)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${confidence}%`, background: sevColor }} />
          </div>

          {/* Symptoms */}
          {symptoms.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {symptoms.map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle size={12} className="text-brand-green shrink-0 mt-0.5" />
                  <p className="text-xs text-(--tx-sub) leading-snug">{s}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Remedy / instructions */}
        {remedy && (
          <div className="rounded-2xl px-4 py-3.5 mb-4 anim-2 flex items-start gap-3"
            style={{ background: 'rgba(29,158,117,0.07)', border: '1px solid rgba(29,158,117,0.2)' }}>
            <span className="text-xl shrink-0">💊</span>
            <div>
              <p className="text-sm font-syne font-bold text-(--tx) mb-1">How to treat it</p>
              <p className="text-xs text-(--tx-sub) leading-relaxed">{remedy}</p>
            </div>
          </div>
        )}

        {/* Treatment + Dealer list */}
        {allTreatments.length > 0 ? (
          <div className="anim-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-syne font-bold text-sm text-(--tx)">Available treatments</p>
                <p className="text-[11px] text-(--tx-dim)">{inStock.length} dealer{inStock.length !== 1 ? 's' : ''} in stock · ranked by match</p>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl"
                style={{ background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.15)' }}>
                <Leaf size={10} className="text-brand-green" />
                <span className="text-[10px] text-brand-green font-semibold">AI matched</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 mb-4">
              {displayed.map((t, idx) => {
                const isSel   = selected === t.id
                const match   = getMatchLabel(t.rank)
                const isFirst = idx === 0 && t.rank !== null

                return (
                  <button key={t.id}
                    className="w-full text-left transition-all active:scale-[0.985]"
                    style={{
                      background: isSel ? 'rgba(29,158,117,0.08)' : 'var(--card-bg)',
                      border: isSel ? '1.5px solid rgba(29,158,117,0.4)' : '1px solid var(--card-br)',
                      borderRadius: 20,
                      padding: '14px 16px',
                    }}
                    onClick={() => setSelected(isSel ? null : t.id)}>

                    {/* Match badge + best pick */}
                    <div className="flex items-center gap-2 mb-2">
                      {match && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: match.bg, color: match.color, border: `1px solid ${match.br}` }}>
                          {match.label}
                        </span>
                      )}
                      {isFirst && (
                        <span className="text-[10px] font-semibold text-brand-green">⭐ Top pick</span>
                      )}
                      {t.badge && <span className="text-[10px] text-(--tx-dim)">{t.badge}</span>}
                    </div>

                    {/* Product name + price */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-syne font-bold text-sm text-(--tx) leading-tight">{t.name}</p>
                        {t.active_ingredient && (
                          <p className="text-[11px] text-(--tx-dim) mt-0.5">Active: {t.active_ingredient}</p>
                        )}
                        {t.unit && <p className="text-[11px] text-(--tx-dim)">{t.category} · {t.unit}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-syne font-extrabold text-lg text-brand-green">₦{t.price.toLocaleString()}</p>
                        {t.unit && <p className="text-[10px] text-(--tx-dim)">per {t.unit}</p>}
                      </div>
                    </div>

                    {/* Dealer info */}
                    <div className="flex items-center gap-2 pt-2.5" style={{ borderTop: '1px solid var(--card-br)' }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-syne font-bold text-[10px]"
                        style={{ background: 'rgba(29,158,117,0.1)', color: '#1D9E75', border: '1px solid rgba(29,158,117,0.2)' }}>
                        {(t.dealer_name || 'D').slice(0,2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-(--tx) truncate">{t.dealer_name}</p>
                          <ShieldCheck size={10} className="text-brand-green shrink-0" />
                        </div>
                        <p className="text-[10px] text-(--tx-dim) truncate">
                          {t.dealer_state && `${t.dealer_state} · `}
                          {t.stock_quantity > 0 ? `${t.stock_quantity} in stock` : 'In stock'}
                        </p>
                      </div>
                      {t.rating && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Star size={9} className="fill-brand-amber text-brand-amber" />
                          <span className="text-[10px] text-(--tx-sub)">{t.rating}</span>
                        </div>
                      )}
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${isSel ? 'bg-brand-green' : ''}`}
                        style={{ border: isSel ? 'none' : '1.5px solid var(--card-br)' }}>
                        {isSel && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isSel && (
                      <div className="mt-3 pt-3 flex flex-col gap-2" style={{ borderTop: '1px solid rgba(29,158,117,0.15)' }}>
                        {t.description && (
                          <p className="text-xs text-(--tx-sub) leading-relaxed">{t.description}</p>
                        )}
                        {t.disease_target && (
                          <p className="text-xs text-(--tx-sub)">
                            <span className="text-(--tx) font-medium">Targets:</span> {t.disease_target}
                          </p>
                        )}
                        {t.dealer_address && (
                          <div className="flex items-start gap-1.5">
                            <MapPin size={11} className="text-(--tx-dim) shrink-0 mt-0.5" />
                            <p className="text-xs text-(--tx-sub)">{t.dealer_address}</p>
                          </div>
                        )}
                        {t.dealer_phone && (
                          <a href={`tel:${t.dealer_phone}`}
                            className="flex items-center gap-1.5 text-brand-green text-xs font-semibold">
                            <Phone size={11} /> {t.dealer_phone}
                          </a>
                        )}
                        {t.distance_km && (
                          <p className="text-xs text-(--tx-dim)">📍 {t.distance_km} km away · 🕐 {t.delivery_hours}hr delivery</p>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}

              {/* Show more button */}
              {!showAll && inStock.length > 3 && (
                <button
                  className="w-full py-3 rounded-2xl text-sm font-semibold text-brand-green transition-all active:scale-95"
                  style={{ background: 'rgba(29,158,117,0.06)', border: '1px solid rgba(29,158,117,0.2)' }}
                  onClick={() => setShowAll(true)}>
                  Show {inStock.length - 3} more dealers →
                </button>
              )}

              {/* Out of stock */}
              {outOfStock.length > 0 && (
                <div className="px-4 py-3 rounded-2xl opacity-50" style={{ border: '1px solid var(--card-br)', background: 'var(--card-bg)' }}>
                  <p className="text-xs text-(--tx-dim) flex items-center gap-2">
                    <Package size={12} />
                    Out of stock: {outOfStock.map(t => t.dealer_name || t.name).join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* No treatments found */
          <div className="glass-card text-center py-8 mb-4 anim-3">
            <p className="text-3xl mb-3">🏪</p>
            <p className="font-syne font-bold text-(--tx) text-sm mb-1">No dealers found nearby</p>
            <p className="text-xs text-(--tx-sub) leading-relaxed">
              No verified dealers currently stock a treatment for this disease. Check back soon.
            </p>
          </div>
        )}

        <button className="btn-main ghost mb-2" onClick={() => navigate('/scan')}>
          🔄 Scan another crop
        </button>

        <div className="h-28" />
      </div>

      {/* Sticky buy CTA */}
      {selected && selectedTreatment && (
        <div className="page-cta anim-1">
          <button className="btn-main"
            onClick={() => {
              const productForCart = {
                id:    selectedTreatment.id,
                name:  selectedTreatment.name,
                price: selectedTreatment.price,
                unit:  selectedTreatment.unit,
                description: selectedTreatment.description,
                active_ingredient: selectedTreatment.active_ingredient,
              }
              const dealerForCart = {
                id:             selectedTreatment.id,
                name:           selectedTreatment.dealer_name,
                address:        selectedTreatment.dealer_address,
                phone:          selectedTreatment.dealer_phone,
                rating:         selectedTreatment.rating,
                delivery_hours: selectedTreatment.delivery_hours,
              }
              setCart(productForCart, dealerForCart)
              navigate('/checkout')
            }}>
            Buy from {selectedTreatment.dealer_name} · ₦{(selectedTreatment.price + 500).toLocaleString()} <ChevronRight size={16} />
          </button>
          <p className="cta-note">🔒 Payment held in escrow until you confirm delivery</p>
        </div>
      )}
    </div>
  )
}