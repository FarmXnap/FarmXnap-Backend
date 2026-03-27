import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLogo from '../component/AppLogo'
import { Lock, Shield, Clock, CheckCircle, ChevronRight } from 'lucide-react'
import { useCartStore, useOrderStore, useAuthStore, useWalletStore } from '../store'
import { createOrder, TIMERS } from '../services/api'

// ── Interswitch Credentials ────────────────────────────────────────────────
// TEST script:  https://newwebpay.qa.interswitchng.com/inline-checkout.js
// LIVE script:  https://newwebpay.interswitchng.com/inline-checkout.js
const ISW = {
  merchantCode: 'MX6072',
  payItemId:    '9405967',
  mode:         'TEST',
  scriptUrl:    'https://newwebpay.qa.interswitchng.com/inline-checkout.js',
}

export default function Checkout() {
  const navigate  = useNavigate()
  const { item, dealer, clearCart } = useCartStore()
  const setOrder  = useOrderStore(s => s.setOrder)
  const user      = useAuthStore(s => s.user)
  const { balance: walletBalance, deduct: walletDeduct } = useWalletStore()

  const [step,       setStep]       = useState('review')  // review | paying | escrow_locked
  const [error,      setError]      = useState('')
  const [txRef,      setTxRef]      = useState('')
  const [payMethod,  setPayMethod]  = useState('interswitch') // 'interswitch' | 'wallet'
  const scriptLoaded = useRef(false)

  // Guard: redirect in effect, not during render
  useEffect(() => {
    if (!item || !dealer) navigate('/results')
  }, [])

  // Load Interswitch inline checkout script
  useEffect(() => {
    if (document.getElementById('isw-inline')) {
      scriptLoaded.current = true
      return
    }
    const script   = document.createElement('script')
    script.id      = 'isw-inline'
    script.src     = ISW.scriptUrl
    script.async   = true
    script.onload  = () => { scriptLoaded.current = true; console.log('[Interswitch] Script loaded') }
    script.onerror = () => console.error('[Interswitch] Failed to load:', ISW.scriptUrl)
    document.body.appendChild(script)
  }, [])

  // All hooks are above this line — safe to early return now
  if (!item || !dealer) return null

  const productPrice = item.price || 0
  const deliveryFee  = 500
  const platformFee  = Math.round(productPrice * 0.04)
  const total        = productPrice + deliveryFee + platformFee
  const dealerNet    = productPrice + deliveryFee
  const totalKobo    = total * 100

  const generateRef = () =>
    'FXNAP-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase()

  const handleWalletPay = async () => {
    setError('')
    if (walletBalance < total) {
      setError(`Insufficient wallet balance. You have ₦${walletBalance.toLocaleString()} but need ₦${total.toLocaleString()}.`)
      return
    }
    setStep('paying')
    try {
      const ref = generateRef()
      setTxRef(ref)
      const { order } = await createOrder({
        item, dealer,
        payment_method: 'wallet',
        tx_ref: ref,
      })
      walletDeduct(total, `${item.name} — ${dealer.name}`, ref)
      setOrder(order)
      clearCart()
      setStep('escrow_locked')
      setTimeout(() => navigate('/order-tracking', { state: { order } }), 2800)
    } catch (e) {
      setStep('review')
      setError(e.message || 'Payment failed. Please try again.')
    }
  }

  const handlePay = async () => {
    setError('')

    // Wait up to 5s for script to load
    const getCheckout = () => new Promise((resolve, reject) => {
      if (typeof window.webpayCheckout === 'function') return resolve(window.webpayCheckout)
      let attempts = 0
      const poll = setInterval(() => {
        attempts++
        if (typeof window.webpayCheckout === 'function') {
          clearInterval(poll)
          resolve(window.webpayCheckout)
        } else if (attempts >= 50) { // 50 × 100ms = 5s
          clearInterval(poll)
          reject(new Error('Payment gateway not ready. Please refresh and try again.'))
        }
      }, 100)
    })

    setStep('paying')
    const webpayCheckout = await getCheckout().catch(e => {
      setStep('review')
      setError(e.message)
      return null
    })
    if (!webpayCheckout) return

    const ref = generateRef()
    setTxRef(ref)

    webpayCheckout({
      merchant_code:     ISW.merchantCode,
      pay_item_id:       ISW.payItemId,
      pay_item_name:     `${item.name || 'Treatment'} — FarmXnap`,
      txn_ref:           ref,
      amount:            totalKobo,
      currency:          566,          // NGN ISO 4217
      cust_id:           user?.id || 'guest',
      cust_name:         user?.name || user?.full_name || 'FarmXnap Farmer',
      cust_email:        user?.email || 'farmer@farmxnap.com',
      cust_mobile_no:    user?.phone || '08000000000',
      site_redirect_url: window.location.origin + '/checkout',
      mode:              ISW.mode,
      onComplete: async (response) => {
        console.log('[Interswitch] onComplete:', response)
        const code = response?.resp || response?.responseCode || ''

        if (code === '00') {
          // Payment approved — create order and lock escrow
          setStep('escrow_locked')
          try {
            const { order } = await createOrder({
              item, dealer,
              payment_method:  'interswitch',
              tx_ref:          ref,
              interswitch_ref: response.txRef || response.transRef || ref,
            })
            setOrder(order)
            clearCart()
            setTimeout(() => navigate('/order-tracking', { state: { order } }), 2800)
          } catch (e) {
            setStep('review')
            setError('Order creation failed. Contact support with ref: ' + ref)
          }
        } else if (code === '01') {
          setStep('review')
          setError('Payment was cancelled.')
        } else if (code) {
          setStep('review')
          setError(`Payment failed (code: ${code}). Please try again.`)
        } else {
          // Modal closed without completing — don't show error
          setStep('review')
        }
      },
      onError: (err) => {
        console.error('[Interswitch] onError:', err)
        setStep('review')
        setError('A payment error occurred. Please try again.')
      },
    })
  }

  // ── Escrow locked screen ───────────────────────────────────────────────────
  if (step === 'escrow_locked') return (
    <div className="page-shell grain flex flex-col items-center justify-center text-center px-8">
      <div className="orb orb-1" />
      <div className="relative z-10 flex flex-col items-center gap-5 anim-1">
        <div className="relative">
          <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
            style={{ background: 'rgba(29,158,117,0.1)', border: '2px solid rgba(29,158,117,0.25)' }}>🔒</div>
          <div className="absolute inset-0 rounded-full"
            style={{ border: '2px solid rgba(29,158,117,0.2)', animation: 'scan-pulse 2s ease-in-out infinite' }} />
        </div>
        <div>
          <p className="text-brand-green text-[11px] font-bold uppercase tracking-[0.2em] mb-2">Escrow locked</p>
          <p className="font-syne font-extrabold text-2xl text-(--tx) mb-2">Payment secured!</p>
          <p className="text-sm text-(--tx-sub) leading-relaxed max-w-[260px]">
            <span className="text-(--tx) font-semibold">₦{total.toLocaleString()}</span> is safely held in FarmXnap Escrow.
            <br />Released only after you confirm delivery.
          </p>
        </div>
        {txRef && (
          <div className="px-3 py-1.5 rounded-xl" style={{ background:'var(--card-bg)', border:'1px solid var(--card-br)' }}>
            <p className="text-[10px] text-(--tx-dim) font-mono">{txRef}</p>
          </div>
        )}
        <div className="w-full max-w-[300px] flex flex-col gap-2">
          {[
            { icon: '📦', title: 'Dealer notified',     desc: 'They prepare your order'                },
            { icon: '🚚', title: 'Delivery dispatched', desc: "You're notified when it ships"          },
            { icon: '✅', title: 'You confirm receipt', desc: 'FarmXnap Escrow releases payment to dealer' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 px-3 py-2.5 rounded-xl text-left"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-br)' }}>
              <span className="text-base shrink-0">{icon}</span>
              <div>
                <p className="text-xs font-semibold text-(--tx)">{title}</p>
                <p className="text-[11px] text-(--tx-sub) mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-(--tx-dim) flex items-center gap-1.5">
          <span className="spinner" style={{ width:10, height:10, borderWidth:1.5 }} />
          Taking you to order tracking…
        </p>
      </div>
    </div>
  )

  // ── Main checkout ──────────────────────────────────────────────────────────
  return (
    <div className="page-shell grain">
      <div className="orb orb-1" />

      <nav className="app-nav">
        <button className="nav-back" onClick={() => navigate(-1)}>← Back</button>
        <AppLogo />
        <div className="nav-badge"><Lock size={11} /> Secured</div>
      </nav>

      <div className="page-body pt-4">

        {/* Escrow explainer */}
        <div className="glass-card mb-4 anim-1"
          style={{ background:'rgba(29,158,117,0.06)', border:'1px solid rgba(29,158,117,0.2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Shield size={15} className="text-brand-green shrink-0" />
            <p className="font-syne font-bold text-sm text-(--tx)">How your payment is protected</p>
          </div>
          <div className="flex items-center text-[11px] text-(--tx-sub)">
            {[
              { icon:'💳', label:'You pay'  },
              { icon:'→',  label:null        },
              { icon:'🔒', label:'Escrow'   },
              { icon:'→',  label:null        },
              { icon:'✅', label:'Confirm'  },
              { icon:'→',  label:null        },
              { icon:'🏪', label:'Dealer'   },
            ].map(({ icon, label }, i) => (
              label !== null
                ? <div key={i} className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-base">{icon}</span>
                    <span className="text-center leading-tight">{label}</span>
                  </div>
                : <span key={i} className="text-brand-green/40 font-bold text-base shrink-0">›</span>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-(--card-br) flex items-start gap-2">
            <Clock size={11} className="text-brand-amber shrink-0 mt-0.5" />
            <p className="text-[11px] text-(--tx-sub) leading-relaxed">
              Auto-refund if dealer doesn't dispatch in <span className="text-(--tx) font-medium">{TIMERS.LABEL_DISPATCH}</span>.
              Auto-release if you don't confirm within <span className="text-(--tx) font-medium">{TIMERS.LABEL_CONFIRM}</span>.
            </p>
          </div>
        </div>

        {/* Dealer */}
        <div className="glass-card flex items-center gap-3 mb-3 anim-1">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-brand-green/10 border border-brand-green/20">
            <span className="font-syne font-extrabold text-sm text-brand-green">
              {dealer.name?.slice(0,2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-syne font-bold text-sm text-(--tx)">{dealer.name}</p>
            <p className="text-xs text-(--tx-sub) truncate">{dealer.address}</p>
          </div>
        </div>

        {/* Order summary */}
        <div className="glass-card mb-4 anim-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-(--tx-sub) mb-3">Order summary</p>
          {[
            { label: item.name || 'Treatment product', val: `₦${productPrice.toLocaleString()}` },
            { label: 'Delivery fee',                   val: `₦${deliveryFee.toLocaleString()}`  },
            { label: 'Platform fee (4%)',              val: `₦${platformFee.toLocaleString()}`  },
          ].map(({ label, val }) => (
            <div key={label} className="flex justify-between items-center mb-2.5">
              <span className="text-sm text-(--tx-sub)">{label}</span>
              <span className="text-sm text-(--tx)">{val}</span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-3 border-t border-(--card-br) mb-1">
            <span className="font-syne font-bold text-sm text-(--tx)">Total (escrow)</span>
            <span className="font-syne font-extrabold text-xl text-brand-green">₦{total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-(--tx-dim)">Dealer receives after confirmation</span>
            <span className="text-[11px] text-brand-green font-medium">₦{dealerNet.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment method selector */}
        <div className="glass-card mb-4 anim-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-(--tx-sub) mb-3">Choose payment method</p>
          <div className="flex flex-col gap-2">
            {/* Wallet option */}
            <button
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.98]"
              style={{
                background: payMethod === 'wallet' ? 'rgba(29,158,117,0.08)' : 'var(--card-bg)',
                border: payMethod === 'wallet' ? '1.5px solid rgba(29,158,117,0.4)' : '1px solid var(--card-br)',
              }}
              onClick={() => setPayMethod('wallet')}>
              <span className="text-xl shrink-0">💰</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold leading-tight ${payMethod === 'wallet' ? 'text-(--tx)' : 'text-(--tx-sub)'}`}>
                  FarmXnap Wallet
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: walletBalance >= total ? '#1D9E75' : '#ef4444' }}>
                  {walletBalance >= total
                    ? `Balance: ₦${walletBalance.toLocaleString()} ✓ Sufficient`
                    : `Balance: ₦${walletBalance.toLocaleString()} — Insufficient`}
                </p>
              </div>
              <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center transition-all"
                style={{
                  background: payMethod === 'wallet' ? '#1D9E75' : 'transparent',
                  border: payMethod === 'wallet' ? 'none' : '2px solid var(--tx-dim)',
                }}>
                {payMethod === 'wallet' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>

            {/* Interswitch option */}
            <button
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.98]"
              style={{
                background: payMethod === 'interswitch' ? 'rgba(29,158,117,0.08)' : 'var(--card-bg)',
                border: payMethod === 'interswitch' ? '1.5px solid rgba(29,158,117,0.4)' : '1px solid var(--card-br)',
              }}
              onClick={() => setPayMethod('interswitch')}>
              <span className="text-xl shrink-0">💳</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold leading-tight ${payMethod === 'interswitch' ? 'text-(--tx)' : 'text-(--tx-sub)'}`}>
                  Interswitch
                </p>
                <p className="text-[11px] text-(--tx-dim) mt-0.5">Card · Bank transfer · USSD · Mobile money</p>
              </div>
              <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center transition-all"
                style={{
                  background: payMethod === 'interswitch' ? '#1D9E75' : 'transparent',
                  border: payMethod === 'interswitch' ? 'none' : '2px solid var(--tx-dim)',
                }}>
                {payMethod === 'interswitch' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>
          </div>

          {/* Low wallet balance nudge */}
          {payMethod === 'wallet' && walletBalance < total && (
            <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-2xl"
              style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <span className="text-sm shrink-0">⚠️</span>
              <p className="text-xs text-(--tx-sub) leading-relaxed">
                You need ₦{(total - walletBalance).toLocaleString()} more.{' '}
                <button className="text-brand-green font-semibold underline underline-offset-2 bg-transparent border-none cursor-pointer"
                  onClick={() => navigate('/wallet')}>
                  Top up wallet →
                </button>
              </p>
            </div>
          )}
        </div>

        {/* TEST mode notice (only for Interswitch) */}
        {payMethod === 'interswitch' && (
        <div className="rounded-2xl px-4 py-3 mb-4 anim-2"
          style={{ background:'rgba(239,159,39,0.07)', border:'1px solid rgba(239,159,39,0.2)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">🧪</span>
            <p className="text-xs font-syne font-bold text-brand-amber">Test mode — no real charges</p>
          </div>
          <div className="flex flex-col gap-1.5">
            {[
              { brand:'Verve',      pan:'5061 0502 5475 6707 864', expiry:'06/26', cvv:'111', pin:'1111', otp:'—',    result:'✅ Success'  },
              { brand:'Mastercard', pan:'5123 4500 0000 0008',     expiry:'01/39', cvv:'100', pin:'1111', otp:'123456',result:'✅ Success'  },
              { brand:'VISA',       pan:'4000 0000 0000 2503',     expiry:'03/50', cvv:'11',  pin:'1111', otp:'—',    result:'✅ Success'  },
            ].map(({ brand, pan, expiry, cvv, pin, otp, result }) => (
              <div key={brand} className="rounded-xl px-3 py-2"
                style={{ background:'rgba(0,0,0,0.2)', border:'1px solid var(--card-br)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-(--tx)">{brand}</span>
                  <span className="text-[10px] text-brand-green">{result}</span>
                </div>
                <p className="text-[11px] font-mono text-(--tx-sub)">
                  {pan} · {expiry} · CVV: {cvv} · PIN: {pin}{otp !== '—' ? ` · OTP: ${otp}` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
        )}

        {error && (
          <div className="err-banner mb-4 anim-1"><span>⚠</span> {error}</div>
        )}

        <p className="text-center text-xs text-(--tx-dim) mb-4 flex items-center justify-center gap-1.5">
          <Lock size={11} /> {payMethod === 'wallet' ? '💰 FarmXnap Wallet · Instant deduction' : 'Payment via Interswitch · Held in FarmXnap Escrow'}
        </p>

        <div className="h-24" />
      </div>

      {/* CTA */}
      <div className="page-cta">
        {payMethod === 'wallet' ? (
          <button className="btn-main" onClick={handleWalletPay}
            disabled={step === 'paying' || walletBalance < total}>
            {step === 'paying'
              ? <><span className="spinner" /> Processing…</>
              : <><span>💰</span> Pay ₦{total.toLocaleString()} from Wallet <ChevronRight size={15} /></>
            }
          </button>
        ) : (
          <button className="btn-main" onClick={handlePay} disabled={step === 'paying'}>
            {step === 'paying'
              ? <><span className="spinner" /> Opening payment…</>
              : <><Lock size={15} /> Pay ₦{total.toLocaleString()} via Interswitch <ChevronRight size={15} /></>
            }
          </button>
        )}
        <p className="cta-note">🔒 Held in FarmXnap Escrow · Released when you confirm delivery</p>
      </div>
    </div>
  )
}