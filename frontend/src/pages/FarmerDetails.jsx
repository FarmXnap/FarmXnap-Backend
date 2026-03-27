import { useAutoError } from '../hooks/useAutoError'
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AppLogo from '../component/AppLogo'
import { Check } from 'lucide-react'
import PinSheet from '../component/PinSheet'
import StepProgress from '../component/StepProgress'
import { submitFarmerDetails } from '../services/api'
import { NIGERIA_STATES, getLgasByState } from '../data/nigeriaApi'

const CROPS = ['Cassava', 'Maize', 'Tomato', 'Yam', 'Rice', 'Other']

export default function FarmerDetails() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { phone } = location.state || {}

  const [form, setForm] = useState({
    name: '', state: '', lga: '', address: '', crop: 'Cassava'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useAutoError()
  const [showPin, setShowPin] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  if (!phone) { navigate('/signup/farmer'); return null }

  const handleSubmit = () => {
    if (!form.name.trim() || !form.state) {
      setError('Please fill your name and state'); return
    }
    if (form.crop === 'Other' && !form.customCrop?.trim()) {
      setError('Please enter your crop name'); return
    }
    setError('')
    setShowPin(true)
  }

  const handlePinSuccess = async (pin) => {
    setLoading(true)
    try {
      const cv = form.crop === 'Other' ? form.customCrop.trim() : form.crop
      const res = await submitFarmerDetails({ ...form, crop: cv, phone, transaction_pin: pin })
      navigate('/signup/farmer/welcome', {
        replace: true,
        state: { name: form.name, crop: cv, state: form.state, lga: form.lga, address: form.address, authResult: res },
      })
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
      throw e
    } finally { setLoading(false) }
  }

  const lgas = form.state ? getLgasByState(form.state) : []

  return (
    <div className="page-shell grain">
      <div className="orb orb-1" />

      <nav className="app-nav">
        <button className="nav-back" onClick={() => navigate(-1)}>← Back</button>
        <AppLogo />
        <div className="w-16" />
      </nav>

      <div className="page-body">
        <header className="page-header">
          <p className="page-eyebrow">Step 3 of 3 · Farmer</p>
          <h1 className="page-title">About your farm</h1>
          <p className="page-subtitle">
            Just a few details — you can update these anytime from your profile.
          </p>
        </header>

        {/* Step 3 of 3 — all filled */}
        <div className="flex items-center gap-2 mb-6 anim-1">
          {[0,1,2].map(i => (
            <div key={i} className="h-1.5 rounded-full flex-1 transition-all"
              style={{ background: '#1D9E75' }} />
          ))}
        </div>

        {/* Phone verified badge */}
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-5 anim-1"
          style={{ background: 'rgba(29,158,117,0.08)', border: '1.5px solid rgba(29,158,117,0.2)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(29,158,117,0.15)' }}>
            <Check size={14} className="text-brand-green" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-brand-green font-semibold uppercase tracking-wide mb-0.5">Verified</p>
            <p className="text-sm font-mono font-bold text-(--tx) truncate">+234 {phone}</p>
          </div>
          <span className="text-[10px] px-2 py-1 rounded-full font-semibold text-brand-green shrink-0"
            style={{ background: 'rgba(29,158,117,0.12)', border: '1px solid rgba(29,158,117,0.2)' }}>
            ✓ OTP confirmed
          </span>
        </div>

        <div className="anim-1">
          {/* Full name */}
          <div className="field-wrap">
            <span className="field-label">Full name *</span>
            <input className="field-input" placeholder="Emeka Okonkwo"
              value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          {/* State + LGA */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <span className="field-label">State *</span>
              <select className="field-select" value={form.state}
                onChange={e => { set('state', e.target.value); set('lga', '') }}>
                <option value="">Select state</option>
                {NIGERIA_STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <span className="field-label">LGA</span>
              <select className="field-select" value={form.lga}
                onChange={e => set('lga', e.target.value)}
                disabled={!form.state}>
                <option value="">{form.state ? 'Select LGA' : '— pick state first'}</option>
                {lgas.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Delivery address */}
          <div className="field-wrap">
            <span className="field-label">Delivery address</span>
            <input className="field-input" placeholder="House no, street name, area"
              value={form.address} onChange={e => set('address', e.target.value)} />
            <p className="field-hint">Used for treatment delivery to your farm</p>
          </div>

          {/* Primary crop */}
          <div className="field-wrap">
            <span className="field-label">Primary crop</span>
            <div className="grid grid-cols-3 gap-2">
              {CROPS.map(c => (
                <button key={c} className={`crop-btn ${form.crop === c ? 'on' : ''}`}
                  onClick={() => set('crop', c)}>{c}</button>
              ))}
            </div>
            {form.crop === 'Other' && (
              <input className="field-input mt-2"
                placeholder="Enter your crop e.g. Groundnut"
                value={form.customCrop || ''}
                onChange={e => set('customCrop', e.target.value)}
                autoFocus />
            )}
            <p className="field-hint mt-2">Used to personalise your disease alerts and tips</p>
          </div>

          {error && <div className="err-banner"><span>⚠</span> {error}</div>}
        </div>

        <StepProgress currentStep={3} role="farmer" />
        <div className="h-20" />
      </div>

      <div className="page-cta">
        <button className="btn-main" onClick={handleSubmit} disabled={loading}>
          {loading ? <><span className="spinner" /> Setting up your account…</> : 'Continue →'}
        </button>
        <p className="cta-note">Free forever · No credit card needed</p>
      </div>

      <PinSheet
        open={showPin}
        isCreate
        title="Create transaction PIN"
        subtitle="Choose a 4-digit PIN to secure your payments"
        onSuccess={handlePinSuccess}
        onClose={() => setShowPin(false)}
      />
    </div>
  )
}