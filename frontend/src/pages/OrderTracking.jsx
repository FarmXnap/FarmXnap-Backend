import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AppLogo from '../component/AppLogo'
import PinSheet from '../component/PinSheet'
import {
  Phone, Copy, Check, Home, Shield, Clock, X,
  CheckCircle, AlertTriangle, Upload, Gavel, ChevronDown
} from 'lucide-react'
import { useOrderStore, useToastStore } from '../store'
import { confirmDelivery, fileAppeal, TIMERS } from '../services/api'

const STEPS = [
  { key: 'paid',       icon: '🔒', label: 'Payment in escrow', desc: 'Funds held securely by Interswitch', color: '#1D9E75' },
  { key: 'confirmed',  icon: '📦', label: 'Dealer notified',    desc: 'Dealer is preparing your order',    color: '#1D9E75' },
  { key: 'dispatched', icon: '🚚', label: 'Order dispatched',   desc: 'Treatment is on its way to you',    color: '#EF9F27' },
  { key: 'delivered',  icon: '✅', label: 'Confirm receipt',    desc: 'Releases payment from escrow to dealer', color: '#1D9E75' },
]

const FARMER_APPEAL_CATEGORIES = [
  {
    key: 'not_dispatched',
    emoji: '📭',
    label: 'Order was never shipped',
    desc: 'Dealer has not dispatched my order at all',
    details_placeholder: 'Describe how long you have been waiting and any communication with the dealer…',
    needs_proof: false,
  },
  {
    key: 'no_delivery',
    emoji: '🚫',
    label: 'Product never arrived',
    desc: 'Dealer marked as shipped but nothing came',
    details_placeholder: 'When was it marked dispatched? How long have you been waiting? Any tracking info provided?',
    needs_proof: false,
  },
  {
    key: 'wrong_product',
    emoji: '🔄',
    label: 'Wrong product delivered',
    desc: 'I received something completely different from what I ordered',
    details_placeholder: 'What did you order? What did you receive instead? Describe the difference…',
    needs_proof: true,
  },
  {
    key: 'damaged',
    emoji: '💔',
    label: 'Product arrived damaged',
    desc: 'Item was broken, leaking or unusable when it arrived',
    details_placeholder: 'Describe the damage. Was the packaging also damaged? Did you refuse the delivery?',
    needs_proof: true,
  },
  {
    key: 'expired',
    emoji: '⏰',
    label: 'Product is expired',
    desc: 'The expiry date on the product has already passed',
    details_placeholder: 'What is the expiry date on the product? Did the dealer know about this?',
    needs_proof: true,
  },
  {
    key: 'partial',
    emoji: '📉',
    label: 'Incomplete order',
    desc: 'Only part of what I paid for was delivered',
    details_placeholder: 'What quantity did you order? What was actually delivered? What is missing?',
    needs_proof: true,
  },
  {
    key: 'other',
    emoji: '❓',
    label: 'Other issue',
    desc: 'Something else went wrong with this order',
    details_placeholder: 'Please describe your issue in as much detail as possible so admin can understand your case…',
    needs_proof: false,
  },
]

function useCountdown(targetMs) {
  const [rem, setRem] = useState(() => Math.max(0, targetMs - Date.now()))
  useEffect(() => {
    setRem(Math.max(0, targetMs - Date.now()))
    const id = setInterval(() => setRem(Math.max(0, targetMs - Date.now())), 1000)
    return () => clearInterval(id)
  }, [targetMs])
  const h = String(Math.floor(rem / 3600000)).padStart(2, '0')
  const m = String(Math.floor((rem % 3600000) / 60000)).padStart(2, '0')
  const s = String(Math.floor((rem % 60000) / 1000)).padStart(2, '0')
  return { rem, display: `${h}:${m}:${s}`, expired: rem <= 0 }
}

function BigClock({ display, color = '#EF9F27' }) {
  const [h, m, s] = display.split(':')
  const segs = [{ val: h, label: 'HRS' }, { val: m, label: 'MIN' }, { val: s, label: 'SEC' }]
  return (
    <div className="flex items-end justify-center gap-3">
      {segs.map(({ val, label }, i) => (
        <div key={label} className="flex items-end gap-3">
          <div className="flex flex-col items-center">
            <div className="px-4 py-2.5 rounded-2xl" style={{ background: `${color}18`, border: `1.5px solid ${color}35` }}>
              <span className="font-mono font-black text-3xl leading-none" style={{ color }}>{val}</span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest mt-1" style={{ color: `${color}80` }}>{label}</span>
          </div>
          {i < 2 && <span className="font-black text-2xl pb-5" style={{ color: `${color}40` }}>:</span>}
        </div>
      ))}
    </div>
  )
}

