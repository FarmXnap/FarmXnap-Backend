import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLogo from '../component/AppLogo'
import {
  ArrowDownLeft, ArrowUpRight, RotateCcw, Plus, X,
  Shield, Copy, Check, Eye, EyeOff, Wallet,
} from 'lucide-react'
import { useWalletStore, useAuthStore, useToastStore } from '../store'
import { fetchBanks } from '../services/api'

const ISW = {
  merchantCode: 'MX6072',
  payItemId:    '9405967',
  mode:         'TEST',
  scriptUrl:    'https://newwebpay.qa.interswitchng.com/inline-checkout.js',
}

const TX_CONFIG = {
  credit:   { icon: ArrowDownLeft, color: '#1D9E75', bg: 'rgba(29,158,117,0.1)',  border: 'rgba(29,158,117,0.2)',  label: 'Top-up',    sign: '+', badgeClass: 'green' },
  debit:    { icon: ArrowUpRight,  color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)',   label: 'Purchase',  sign: '-', badgeClass: 'red'   },
  refund:   { icon: RotateCcw,     color: '#818cf8', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.2)', label: 'Refund',    sign: '+', badgeClass: 'amber' },
  withdraw: { icon: ArrowUpRight,  color: '#EF9F27', bg: 'rgba(239,159,39,0.1)',  border: 'rgba(239,159,39,0.2)',  label: 'Withdraw',  sign: '-', badgeClass: 'amber' },
}

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000]
const FILTERS = ['All', 'Top-up', 'Purchase', 'Refund', 'Withdraw']
const TYPE_MAP = { 'Top-up': 'credit', 'Purchase': 'debit', 'Refund': 'refund', 'Withdraw': 'withdraw' }

