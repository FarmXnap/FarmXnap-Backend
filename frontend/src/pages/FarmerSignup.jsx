import { useAutoError } from '../hooks/useAutoError'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLogo from '../component/AppLogo'
import StepProgress from '../component/StepProgress'
import { requestOTP } from '../services/api'

// Farmer: Role(1/4) → Phone(2/4) → Details(3/4) → PIN(4/4) → Welcome → Dashboard

export default function FarmerSignup() {
  const navigate  = useNavigate()
  const [phone,   setPhone]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useAutoError()

  const handleSend = async () => {
    if (!phone || phone.replace(/\D/g, '').length < 7) {
      setError('Enter a valid phone number'); return
    }
    setLoading(true); setError('')
    try {
      await requestOTP(phone)
      navigate('/verify-otp', {
        state: { phone, role: 'farmer', isSignUp: true, nextRoute: '/signup/farmer/details' },
        replace: true,
      })
    } catch (e) {
      const raw = e.message || ''
      if (raw.toLowerCase().includes('already in use')) {
        setError('This number is registered to another account. Please use a different number or sign in.')
      } else {
        setError(raw || 'Could not send OTP. Please try again.')
      }
    }
    finally { setLoading(false) }
  }

  return (
    <div className="page-shell grain">
      <div className="orb orb-1" />

      <nav className="app-nav">
        <button className="nav-back" onClick={() => navigate('/role')}>← Back</button>
        <AppLogo />
        <div className="w-16" />
      </nav>

      <div className="page-body">
        <header className="page-header">
          <p className="page-eyebrow">Step 2 of 3 · Farmer</p>
          <h1 className="page-title">Verify your number</h1>
          <p className="page-subtitle">
            Enter your phone number. We'll send a quick code to confirm it's you.
          </p>
        </header>

        {/* Step 2 of 3 */}
        <div className="flex items-center gap-2 mb-6 anim-1">
          {[0,1,2].map(i => (
            <div key={i} className="h-1.5 rounded-full transition-all"
              style={{
                flex: i <= 1 ? 1 : undefined,
                width: i > 1 ? 20 : undefined,
                background: i <= 1 ? '#1D9E75' : 'var(--card-br)',
              }} />
          ))}
        </div>

        <div className="anim-1">
          <div className="field-wrap">
            <span className="field-label">Phone number *</span>
            <div className="flex items-center rounded-2xl overflow-hidden transition-all"
              style={{ background: 'var(--input-bg)', border: '1.5px solid var(--input-br)' }}
              onFocus={e => e.currentTarget.style.borderColor='rgba(29,158,117,0.5)'}
              onBlur={e => e.currentTarget.style.borderColor='var(--input-br)'}>
              <span className="pl-4 pr-2 font-mono text-sm font-semibold text-brand-green shrink-0 select-none">
                +234
              </span>
              <div className="w-px h-5 shrink-0" style={{ background: 'var(--card-br)' }} />
              <input
                className="flex-1 bg-transparent outline-none px-3 py-3.5 text-sm font-dm"
                style={{ color: 'var(--tx)' }}
                type="tel" placeholder="803 456 7890"
                value={phone}
                maxLength={10}
                onChange={e => setPhone(e.target.value.replace(/[^0-9 ]/g, '').replace(/^0+/, '').slice(0, 10))}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
            </div>
            <p className="field-hint">A 6-digit code will be sent to verify this number</p>
          </div>

          {/* Progress overview */}
          <StepProgress currentStep={2} role="farmer" />

          {error && <div className="err-banner mt-4"><span>⚠</span> {error}</div>}
        </div>

        <div className="h-20" />
      </div>

      <div className="page-cta">
        <button className="btn-main" onClick={handleSend} disabled={loading}>
          {loading ? <><span className="spinner" /> Sending code…</> : 'Send verification code →'}
        </button>
        <p className="cta-note">
          Already have an account?{' '}
          <button onClick={() => navigate('/signin')}>Sign in</button>
        </p>
      </div>
    </div>
  )
}