function BottomPopup({ children, onBackdrop }) {
  return (
    <div className="fixed inset-0 flex flex-col justify-end max-w-[430px] mx-auto"
      style={{ background: 'rgba(0,0,0,0.88)', zIndex: 50 }}
      onClick={e => e.target === e.currentTarget && onBackdrop?.()}>
      <div className="rounded-t-[32px] overflow-hidden"
        style={{ background: 'var(--bg-nav)', borderTop: '1px solid var(--card-br)', animation: 'slideUp 0.38s cubic-bezier(0.34,1.4,0.64,1)' }}>
        {children}
      </div>
    </div>
  )
}

function FarmerAppealSheet({ order, total, onSubmit, onClose, isAutoTriggered = false }) {
  const [step,            setStep]            = useState('category')
  const [category,        setCategory]        = useState(null)
  const [contactedDealer, setContactedDealer] = useState(null)
  const [orderCondition,  setOrderCondition]  = useState('')
  const [detailNote,      setDetailNote]      = useState('')
  const [proofFile,       setProofFile]       = useState(null)
  const [proofPreview,    setProofPreview]    = useState(null)
  const [submitting,      setSubmitting]      = useState(false)
  const fileRef = useRef(null)

  const selected = FARMER_APPEAL_CATEGORIES.find(c => c.key === category)

  const handleProof = (e) => {
    const file = e.target.files[0]; if (!file) return
    setProofFile(file)
    const reader = new FileReader()
    reader.onload = () => setProofPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await onSubmit({ category, contacted_dealer: contactedDealer, order_condition: orderCondition, detail_note: detailNote, proof_file: proofFile?.name || null })
    } finally { setSubmitting(false) }
  }

  const conditionOptions = () => {
    if (!selected) return []
    const all = [
      { key: 'completely_wrong',  label: 'Completely wrong — not my order at all' },
      { key: 'damaged_packaging', label: 'Damaged packaging but product inside okay' },
      { key: 'damaged_product',   label: 'Product itself is damaged / leaked / broken' },
      { key: 'expired_product',   label: 'Product is expired or nearly expired' },
      { key: 'missing_quantity',  label: 'Right product but wrong quantity' },
    ]
    if (selected.key === 'wrong_product') return all.filter(o => ['completely_wrong','damaged_packaging'].includes(o.key))
    if (selected.key === 'damaged')       return all.filter(o => ['damaged_packaging','damaged_product'].includes(o.key))
    if (selected.key === 'expired')       return all.filter(o => ['expired_product'].includes(o.key))
    if (selected.key === 'partial')       return all.filter(o => ['missing_quantity'].includes(o.key))
    return []
  }

  return (
    <BottomPopup>
      <div className="sheet-panel" style={{ maxHeight: '94vh' }}>
        <div className="sheet-header">
          <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background:'var(--card-br)' }} />
          <div className="flex items-center justify-between">
            <div>
              {step === 'details' && (
                <button onClick={() => setStep('category')}
                  className="text-xs text-(--tx-sub) mb-1 flex items-center gap-1 bg-transparent border-none cursor-pointer">
                  ← Back
                </button>
              )}
              <h3 className="font-syne font-bold text-lg text-(--tx)">
                {step === 'category' ? 'What went wrong?' : selected?.label}
              </h3>
              <p className="text-xs text-(--tx-sub) mt-0.5">
                {isAutoTriggered
                  ? 'Dispatch window ended. File a dispute so admin can review your case.'
                  : 'Your ₦' + total.toLocaleString() + ' stays frozen until admin resolves this.'}
              </p>
            </div>
            <button onClick={onClose} className="nav-close"><X size={15} /></button>
          </div>
          <div className="flex items-center gap-2 mt-3">
            {['Select issue', 'Add details'].map((label, i) => (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                    style={{
                      background: (i === 0 && step === 'category') || (i === 1 && step === 'details')
                        ? '#1D9E75' : 'var(--card-br)',
                      color: (i === 0 && step === 'category') || (i === 1 && step === 'details') ? 'white' : 'var(--tx-dim)',
                    }}>
                    {i + 1}
                  </div>
                  <span className="text-[10px] font-medium text-(--tx-dim)">{label}</span>
                </div>
                {i < 1 && <div className="flex-1 h-px mx-1" style={{ background:'var(--card-br)' }} />}
              </div>
            ))}
          </div>
        </div>

        <div className="sheet-body pb-4">
          {step === 'category' && (
            <div className="flex flex-col gap-2">
              {FARMER_APPEAL_CATEGORIES.map(cat => (
                <button key={cat.key}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.98]"
                  style={{
                    background: category === cat.key ? 'rgba(239,68,68,0.08)' : 'var(--card-bg)',
                    border: category === cat.key ? '1.5px solid rgba(239,68,68,0.4)' : '1px solid var(--card-br)',
                  }}
                  onClick={() => setCategory(cat.key)}>
                  <span className="text-xl flex-shrink-0">{cat.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold leading-tight ${category === cat.key ? 'text-(--tx)' : 'text-(--tx-sub)'}`}>{cat.label}</p>
                    <p className="text-[11px] text-(--tx-dim) mt-0.5 leading-snug">{cat.desc}</p>
                  </div>
                  <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all"
                    style={{
                      background: category === cat.key ? '#ef4444' : 'transparent',
                      border: category === cat.key ? 'none' : '2px solid var(--tx-dim)',
                    }}>
                    {category === cat.key && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 'details' && selected && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="field-label mb-2">Have you contacted the dealer about this?</p>
                <div className="grid grid-cols-2 gap-2">
                  {[{ key:'yes', label:'Yes, no resolution', emoji:'📞' }, { key:'no', label:"Haven't tried yet", emoji:'🤐' }].map(opt => (
                    <button key={opt.key}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-[0.98]"
                      style={{
                        background: contactedDealer === opt.key ? 'rgba(29,158,117,0.08)' : 'var(--card-bg)',
                        border: contactedDealer === opt.key ? '1.5px solid rgba(29,158,117,0.35)' : '1px solid var(--card-br)',
                      }}
                      onClick={() => setContactedDealer(opt.key)}>
                      <span className="text-lg">{opt.emoji}</span>
                      <span className={`text-xs font-semibold ${contactedDealer === opt.key ? 'text-(--tx)' : 'text-(--tx-sub)'}`}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {conditionOptions().length > 0 && (
                <div>
                  <p className="field-label mb-2">How would you describe what you received?</p>
                  <div className="flex flex-col gap-2">
                    {conditionOptions().map(opt => (
                      <button key={opt.key}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-left transition-all active:scale-[0.98]"
                        style={{
                          background: orderCondition === opt.key ? 'rgba(239,159,39,0.08)' : 'var(--card-bg)',
                          border: orderCondition === opt.key ? '1.5px solid rgba(239,159,39,0.35)' : '1px solid var(--card-br)',
                        }}
                        onClick={() => setOrderCondition(opt.key)}>
                        <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center transition-all"
                          style={{
                            background: orderCondition === opt.key ? '#EF9F27' : 'transparent',
                            border: orderCondition === opt.key ? 'none' : '2px solid var(--tx-dim)',
                          }}>
                          {orderCondition === opt.key && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <p className={`text-sm ${orderCondition === opt.key ? 'text-(--tx) font-semibold' : 'text-(--tx-sub)'}`}>{opt.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="field-label">Describe what happened <span className="text-(--tx-dim)">(required)</span></p>
                <textarea className="field-input resize-none mt-1" rows={4}
                  placeholder={selected.details_placeholder}
                  value={detailNote} onChange={e => setDetailNote(e.target.value)}
                  style={{ WebkitUserSelect:'text', userSelect:'text' }} />
              </div>

              <div>
                <p className="field-label mb-0.5">
                  Upload proof
                  <span className="text-(--tx-dim)"> {selected.needs_proof ? '(strongly recommended)' : '(optional)'}</span>
                </p>
                <p className="text-[11px] text-(--tx-dim) mb-2">
                  Photo of product, delivery receipt, screenshot of chat with dealer — anything that helps your case.
                </p>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleProof} />
                {proofPreview ? (
                  <div className="relative rounded-2xl overflow-hidden" style={{ border:'1px solid var(--card-br)' }}>
                    <img src={proofPreview} alt="Proof" className="w-full h-32 object-cover" />
                    <button className="absolute top-2 right-2 w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background:'rgba(0,0,0,0.65)' }}
                      onClick={() => { setProofFile(null); setProofPreview(null) }}>
                      <X size={14} className="text-white" />
                    </button>
                    <div className="px-3 py-2 flex items-center gap-2">
                      <Check size={12} className="text-brand-green" />
                      <p className="text-xs text-brand-green font-medium truncate">{proofFile?.name}</p>
                    </div>
                  </div>
                ) : (
                  <button className="w-full flex flex-col items-center gap-2 py-5 rounded-2xl transition-all active:scale-[0.98]"
                    style={{ background:'var(--card-bg)', border:'1.5px dashed var(--card-br)' }}
                    onClick={() => fileRef.current?.click()}>
                    <Upload size={20} className="text-(--tx-dim)" />
                    <p className="text-sm font-semibold text-(--tx-sub)">Tap to upload photo, PDF or screenshot</p>
                    <p className="text-xs text-(--tx-dim)">Max 10MB · JPG, PNG, PDF</p>
                  </button>
                )}
              </div>

              <div className="rounded-2xl px-4 py-3"
                style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.15)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color:'#818cf8' }}>What admin will review</p>
                <div className="flex flex-col gap-1">
                  {[
                    'Your selected issue category',
                    'Your detailed description',
                    proofFile ? `Your uploaded proof: ${proofFile.name}` : 'Any proof you upload',
                    "Dealer's dispatch record and response",
                    'Full order history and timestamps',
                  ].map(item => (
                    <div key={item} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background:'#818cf8' }} />
                      <p className="text-[11px] text-(--tx-sub)">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sheet-footer">
          {step === 'category' ? (
            <button className="btn-main w-full"
              style={{ background: category ? 'rgba(239,68,68,0.85)' : undefined }}
              disabled={!category}
              onClick={() => setStep('details')}>
              Continue →
            </button>
          ) : (
            <button className="btn-main w-full"
              style={{ background: detailNote.trim() && !submitting ? 'rgba(239,68,68,0.85)' : undefined }}
              disabled={submitting || !detailNote.trim()}
              onClick={handleSubmit}>
              {submitting
                ? <><span className="spinner" /> Submitting dispute…</>
                : <><AlertTriangle size={14} /> Submit dispute</>}
            </button>
          )}
        </div>
      </div>
    </BottomPopup>
  )
}

export default function OrderTracking() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const showToast = useToastStore(s => s.show)
  const { order: storeOrder, clearOrder } = useOrderStore()
  const order = location.state?.order || storeOrder

  const [step,       setStep]       = useState('confirmed')
  const [confirmed,  setConfirmed]  = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [showPin,    setShowPin]    = useState(false)
  const [copied,     setCopied]     = useState(false)

  const [dispatchDL] = useState(() => Date.now() + TIMERS.DEALER_DISPATCH_MS)
  const [releaseDL,  setReleaseDL]  = useState(() => Date.now() + 999999999)
  const [respondDL,  setRespondDL]  = useState(() => Date.now() + 999999999)

  const [popup,           setPopup]           = useState(null)
  const [farmerResponded, setFarmerResponded] = useState(null)
  const [responding,      setResponding]      = useState(false)

  const [showFarmerAppeal,    setShowFarmerAppeal]    = useState(false)
  const [appealAutoTriggered, setAppealAutoTriggered] = useState(false)
  const [appealDone,          setAppealDone]          = useState(false)

  const dispatchCD = useCountdown(dispatchDL)
  const releaseCD  = useCountdown(releaseDL)
  const respondCD  = useCountdown(respondDL)

  // confirmed → dispatched after 3.5s
  useEffect(() => {
    if (step === 'confirmed') {
      const t = setTimeout(() => {
        setStep('dispatched')
        setReleaseDL(Date.now() + 60 * 1000)
      }, 3500)
      return () => clearTimeout(t)
    }
  }, [step])

  // Dispatch deadline → auto-trigger farmer appeal
  useEffect(() => {
    if (dispatchCD.expired && step === 'confirmed' && !showFarmerAppeal && !appealDone) {
      setAppealAutoTriggered(true)
      setShowFarmerAppeal(true)
    }
  }, [dispatchCD.expired, step])

  // Release deadline → dealer release popup
  useEffect(() => {
    if (releaseCD.expired && step === 'dispatched' && !popup && !farmerResponded && !appealDone) {
      setRespondDL(Date.now() + 60 * 1000)
      setPopup('dealer_release')
    }
  }, [releaseCD.expired, step])

  // Farmer didn't respond to dealer release → escalate to admin
  useEffect(() => {
    if (respondCD.expired && popup === 'dealer_release' && !farmerResponded) {
      setPopup('admin_escalated')
    }
  }, [respondCD.expired, popup])

  if (!order) { navigate('/dashboard'); return null }

  const productPrice = order.item?.price || order.amount || 0
  const deliveryFee  = 500
  const platformFee  = Math.round(productPrice * 0.04)
  const total        = productPrice + deliveryFee + platformFee
  const dealerNet    = productPrice + deliveryFee
  const stepIdx      = STEPS.findIndex(s => s.key === step)

  const handleConfirm = async (pin) => {
    setConfirming(true)
    try {
      await confirmDelivery(order.id, pin)
      setConfirmed(true); setPopup(null)
      showToast('Delivery confirmed! Payment released to dealer.', 'success')
    } catch (e) {
      showToast(e.message || 'Confirmation failed.', 'error')
    } finally { setConfirming(false) }
  }

  const handleFarmerAppealSubmit = async (data) => {
    await fileAppeal(order.id, data)
    setAppealDone(true)
    setShowFarmerAppeal(false)
    setPopup('admin_escalated')
    showToast('Dispute submitted — admin will now review.', 'info')
  }

  const handleFarmerResponse = (action) => {
    setResponding(true)
    setTimeout(() => {
      setFarmerResponded(action)
      setResponding(false)
      if (action === 'confirmed') {
        setPopup(null); setConfirmed(true)
        showToast('Delivery confirmed! Payment released to dealer.', 'success')
      } else {
        setAppealAutoTriggered(false)
        setShowFarmerAppeal(true)
        setPopup(null)
      }
    }, 600)
  }

  const copyRef = () => {
    navigator.clipboard?.writeText(order.reference)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  if (confirmed) return (
    <div className="page-shell grain flex flex-col items-center justify-center text-center px-8">
      <div className="orb orb-1" />
      <div className="relative z-10 flex flex-col items-center gap-5 anim-1">
        <div className="relative">
          <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
            style={{ background:'rgba(29,158,117,0.1)', border:'2px solid rgba(29,158,117,0.25)' }}>✅</div>
          <div className="absolute inset-0 rounded-full"
            style={{ border:'2px solid rgba(29,158,117,0.15)', animation:'scan-pulse 2s ease-in-out infinite' }} />
        </div>
        <div>
          <p className="text-brand-green text-[11px] font-bold uppercase tracking-[0.2em] mb-2">Escrow released</p>
          <p className="font-syne font-extrabold text-2xl text-(--tx) mb-3">Delivery confirmed!</p>
          <p className="text-sm text-(--tx-sub) max-w-[260px] leading-relaxed">
            Interswitch released <span className="text-(--tx) font-semibold">₦{dealerNet.toLocaleString()}</span> to{' '}
            <span className="text-(--tx) font-semibold">{order.dealer?.name}</span>
          </p>
        </div>
        <div className="w-full max-w-[300px] glass-card">
          {[
            { label:'Total paid',         val:`₦${total.toLocaleString()}`,       color:'text-(--tx)'     },
            { label:'Released to dealer', val:`₦${dealerNet.toLocaleString()}`,   color:'text-brand-green'},
            { label:'Platform fee (4%)',  val:`₦${platformFee.toLocaleString()}`,  color:'text-(--tx-sub)' },
          ].map(({ label, val, color }) => (
            <div key={label} className="flex justify-between items-center mb-2.5 last:mb-0">
              <span className="text-xs text-(--tx-sub)">{label}</span>
              <span className={`text-sm font-semibold ${color}`}>{val}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 w-full max-w-[300px]">
          <button className="btn-main" onClick={() => { clearOrder(); navigate('/dashboard') }}>
            <Home size={16} /> Back to dashboard
          </button>
          <button className="btn-main ghost" onClick={() => navigate('/scan')}>🔬 Scan another crop</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="page-shell grain">
      <div className="orb orb-1" />

      <nav className="app-nav">
        <AppLogo />
        <span className="text-xs text-(--tx-sub) font-medium">Order tracking</span>
        <button className="text-xs text-(--tx-sub) underline underline-offset-2 bg-transparent border-none cursor-pointer font-dm"
          onClick={() => { clearOrder(); navigate('/dashboard') }}>Dashboard</button>
      </nav>

      <div className="page-body pt-4">

        <div className="flex items-center justify-between mb-4 anim-1">
          <button onClick={copyRef} className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer">
            <span className="font-mono text-xs text-(--tx-sub)">{order.reference}</span>
            {copied ? <Check size={11} className="text-brand-green" /> : <Copy size={11} className="text-(--tx-dim)" />}
          </button>
          <span className={`badge text-[10px] ${appealDone ? 'amber' : 'green'}`}>
            <Shield size={9} /> {appealDone ? 'Under review' : 'Escrow active'}
          </span>
        </div>

        <div className="glass-card mb-4 anim-1" style={{
          background: appealDone ? 'rgba(239,159,39,0.06)' : step === 'dispatched' ? 'rgba(239,159,39,0.06)' : 'rgba(29,158,117,0.06)',
          border: `1px solid ${appealDone ? 'rgba(239,159,39,0.25)' : step === 'dispatched' ? 'rgba(239,159,39,0.25)' : 'rgba(29,158,117,0.25)'}`,
        }}>
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">{appealDone ? '⚖️' : step === 'dispatched' ? '🚚' : '🔒'}</span>
            <div className="flex-1">
              <p className="font-syne font-bold text-sm text-(--tx) mb-1">
                {appealDone ? 'Dispute under admin review' : step === 'dispatched' ? 'Order is on its way' : 'Escrow active — funds locked'}
              </p>
              <p className="text-xs text-(--tx-sub) leading-relaxed">
                {appealDone
                  ? 'Admin will review both sides and make the final decision. Your money is frozen.'
                  : step === 'dispatched'
                    ? `Confirm receipt to release ₦${dealerNet.toLocaleString()} to ${order.dealer?.name}`
                    : `₦${total.toLocaleString()} held safely by Interswitch`}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card flex items-center gap-3 mb-4 anim-2">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-brand-green/10 border border-brand-green/20">
            <span className="font-syne font-extrabold text-sm text-brand-green">
              {order.dealer?.name?.slice(0,2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-syne font-bold text-sm text-(--tx)">{order.dealer?.name}</p>
            <p className="text-xs text-(--tx-sub) truncate">{order.dealer?.address}</p>
          </div>
          <a href={`tel:${order.dealer?.phone}`}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-brand-green/10 border border-brand-green/20">
            <Phone size={14} className="text-brand-green" />
          </a>
        </div>

        <div className="glass-card mb-4 anim-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-(--tx-sub) mb-3">Payment breakdown</p>
          {[
            { label: order.item?.name || 'Treatment', val: `₦${productPrice.toLocaleString()}` },
            { label: 'Delivery + platform fee',       val: `₦${(deliveryFee + platformFee).toLocaleString()}` },
          ].map(({ label, val }) => (
            <div key={label} className="flex justify-between mb-2">
              <span className="text-xs text-(--tx-sub)">{label}</span>
              <span className="text-xs text-(--tx)">{val}</span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2.5 border-t border-(--card-br)">
            <span className="font-syne font-bold text-sm text-(--tx)">Total in escrow</span>
            <span className="font-syne font-extrabold text-lg text-brand-green">₦{total.toLocaleString()}</span>
          </div>
        </div>

        <div className="glass-card mb-4 anim-3">
          <p className="font-syne font-bold text-sm text-(--tx) mb-4">Order progress</p>
          <div className="timeline">
            {STEPS.map((s, i) => {
              const isDone = i < stepIdx; const isActive = i === stepIdx; const isWait = i > stepIdx
              return (
                <div key={s.key} className="timeline-step">
                  <div className={`timeline-dot ${isDone ? 'done' : isActive ? 'active' : 'wait'}`}>
                    {isDone ? '✓' : s.icon}
                  </div>
                  <div className="pt-0.5 flex-1">
                    <p className={`font-syne font-bold text-sm mb-0.5 ${isWait ? 'text-(--tx-sub)' : 'text-(--tx)'}`}>{s.label}</p>
                    <p className="text-xs text-(--tx-sub) leading-snug">{s.desc}</p>
                    {isActive && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color, animation:'pulse-dot 1.8s ease-in-out infinite' }} />
                        <span className="text-xs font-medium" style={{ color: s.color }}>In progress</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Countdown — dispatch window */}
        {(step === 'confirmed' || step === 'paid') && !dispatchCD.expired && !appealDone && (
          <div className="glass-card mb-4 anim-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={13} className="text-brand-amber" />
              <p className="text-xs font-semibold text-(--tx)">Dealer dispatch window</p>
            </div>
            <BigClock display={dispatchCD.display} color="#EF9F27" />
            <p className="text-xs text-(--tx-dim) text-center mt-4">
              If dealer misses this window, you can open a dispute and admin will decide.
            </p>
          </div>
        )}

        {/* Countdown — confirm window */}
        {step === 'dispatched' && !releaseCD.expired && !popup && !appealDone && (
          <div className="glass-card mb-4 anim-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={13} className="text-brand-green" />
              <p className="text-xs font-semibold text-(--tx)">Confirm delivery window</p>
            </div>
            <BigClock display={releaseCD.display} color="#1D9E75" />
            <p className="text-xs text-(--tx-dim) text-center mt-4">
              Tap "I've received my treatment" once your order arrives.
            </p>
          </div>
        )}

        {/* Report problem — available anytime after dispatch */}
        {step === 'dispatched' && !appealDone && !popup && (
          <button className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl mb-4 transition-all active:scale-[0.98]"
            style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', color:'#f87171' }}
            onClick={() => { setAppealAutoTriggered(false); setShowFarmerAppeal(true) }}>
            <AlertTriangle size={13} />
            <span className="text-sm font-semibold">Report a problem with this order</span>
          </button>
        )}

        {/* Appeal submitted state */}
        {appealDone && (
          <div className="rounded-2xl px-4 py-4 mb-4 anim-1 flex items-start gap-3"
            style={{ background:'rgba(99,102,241,0.07)', border:'1.5px solid rgba(99,102,241,0.2)' }}>
            <Gavel size={18} style={{ color:'#818cf8' }} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-syne font-bold text-(--tx) mb-1">Dispute submitted</p>
              <p className="text-xs text-(--tx-sub) leading-relaxed">
                Admin is reviewing your case. Your ₦{total.toLocaleString()} is frozen in escrow until a decision is made. Expected: 24–48hrs.
              </p>
            </div>
          </div>
        )}

        <div className="h-2" />
      </div>

      {/* CTA */}
      <div className="page-cta">
        {appealDone ? (
          <div className="w-full px-4 py-3 rounded-2xl flex items-center gap-3"
            style={{ background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)' }}>
            <Gavel size={16} style={{ color:'#818cf8' }} className="flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-syne font-bold text-(--tx)">Awaiting admin judgment</p>
              <p className="text-xs text-(--tx-sub)">Escrow frozen — nothing moves without admin decision</p>
            </div>
          </div>
        ) : step === 'dispatched' && !popup ? (
          <>
            <button className="btn-main" onClick={() => setShowPin(true)} disabled={confirming}>
              {confirming ? <><span className="spinner" /> Confirming…</> : <><CheckCircle size={16} /> I've received my treatment</>}
            </button>
            <p className="cta-note">Your PIN releases ₦{dealerNet.toLocaleString()} from escrow to dealer</p>
          </>
        ) : (
          <div className="flex items-center justify-center gap-2.5 py-2">
            <span className="w-2 h-2 rounded-full bg-brand-amber" style={{ animation:'pulse-dot 1.8s ease-in-out infinite' }} />
            <p className="text-sm text-(--tx-sub)">Waiting for dealer to dispatch…</p>
          </div>
        )}
      </div>

      <PinSheet
        open={showPin}
        title="Confirm delivery"
        subtitle={`Release ₦${dealerNet.toLocaleString()} from escrow to ${order.dealer?.name}`}
        onSuccess={handleConfirm}
        onClose={() => setShowPin(false)}
      />

      {/* Farmer Appeal Sheet */}
      {showFarmerAppeal && (
        <FarmerAppealSheet
          order={order}
          total={total}
          onSubmit={handleFarmerAppealSubmit}
          onClose={() => { if (!appealAutoTriggered) setShowFarmerAppeal(false) }}
          isAutoTriggered={appealAutoTriggered}
        />
      )}

      {/* POPUP: Dealer Release Request */}
      {popup === 'dealer_release' && !farmerResponded && (
        <BottomPopup>
          <div className="px-5 pt-5 pb-2">
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background:'var(--card-br)' }} />
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background:'rgba(239,159,39,0.12)', border:'1.5px solid rgba(239,159,39,0.25)' }}>
                <span className="text-2xl">📢</span>
              </div>
              <div className="flex-1">
                <p className="font-syne font-extrabold text-lg text-(--tx) leading-tight">Dealer requesting payment release</p>
                <p className="text-xs text-(--tx-sub) mt-1">Dealer says your order was delivered and wants escrow released.</p>
              </div>
            </div>
            <div className="rounded-2xl px-4 py-3 mb-4" style={{ background:'var(--card-bg)', border:'1px solid var(--card-br)' }}>
              <p className="text-[10px] uppercase tracking-widest text-(--tx-dim) mb-1">Dealer note</p>
              <p className="text-xs text-(--tx-sub) italic">"Order was delivered. Please confirm receipt so I can receive payment."</p>
            </div>
            <div className="rounded-2xl px-4 py-4 mb-4" style={{ background:'rgba(239,159,39,0.06)', border:'1px solid rgba(239,159,39,0.2)' }}>
              <p className="text-[10px] uppercase tracking-widest text-(--tx-dim) text-center mb-3">Respond within</p>
              <BigClock display={respondCD.display} color="#EF9F27" />
              <p className="text-[11px] text-(--tx-dim) text-center mt-3">No response = escalates to admin. No money moves without a decision.</p>
            </div>
            <div className="flex items-center justify-between px-4 py-3 rounded-2xl mb-2"
              style={{ background:'rgba(29,158,117,0.07)', border:'1px solid rgba(29,158,117,0.15)' }}>
              <p className="text-xs text-(--tx-sub)">Amount in escrow</p>
              <p className="font-syne font-extrabold text-lg text-brand-green">₦{total.toLocaleString()}</p>
            </div>
          </div>
          <div className="px-5 pb-6 pt-3 flex flex-col gap-2" style={{ borderTop:'1px solid var(--card-br)', background:'var(--bg-nav)' }}>
            <div className="grid grid-cols-2 gap-2">
              <button className="py-3.5 rounded-2xl font-syne font-bold text-sm text-white flex items-center justify-center gap-2 active:scale-95 transition-all"
                style={{ background:'#1D9E75' }} disabled={responding}
                onClick={() => handleFarmerResponse('confirmed')}>
                {responding ? <span className="spinner" /> : <Check size={15} />} I received it
              </button>
              <button className="py-3.5 rounded-2xl font-syne font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                style={{ background:'rgba(239,68,68,0.1)', color:'#f87171', border:'1px solid rgba(239,68,68,0.25)' }}
                disabled={responding}
                onClick={() => handleFarmerResponse('disputed')}>
                <X size={15} /> I didn't
              </button>
            </div>
            <p className="text-[11px] text-(--tx-dim) text-center">
              "I didn't" opens a dispute form — admin will review both sides
            </p>
          </div>
        </BottomPopup>
      )}

      {/* POPUP: Admin Escalated */}
      {popup === 'admin_escalated' && (
        <BottomPopup>
          <div className="px-5 pt-5 pb-2">
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background:'var(--card-br)' }} />
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background:'rgba(99,102,241,0.12)', border:'1.5px solid rgba(99,102,241,0.25)' }}>
                <Gavel size={28} style={{ color:'#818cf8' }} />
              </div>
              <p className="font-syne font-extrabold text-xl text-(--tx) mb-2">Under Admin Review</p>
              <p className="text-sm text-(--tx-sub) leading-relaxed max-w-70">
                Escalated to FarmXnap admin. Both parties notified. Your ₦{total.toLocaleString()} is frozen.
              </p>
            </div>
            <div className="flex flex-col gap-2 mb-4">
              {[
                { icon:'🔒', title:'Escrow frozen',      desc:'₦' + total.toLocaleString() + ' stays locked — nobody can touch it' },
                { icon:'🔍', title:'Admin investigates', desc:'Reviews order timeline, dealer evidence and your dispute' },
                { icon:'⚖️', title:'Final judgment',     desc:'Admin decides: full refund to you OR release to dealer' },
                { icon:'📬', title:'Both notified',      desc:'Decision delivered within 24–48 hours' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3 px-4 py-3 rounded-2xl"
                  style={{ background:'var(--card-bg)', border:'1px solid var(--card-br)' }}>
                  <span className="text-lg flex-shrink-0">{icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-(--tx) leading-tight">{title}</p>
                    <p className="text-[11px] text-(--tx-dim) mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl"
              style={{ background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)' }}>
              <Shield size={12} style={{ color:'#818cf8' }} />
              <p className="text-xs font-semibold" style={{ color:'#818cf8' }}>Escrow frozen · Admin has final say · No auto-release</p>
            </div>
          </div>
          <div className="px-5 pb-6 pt-3" style={{ borderTop:'1px solid var(--card-br)', background:'var(--bg-nav)' }}>
            <button className="btn-main ghost w-full" onClick={() => { clearOrder(); navigate('/dashboard') }}>
              <Home size={16} /> Back to dashboard
            </button>
          </div>
        </BottomPopup>
      )}

    </div>
  )
}