export default function WalletPage() {
  const navigate  = useNavigate()
  const showToast = useToastStore(s => s.show)
  const user      = useAuthStore(s => s.user)
  const { balance, transactions, topUp, withdraw } = useWalletStore()

  const [sheet,        setSheet]        = useState(null) // 'topup' | 'withdraw' | 'tx'
  const [activeTx,     setActiveTx]     = useState(null)
  const [filter,       setFilter]       = useState('All')
  const [hideBalance,  setHideBalance]  = useState(false)
  const [copied,       setCopied]       = useState(false)

  // Top-up
  const [topupAmount,  setTopupAmount]  = useState('')
  const [topupLoading, setTopupLoading] = useState(false)
  const [topupError,   setTopupError]   = useState('')
  const scriptLoaded = useRef(false)

  // Withdraw
  const [banks,        setBanks]        = useState([])
  const [banksLoading, setBanksLoading] = useState(true)
  const [wdBank,       setWdBank]       = useState('')
  const [wdAccount,    setWdAccount]    = useState('')
  const [wdAmount,     setWdAmount]     = useState('')
  const [wdPin,        setWdPin]        = useState('')
  const [wdLoading,    setWdLoading]    = useState(false)
  const [wdError,      setWdError]      = useState('')
  const [wdSuccess,    setWdSuccess]    = useState(false)

  // Load Interswitch script
  useEffect(() => {
    if (document.getElementById('isw-inline')) { scriptLoaded.current = true; return }
    const s = document.createElement('script')
    s.id = 'isw-inline'; s.src = ISW.scriptUrl; s.async = true
    s.onload = () => { scriptLoaded.current = true }
    document.body.appendChild(s)
  }, [])

  // Load banks
  useEffect(() => {
    fetchBanks().then(l => { setBanks(l); setBanksLoading(false) }).catch(() => setBanksLoading(false))
  }, [])

  const totalIn  = transactions.filter(t => t.type === 'credit' || t.type === 'refund').reduce((s, t) => s + t.amount, 0)
  const totalOut = transactions.filter(t => t.type === 'debit'  || t.type === 'withdraw').reduce((s, t) => s + t.amount, 0)
  const filtered = filter === 'All' ? transactions : transactions.filter(t => t.type === TYPE_MAP[filter])

  const generateRef = () => 'FXWLT' + Date.now() + Math.random().toString(36).slice(2, 5).toUpperCase()

  const openTopup = () => { setTopupAmount(''); setTopupError(''); setSheet('topup') }
  const openWithdraw = () => { setWdBank(''); setWdAccount(''); setWdAmount(''); setWdPin(''); setWdError(''); setWdSuccess(false); setSheet('withdraw') }

  const handleTopUp = async () => {
    const amt = parseInt(topupAmount)
    if (!amt || amt < 100) { setTopupError('Minimum top-up is ₦100'); return }
    setTopupError('')

    const getCheckout = () => new Promise((resolve, reject) => {
      if (typeof window.webpayCheckout === 'function') return resolve(window.webpayCheckout)
      let n = 0
      const poll = setInterval(() => {
        n++
        if (typeof window.webpayCheckout === 'function') { clearInterval(poll); resolve(window.webpayCheckout) }
        else if (n >= 50) { clearInterval(poll); reject(new Error('Payment gateway not ready. Refresh and try again.')) }
      }, 100)
    })

    setTopupLoading(true)
    const checkout = await getCheckout().catch(e => { setTopupError(e.message); setTopupLoading(false); return null })
    if (!checkout) return

    const ref = generateRef()
    checkout({
      merchant_code:     ISW.merchantCode,
      pay_item_id:       ISW.payItemId,
      pay_item_name:     'FarmXnap Wallet Top-up',
      txn_ref:           ref,
      amount:            String(amt * 100),
      currency:          '566',
      cust_id:           user?.id || ref,
      cust_name:         user?.name || user?.full_name || 'FarmXnap User',
      cust_email:        user?.email || `user${Date.now()}@farmxnap.com`,
      cust_mobile_no:    (user?.phone || '08000000000').replace(/\D/g, '').replace(/^234/, '0'),
      site_redirect_url: window.location.origin + '/wallet',
      mode:              ISW.mode,
      onComplete: (res) => {
        setTopupLoading(false)
        const code = res?.resp || res?.responseCode || ''
        if (code === '00') {
          topUp(amt, ref)
          setSheet(null)
          showToast(`₦${amt.toLocaleString()} added to your wallet!`, 'success')
        } else if (code === '01') {
          setTopupError('Payment cancelled.')
        } else if (code) {
          setTopupError(`Payment failed (${code}). Please try again.`)
        } else {
          setTopupError('')
        }
      },
      onError: () => { setTopupLoading(false); setTopupError('Payment error. Please try again.') },
    })
  }

  const handleWithdraw = async () => {
    const amt = parseInt(wdAmount)
    if (!wdBank)                  { setWdError('Select your bank'); return }
    if (wdAccount.length !== 10)  { setWdError('Account number must be 10 digits'); return }
    if (!amt || amt < 100)        { setWdError('Minimum withdrawal is ₦100'); return }
    if (amt > balance)            { setWdError('Insufficient wallet balance'); return }
    if (wdPin.length !== 4)       { setWdError('Enter your 4-digit transaction PIN'); return }
    setWdError('')
    setWdLoading(true)
    await new Promise(r => setTimeout(r, 1500))
    const bankName = banks.find(b => b.code === wdBank)?.name || wdBank
    withdraw(amt, bankName, wdAccount)
    setWdLoading(false)
    setWdSuccess(true)
  }

  const copyRef = (ref) => {
    navigator.clipboard?.writeText(ref)
    setCopied(ref); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="page-shell grain">
      <div className="orb orb-1" />

      {/* Nav */}
      <nav className="app-nav">
        <button className="nav-back" onClick={() => navigate('/dashboard')}>← Back</button>
        <AppLogo />
        <button className="w-9 h-9 flex items-center justify-center rounded-xl text-(--tx-sub) transition-all active:scale-90"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-br)' }}
          onClick={() => setHideBalance(h => !h)}>
          {hideBalance ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
      </nav>

      <div className="page-body pt-2">

        {/* Header */}
        <header className="page-header pb-2">
          <p className="page-eyebrow">Finance</p>
        </header>

        {/* ── Balance Card ─────────────────────────────────────────── */}
        <div className="glass-card mb-4 anim-1">
          <div className="flex items-start justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-(--tx-dim)">Available balance</p>
            <span className="badge green text-[10px]"><Shield size={9} /> Secured</span>
          </div>
          <p className="font-syne font-black text-4xl text-(--tx) mb-4 leading-none">
            {hideBalance ? '₦ ••••••' : `₦${balance.toLocaleString()}`}
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="rounded-2xl px-3 py-2.5" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-br)' }}>
              <p className="text-[10px] text-(--tx-dim) uppercase tracking-widest mb-1">Total in</p>
              <p className="font-syne font-bold text-sm text-brand-green">
                {hideBalance ? '••••' : `+₦${totalIn.toLocaleString()}`}
              </p>
            </div>
            <div className="rounded-2xl px-3 py-2.5" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-br)' }}>
              <p className="text-[10px] text-(--tx-dim) uppercase tracking-widest mb-1">Total out</p>
              <p className="font-syne font-bold text-sm text-red-400">
                {hideBalance ? '••••' : `-₦${totalOut.toLocaleString()}`}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-main py-3 text-sm" onClick={openTopup}>
              <Plus size={15} /> Add funds
            </button>
            <button className="btn-main amber py-3 text-sm" onClick={openWithdraw}>
              <ArrowUpRight size={15} /> Withdraw
            </button>
          </div>
        </div>

        {/* ── Filter Tabs ──────────────────────────────────────────── */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-0.5 anim-2" style={{ scrollbarWidth: 'none' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                filter === f
                  ? 'bg-brand-green text-white border-transparent'
                  : 'text-(--tx-sub) border-(--card-br) bg-(--card-bg)'
              }`}>
              {f}
            </button>
          ))}
        </div>

        {/* ── Transaction List ─────────────────────────────────────── */}
        <div className="anim-3">
          <div className="flex items-center justify-between mb-3">
            <p className="font-syne font-bold text-sm text-(--tx)">Transactions</p>
            <span className="text-xs text-(--tx-dim)">{filtered.length} records</span>
          </div>

          {filtered.length === 0 ? (
            <div className="glass-card text-center py-10">
              <Wallet size={28} className="text-(--tx-dim) mx-auto mb-3" />
              <p className="font-syne font-bold text-(--tx) text-sm mb-1">No transactions yet</p>
              <p className="text-xs text-(--tx-sub)">Add funds to get started</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((tx, idx) => {
                const cfg  = TX_CONFIG[tx.type] || TX_CONFIG.credit
                const Icon = cfg.icon
                return (
                  <button key={tx.id}
                    className="glass-card flex items-center gap-3 text-left w-full active:scale-[0.985] transition-all"
                    style={{ animationDelay: `${idx * 0.03}s` }}
                    onClick={() => { setActiveTx(tx); setSheet('tx') }}>
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                      <Icon size={16} style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-(--tx) truncate leading-tight">{tx.desc}</p>
                      <p className="text-[11px] text-(--tx-dim) mt-0.5">{cfg.label} · {tx.date}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-syne font-bold text-sm" style={{ color: cfg.color }}>
                        {cfg.sign}₦{tx.amount.toLocaleString()}
                      </p>
                      <span className={`badge ${cfg.badgeClass} text-[10px] mt-0.5`}>✓ Done</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="h-8" />
      </div>

      {/* ════════════════════════════════════════════════════════
          SHEET: ADD FUNDS
      ════════════════════════════════════════════════════════ */}
      {sheet === 'topup' && (
        <div className="sheet-backdrop" onClick={e => e.target === e.currentTarget && setSheet(null)}>
          <div className="sheet-panel" style={{ maxHeight: '90vh' }}>
            <div className="sheet-header">
              <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--card-br)' }} />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-syne font-bold text-lg text-(--tx)">Add funds</h3>
                  <p className="text-xs text-(--tx-sub) mt-0.5">Powered by Interswitch · Instant top-up</p>
                </div>
                <button onClick={() => setSheet(null)} className="nav-close"><X size={15} /></button>
              </div>
            </div>

            <div className="sheet-body pb-4">
              {/* Quick amounts */}
              <p className="field-label">Quick select</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {QUICK_AMOUNTS.map(a => (
                  <button key={a}
                    className="py-2.5 rounded-2xl text-sm font-syne font-bold transition-all active:scale-95"
                    style={{
                      background: topupAmount === String(a) ? 'rgba(29,158,117,0.1)' : 'var(--card-bg)',
                      color:      topupAmount === String(a) ? '#1D9E75' : 'var(--tx-sub)',
                      border:     topupAmount === String(a) ? '1.5px solid rgba(29,158,117,0.4)' : '1px solid var(--card-br)',
                    }}
                    onClick={() => setTopupAmount(String(a))}>
                    ₦{a.toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Custom amount */}
              <p className="field-label">Or enter amount</p>
              <div className="flex items-center gap-2 mb-4"
                style={{ background: 'var(--input-bg)', border: '1.5px solid var(--input-br)', borderRadius: 16, padding: '12px 16px' }}>
                <span className="font-syne font-extrabold text-xl text-brand-green">₦</span>
                <input className="flex-1 bg-transparent outline-none text-xl font-syne font-bold text-(--tx)"
                  placeholder="0" type="number"
                  value={topupAmount}
                  onChange={e => setTopupAmount(e.target.value)}
                  style={{ WebkitUserSelect: 'text', userSelect: 'text' }}
                />
              </div>

              {/* Test notice */}
              <div className="info-banner amber mb-2">
                <span className="text-base flex-shrink-0">🧪</span>
                <div>
                  <p className="text-xs font-semibold text-(--tx)">Test mode — no real charges</p>
                  <p className="text-[11px] text-(--tx-sub) mt-0.5 leading-relaxed">
                    Verve: 5061 0502 5475 6707 864 · 06/26 · CVV 111 · PIN 1111
                  </p>
                </div>
              </div>

              {topupError && <div className="err-banner mt-3"><span>⚠</span> {topupError}</div>}
            </div>

            <div className="sheet-footer">
              <button className="btn-main w-full"
                disabled={!topupAmount || parseInt(topupAmount) < 100 || topupLoading}
                onClick={handleTopUp}>
                {topupLoading
                  ? <><span className="spinner" /> Opening payment…</>
                  : <><Plus size={15} /> Add ₦{parseInt(topupAmount || 0).toLocaleString()} to wallet</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          SHEET: WITHDRAW
      ════════════════════════════════════════════════════════ */}
      {sheet === 'withdraw' && (
        <div className="sheet-backdrop" onClick={e => e.target === e.currentTarget && setSheet(null)}>
          <div className="sheet-panel" style={{ maxHeight: '92vh' }}>
            <div className="sheet-header">
              <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--card-br)' }} />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-syne font-bold text-lg text-(--tx)">
                    {wdSuccess ? 'Withdrawal sent!' : 'Withdraw funds'}
                  </h3>
                  <p className="text-xs text-(--tx-sub) mt-0.5">
                    {wdSuccess ? 'Processing to your bank account' : `Wallet balance: ₦${balance.toLocaleString()}`}
                  </p>
                </div>
                <button onClick={() => setSheet(null)} className="nav-close"><X size={15} /></button>
              </div>
            </div>

            {wdSuccess ? (
              <>
                <div className="sheet-body pb-4 flex flex-col items-center text-center gap-4 pt-4">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(29,158,117,0.1)', border: '2px solid rgba(29,158,117,0.25)', animation: 'scan-pulse 2s ease-in-out infinite' }}>
                    <span className="text-4xl">✅</span>
                  </div>
                  <div>
                    <p className="text-brand-green text-[11px] font-bold uppercase tracking-[0.2em] mb-2">Withdrawal initiated</p>
                    <p className="font-syne font-extrabold text-2xl text-(--tx) mb-3">
                      ₦{parseInt(wdAmount).toLocaleString()}
                    </p>
                    <p className="text-sm text-(--tx-sub) leading-relaxed max-w-[260px]">
                      Sent to {banks.find(b => b.code === wdBank)?.name || 'your bank'} account ending in <span className="text-(--tx) font-semibold">{wdAccount.slice(-4)}</span>. Arrives in 1–3 business days.
                    </p>
                  </div>
                  <div className="glass-card w-full text-left">
                    {[
                      { label: 'Amount',  val: `₦${parseInt(wdAmount).toLocaleString()}` },
                      { label: 'Bank',    val: banks.find(b => b.code === wdBank)?.name || '—' },
                      { label: 'Account', val: `•••• •••• ${wdAccount.slice(-4)}` },
                      { label: 'Status',  val: 'Processing', color: '#EF9F27' },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="flex justify-between items-center mb-2.5 last:mb-0">
                        <span className="text-xs text-(--tx-sub)">{label}</span>
                        <span className="text-sm font-semibold" style={{ color: color || 'var(--tx)' }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="sheet-footer">
                  <button className="btn-main ghost w-full" onClick={() => setSheet(null)}>Done</button>
                </div>
              </>
            ) : (
              <>
                <div className="sheet-body pb-4">
                  <p className="field-label">Bank</p>
                  <select className="field-select mb-4" value={wdBank} onChange={e => setWdBank(e.target.value)}>
                    <option value="">{banksLoading ? 'Loading banks…' : 'Select your bank'}</option>
                    {banks.map(b => <option key={b.id} value={b.code}>{b.name}</option>)}
                  </select>

                  <p className="field-label">Account number</p>
                  <input className="field-input mb-4" type="number"
                    placeholder="Enter 10-digit account number"
                    value={wdAccount}
                    onChange={e => setWdAccount(e.target.value.slice(0, 10))}
                    style={{ WebkitUserSelect: 'text', userSelect: 'text' }}
                  />

                  <p className="field-label">Amount</p>
                  <div className="flex items-center gap-2 mb-1"
                    style={{ background: 'var(--input-bg)', border: '1.5px solid var(--input-br)', borderRadius: 16, padding: '12px 16px' }}>
                    <span className="font-syne font-extrabold text-xl text-brand-amber">₦</span>
                    <input className="flex-1 bg-transparent outline-none text-xl font-syne font-bold text-(--tx)"
                      placeholder="0" type="number"
                      value={wdAmount}
                      onChange={e => setWdAmount(e.target.value)}
                      style={{ WebkitUserSelect: 'text', userSelect: 'text' }}
                    />
                    <button className="text-xs font-semibold text-brand-amber flex-shrink-0 bg-transparent border-none cursor-pointer"
                      onClick={() => setWdAmount(String(balance))}>
                      MAX
                    </button>
                  </div>

                  {/* Balance preview */}
                  {wdAmount && parseInt(wdAmount) > 0 && (
                    <div className={`info-banner mb-4 mt-2 ${parseInt(wdAmount) > balance ? 'red' : 'green'}`}>
                      <span className="text-sm flex-shrink-0">{parseInt(wdAmount) > balance ? '⚠️' : '✓'}</span>
                      <div>
                        <p className="text-xs font-semibold text-(--tx)">
                          {parseInt(wdAmount) > balance ? 'Insufficient balance' : 'Balance after withdrawal'}
                        </p>
                        <p className="text-[11px] text-(--tx-sub) mt-0.5">
                          {parseInt(wdAmount) > balance
                            ? `You need ₦${(parseInt(wdAmount) - balance).toLocaleString()} more`
                            : `₦${(balance - parseInt(wdAmount)).toLocaleString()} remaining`}
                        </p>
                      </div>
                    </div>
                  )}

                  <p className="field-label">Transaction PIN</p>
                  <input className="field-input mb-4" type="password"
                    placeholder="Enter 4-digit PIN"
                    maxLength={4}
                    value={wdPin}
                    onChange={e => setWdPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    style={{ WebkitUserSelect: 'text', userSelect: 'text', letterSpacing: '0.3em' }}
                  />

                  {wdError && <div className="err-banner"><span>⚠</span> {wdError}</div>}
                </div>
                <div className="sheet-footer">
                  <button className="btn-main amber w-full"
                    disabled={wdLoading}
                    onClick={handleWithdraw}>
                    {wdLoading
                      ? <><span className="spinner" /> Processing…</>
                      : <><ArrowUpRight size={15} /> Withdraw ₦{parseInt(wdAmount || 0).toLocaleString()}</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          SHEET: TRANSACTION DETAIL
      ════════════════════════════════════════════════════════ */}
      {sheet === 'tx' && activeTx && (() => {
        const cfg  = TX_CONFIG[activeTx.type] || TX_CONFIG.credit
        const Icon = cfg.icon
        return (
          <div className="sheet-backdrop" onClick={e => e.target === e.currentTarget && setSheet(null)}>
            <div className="sheet-panel" style={{ maxHeight: '75vh' }}>
              <div className="sheet-header">
                <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--card-br)' }} />
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-syne font-bold text-lg text-(--tx)">Transaction details</h3>
                    <p className="text-xs text-(--tx-sub) mt-0.5">{activeTx.date}</p>
                  </div>
                  <button onClick={() => setSheet(null)} className="nav-close"><X size={15} /></button>
                </div>
              </div>

              <div className="sheet-body pb-4">
                {/* Amount hero */}
                <div className="flex flex-col items-center text-center py-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    <Icon size={24} style={{ color: cfg.color }} />
                  </div>
                  <span className={`badge ${cfg.badgeClass} mb-3`}>{cfg.label}</span>
                  <p className="font-syne font-black text-4xl text-(--tx)">
                    {cfg.sign}₦{activeTx.amount.toLocaleString()}
                  </p>
                </div>

                {/* Detail rows */}
                <div className="glass-card">
                  {[
                    { label: 'Description', val: activeTx.desc },
                    { label: 'Date',        val: activeTx.date },
                    { label: 'Status',      val: '✓ Completed', color: '#1D9E75' },
                    { label: 'Reference',   val: activeTx.ref || '—', mono: true, canCopy: !!activeTx.ref },
                  ].map(({ label, val, color, mono, canCopy }, i, arr) => (
                    <div key={label}
                      className={`flex items-center justify-between py-2.5 ${i < arr.length - 1 ? 'border-b border-(--card-br)' : ''}`}>
                      <span className="text-xs text-(--tx-sub)">{label}</span>
                      <div className="flex items-center gap-2 max-w-[60%]">
                        <span className={`text-xs font-semibold text-right truncate ${mono ? 'font-mono' : ''}`}
                          style={{ color: color || 'var(--tx)' }}>
                          {val}
                        </span>
                        {canCopy && (
                          <button onClick={() => copyRef(activeTx.ref)} className="flex-shrink-0">
                            {copied === activeTx.ref
                              ? <Check size={11} className="text-brand-green" />
                              : <Copy size={11} className="text-(--tx-dim)" />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sheet-footer">
                <button className="btn-main ghost w-full" onClick={() => setSheet(null)}>Close</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}