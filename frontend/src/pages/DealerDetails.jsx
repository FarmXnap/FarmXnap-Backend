import { useAutoError } from '../hooks/useAutoError'
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AppLogo from '../component/AppLogo'
import { Upload, Check } from 'lucide-react'
import PinSheet from '../component/PinSheet'
import StepProgress from '../component/StepProgress'
import { submitDealerDetails, fetchBanks } from '../services/api'
import { NIGERIA_STATES, getLgasByState } from '../data/nigeriaApi'

function FileBox({ label, file, onChange }) {
  return (
    <label className={`upload-box ${file ? 'has-file' : ''}`}>
      {file
        ? <Check size={18} className="text-brand-green" />
        : <Upload size={18} className="text-(--tx-dim)" />
      }
      <span className={`text-[11px] font-medium leading-tight ${file ? 'text-brand-green' : 'text-(--tx-sub)'}`}>
        {file ? file.name : label}
      </span>
      <span className="text-[10px] text-(--tx-dim)">PDF or image · max 5MB</span>
      <input type="file" accept=".pdf,image/*" className="hidden"
        onChange={e => onChange(e.target.files[0])} />
    </label>
  )
}

export default function DealerDetails() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { phone } = location.state || {}

  const [form, setForm] = useState({
    business_name: '', cac_registration_number: '', business_address: '',
    state: '', lga: '', bank: '', bank_name: '', account_number: '',
  })
  const [cacFile,    setCacFile]    = useState(null)
  const [idFile,     setIdFile]     = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [showPin,    setShowPin]    = useState(false)
  const [error,      setError]      = useAutoError()
  const [banks,      setBanks]      = useState([])
  const [banksLoading, setBanksLoading] = useState(true)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    fetchBanks()
      .then(list => { setBanks(list); setBanksLoading(false) })
      .catch(() => { setBanksLoading(false) }) // fail silently — select will just be empty
  }, [])

  if (!phone) { navigate('/signup/dealer'); return null }

  const lgas = form.state ? getLgasByState(form.state) : []

  const handleSubmit = () => {
    if (!form.business_name.trim())           { setError('Business name is required'); return }
    if (!form.cac_registration_number.trim()) { setError('CAC registration number is required'); return }
    if (!form.business_address.trim())        { setError('Business address is required'); return }
    if (!form.state)                          { setError('State is required'); return }
    if (!form.bank)                           { setError('Bank is required'); return }
    if (form.account_number.length !== 10)    { setError('Account number must be exactly 10 digits'); return }
    setError('')
    setShowPin(true)
  }

  const handlePinSuccess = async (pin) => {
    setLoading(true)
    try {
      await submitDealerDetails({ ...form, phone, transaction_pin: pin })
      navigate('/dealer-pending', { replace: true })
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
      throw e
    } finally { setLoading(false) }
  }

  return (
    <div className="page-shell grain dealer-theme">
      <div className="orb orb-2" />

      <nav className="app-nav">
        <button className="nav-back" onClick={() => navigate(-1)}>← Back</button>
        <AppLogo />
        <div className="w-16" />
      </nav>

      <div className="page-body">
        <header className="page-header">
          <p className="page-eyebrow" style={{ color: 'rgba(239,159,39,0.7)' }}>
            Step 3 of 3 · Agro-dealer
          </p>
          <h1 className="page-title">Business details</h1>
          <p className="page-subtitle">
            Verified dealers get more customers and faster payouts.
          </p>
        </header>

        {/* Step 3 of 3 — all filled amber */}
        <div className="flex items-center gap-2 mb-6 anim-1">
          {[0,1,2].map(i => (
            <div key={i} className="h-1.5 rounded-full flex-1 transition-all"
              style={{ background: '#EF9F27' }} />
          ))}
        </div>

        {/* Phone verified badge */}
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-5 anim-1"
          style={{ background: 'rgba(239,159,39,0.06)', border: '1.5px solid rgba(239,159,39,0.2)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(239,159,39,0.12)' }}>
            <Check size={14} className="text-brand-amber" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-brand-amber font-semibold uppercase tracking-wide mb-0.5">Verified</p>
            <p className="text-sm font-mono font-bold text-(--tx) truncate">+234 {phone}</p>
          </div>
          <span className="text-[10px] px-2 py-1 rounded-full font-semibold text-brand-amber shrink-0"
            style={{ background: 'rgba(239,159,39,0.1)', border: '1px solid rgba(239,159,39,0.2)' }}>
            ✓ OTP confirmed
          </span>
        </div>

        <div className="anim-1">
          {/* ── Business information ── */}
          <p className="text-[10px] font-semibold uppercase tracking-widest text-(--tx-dim) mb-3">
            Business information
          </p>

          <div className="field-wrap">
            <span className="field-label">Business name *</span>
            <input className="field-input" placeholder="AgroFirst Port Harcourt"
              value={form.business_name} onChange={e => set('business_name', e.target.value)} />
          </div>

          <div className="field-wrap">
            <span className="field-label">CAC registration number *</span>
            <div className="flex items-center rounded-2xl overflow-hidden transition-all"
              style={{ background: 'var(--input-bg)', border: '1.5px solid var(--input-br)' }}
              onFocus={e => e.currentTarget.style.borderColor='rgba(239,159,39,0.5)'}
              onBlur={e  => e.currentTarget.style.borderColor='var(--input-br)'}>
              <span className="pl-4 pr-2 font-mono text-sm font-semibold text-brand-amber shrink-0 select-none">
                RC-
              </span>
              <div className="w-px h-5 shrink-0" style={{ background: 'var(--card-br)' }} />
              <input className="flex-1 bg-transparent outline-none px-3 py-3.5 text-sm font-dm"
                style={{ color: 'var(--tx)' }}
                placeholder="1042871"
                value={form.cac_registration_number.replace(/^RC-/i, '')}
                onChange={e => set('cac_registration_number', 'RC-' + e.target.value.replace(/\D/g, '').slice(0, 7))}
                maxLength={7}
                type="tel" />
            </div>
          </div>

          <div className="field-wrap">
            <span className="field-label">Business address *</span>
            <input className="field-input" placeholder="12 Agricultural Road, PH"
              value={form.business_address} onChange={e => set('business_address', e.target.value)} />
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

          {/* ── KYC documents ── */}
          <p className="text-[10px] font-semibold uppercase tracking-widest text-(--tx-dim) mb-3 mt-5">
            KYC documents
          </p>

          <div className="field-wrap">
            <div className="grid grid-cols-2 gap-2">
              <FileBox label="CAC certificate"        file={cacFile} onChange={setCacFile} />
              <FileBox label="Govt ID (NIN/passport)" file={idFile}  onChange={setIdFile}  />
            </div>
            <p className="field-hint mt-2">Upload clear copies — required for account approval</p>
          </div>

          {/* ── Payout details ── */}
          <p className="text-[10px] font-semibold uppercase tracking-widest text-(--tx-dim) mb-3 mt-5">
            Payout details
          </p>

          <div className="field-wrap">
            <span className="field-label">Bank *</span>
            <select className="field-select" value={form.bank}
              onChange={e => {
                const selected = banks.find(b => b.code === e.target.value)
                set('bank', e.target.value)        // code → sent to API
                set('bank_name', selected?.name || e.target.value) // name → display
              }}>
              <option value="">{banksLoading ? 'Loading banks…' : 'Select bank'}</option>
              {banks.map(b => <option key={b.id} value={b.code}>{b.name}</option>)}
            </select>
          </div>

          <div className="field-wrap">
            <span className="field-label">Account number *</span>
            <input className="field-input" placeholder="0123456789" maxLength={10}
              value={form.account_number}
              onChange={e => set('account_number', e.target.value.replace(/\D/g, '').slice(0,10))} />
            <p className="field-hint">Must be exactly 10 digits</p>
          </div>

          {error && <div className="err-banner"><span>⚠</span> {error}</div>}
        </div>

        <StepProgress currentStep={3} role="dealer" />
        <div className="h-20" />
      </div>

      <div className="page-cta">
        <button className="btn-main amber" onClick={handleSubmit} disabled={loading}>
          {loading ? <><span className="spinner" /> Submitting…</> : 'Continue →'}
        </button>
        <p className="cta-note">Approval usually within 24 hours via SMS</p>
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