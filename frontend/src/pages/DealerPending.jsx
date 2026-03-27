import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLogo from '../component/AppLogo'
import { Clock, RefreshCw } from 'lucide-react'
import { adminGetAllUsers } from '../services/api'
import { useAuthStore } from '../store'

export default function DealerPending() {
  const navigate   = useNavigate()
  const { user, role, logout } = useAuthStore()
  const setAuth    = useAuthStore(s => s.setAuth)
  const token      = useAuthStore(s => s.token)
  const [checking, setChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState(null)

  const checkApproval = async (silent = false) => {
    // Only dealers need this check — never call admin endpoint for other roles
    if (!user?.id || (role !== 'dealer' && role !== 'agrodealer')) return
    if (!silent) setChecking(true)
    try {
      const { dealers } = await adminGetAllUsers()
      const match = dealers.find(d => d.id === user.id)
      setLastChecked(new Date())
      if (match?.is_verified === true) {
        // Admin approved — update auth and go to dashboard
        setAuth({ ...user, is_verified: true }, token, role)
        navigate('/dealer', { replace: true })
      }
    } catch { /* silent fail */ }
    finally { if (!silent) setChecking(false) }
  }

  // Check on mount + poll every 30s
  useEffect(() => {
    checkApproval(true)
    const poll = setInterval(() => checkApproval(true), 30000)
    return () => clearInterval(poll)
  }, [])

  return (
    <div className="page-shell grain">
      <div className="orb orb-2" />

      <nav className="app-nav">
        <div className="w-16" />
        <AppLogo />
        <div className="w-16" />
      </nav>

      <div className="page-body pt-4">
        <div className="flex flex-col items-center text-center anim-1">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shrink-0"
            style={{ background: 'rgba(239,159,39,0.1)', border: '2px solid rgba(239,159,39,0.25)' }}>
            <Clock size={32} className="text-brand-amber" />
          </div>

          <h1 className="font-syne font-extrabold text-2xl text-(--tx) mb-3">
            Application submitted!
          </h1>
          <p className="text-(--tx-sub) text-sm leading-relaxed mb-8 max-w-xs">
            Your business details are under review. You'll be redirected automatically once admin approves your account.
          </p>
        </div>

        {/* Status */}
        <div className="info-banner amber mb-4 anim-2">
          <span className="text-lg shrink-0">📱</span>
          <div>
            <p className="text-sm font-semibold text-(--tx) mb-0.5">Checking every 30 seconds</p>
            <p className="text-xs text-(--tx-sub) leading-relaxed">
              {lastChecked
                ? `Last checked: ${lastChecked.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                : 'Checking your approval status…'
              }
            </p>
          </div>
        </div>

        {/* What happens next */}
        <div className="glass-card anim-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-(--tx-dim) mb-3">
            What to expect
          </p>
          {[
            { emoji: '🔍', title: 'Document review',  desc: 'Admin verifies your CAC and business details' },
            { emoji: '⚡', title: 'Auto redirect',    desc: 'Page checks every 30s — you\'ll go straight to your dashboard when approved' },
            { emoji: '🚀', title: 'Start selling',    desc: 'List products and receive farmer orders' },
          ].map(({ emoji, title, desc }) => (
            <div key={title} className="flex items-start gap-3 mb-3 last:mb-0">
              <span className="text-lg shrink-0">{emoji}</span>
              <div>
                <p className="text-sm font-medium text-(--tx)">{title}</p>
                <p className="text-xs text-(--tx-dim) mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="h-4" />
      </div>

      <div className="page-cta flex flex-col gap-3">
        <button className="btn-main amber" onClick={() => checkApproval(false)} disabled={checking}>
          {checking
            ? <><span className="spinner" /> Checking…</>
            : <><RefreshCw size={15} /> Check approval status</>
          }
        </button>
      </div>
    </div>
  )
}