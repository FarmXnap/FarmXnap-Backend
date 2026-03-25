import { useNavigate } from 'react-router-dom'
import AppLogo from '../component/AppLogo'
import { useAuthStore } from '../store'
import { useEffect, useState } from 'react'

function ScanLine() {
  return (
    <div className="landing-scan-beam-wrap">
      <div className="landing-scan-beam" />
    </div>
  )
}

function Step({ num, text }) {
  return (
    <div className="landing-step">
      <div className="landing-step-num">{num}</div>
      <span>{text}</span>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const { user, role } = useAuthStore()
  const [scanActive, setScanActive] = useState(false)
  const [toast,      setToast]      = useState(null)

  useEffect(() => {
    if (user && role === 'farmer') navigate('/dashboard')
    if (user && role === 'dealer') navigate('/dealer')
    const t = setTimeout(() => setScanActive(true), 800)
    const msg = sessionStorage.getItem('farmxnap-toast')
    if (msg) {
      setToast(msg)
      sessionStorage.removeItem('farmxnap-toast')
      setTimeout(() => setToast(null), 3000)
    }
    return () => clearTimeout(t)
  }, [user])

  return (
    <div className="landing-root">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 max-w-[390px] mx-auto z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-white anim-1"
          style={{ background: '#1D9E75', boxShadow: '0 4px 24px rgba(29,158,117,0.4)' }}>
          <span>✓</span> {toast}
        </div>
      )}

      {/* Orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Nav */}
      <div className="landing-topbar">
        <AppLogo size="lg" />
        <button onClick={() => navigate('/signin')} className="landing-signin-btn">
          Sign in
        </button>
      </div>

      {/* Body — flex fills remaining space, no scroll */}
      <div className="landing-body">

        {/* Hero */}
        <div className="landing-hero">
          <div className="landing-live-badge" style={{ display: 'inline-flex', width: 'fit-content', marginBottom: 10 }}>
            <div className="landing-live-dot" />
            AI-powered
          </div>
          <p className="landing-eyebrow">For Nigerian Farmers</p>
          <h1 className="landing-title">
            Xnap It.<br />
            <span className="l-accent">Know It.</span>{' '}
            <span className="l-dim">Fix It.</span>
          </h1>
          <p className="landing-sub">
            Snap a photo of a sick crop, get an instant AI diagnosis, and buy the right treatment — all in one tap.
          </p>
        </div>

        {/* Scan card */}
        <div className="landing-scan-wrap">
          <div className="landing-scan-card">
            <ScanLine />
            <div className="landing-scan-corner tr" />
            <div className="landing-scan-corner bl" />
            <div className="landing-scan-corner br" />
            <div className="landing-scan-inner">
              <p className="landing-scan-label">⚡ AI diagnosis · Live demo</p>
              <p className="landing-scan-disease">Cassava Mosaic Disease</p>
              <p className="landing-scan-crop">Cassava leaf · Scanned just now</p>
              <div className="landing-conf-row">
                <div className="landing-conf-bg">
                  <div className="landing-conf-fill" style={{ width: scanActive ? '93%' : '0%' }} />
                </div>
                <span className="landing-conf-pct">93%</span>
              </div>
              <div className="landing-symptoms">
                {['Yellow mosaic', 'Leaf curl', 'Stunted growth', 'Pale colour'].map(s => (
                  <span key={s} className="landing-symptom-tag">{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="landing-steps">
          <Step num="1" text="Snap a crop leaf" />
          <Step num="2" text="AI diagnoses disease" />
          <Step num="3" text="Buy cure nearby" />
        </div>

      </div>

      {/* CTAs — fixed at bottom */}
      <div className="landing-cta">
        <button className="landing-btn-main" onClick={() => navigate('/role')}>
          Get started →
        </button>
        <button className="landing-btn-secondary" onClick={() => navigate('/signup/dealer')}>
          <div>
            <p className="landing-dealer-title">Are you an Agro-dealer?</p>
            <p className="landing-dealer-desc">List products · Receive farmer orders · Get paid</p>
          </div>
        </button>
        <p className="landing-footnote">
          Secured by <span>Interswitch</span> · Built for Nigerian farmers
        </p>
      </div>

    </div>
  )
}