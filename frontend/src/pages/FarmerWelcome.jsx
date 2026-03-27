import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Check, Camera, ShoppingBag, Shield } from 'lucide-react'
import { useAuthStore, useToastStore } from '../store'
import AppLogo from '../component/AppLogo'

export default function FarmerWelcome() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const setAuth    = useAuthStore(s => s.setAuth)
  const showToast  = useToastStore(s => s.show)
  const { name, crop, state: farmerState, lga, address, authResult } = location.state || {}
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!name || !authResult) { navigate('/dashboard', { replace: true }); return }
    // Merge form details into the user object so dashboard reads real data
    const fullUser = {
      ...authResult.user,
      name,
      crop,
      state:             farmerState,
      lga,
      address,
      full_name:         name,
      primary_crop:      crop,
      // farmer_profile_id extracted from HATEOAS links.view.href during registration
      // Do NOT fall back to user.id — profile id and user id are different
      farmer_profile_id: authResult.user.farmer_profile_id || null,
      member_since:      new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    }
    setAuth(fullUser, authResult.token, authResult.role)
    showToast(authResult.message || 'Account created successfully!', 'success')

    const step = 100 / 50
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); return 100 }
        return p + step
      })
    }, 100)

    const t = setTimeout(() => navigate('/dashboard', { replace: true }), 5200)
    return () => { clearTimeout(t); clearInterval(interval) }
  }, [])

  const firstName = name?.split(' ')[0] || 'Farmer'
  const cropName  = crop || 'crops'

  return (
    <div className="page-shell grain">
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {/* Nav */}
      <nav className="app-nav">
        <div className="w-16" />
        <AppLogo />
        <div className="w-16" />
      </nav>

      {/* Scrollable body */}
      <div className="flex-1 min-h-0 overflow-y-auto relative z-10 px-6 pt-4">

        {/* Checkmark + label */}
        <div className="flex flex-col items-center mb-6 anim-1">
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full pointer-events-none"
              style={{ border: '1.5px solid rgba(29,158,117,0.2)', animation: 'scan-pulse 2.2s ease-in-out infinite' }} />
            <div className="absolute -inset-3 rounded-full pointer-events-none"
              style={{ border: '1px solid rgba(29,158,117,0.1)', animation: 'scan-pulse 2.2s ease-in-out infinite 0.5s' }} />
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(29,158,117,0.12)', border: '2px solid rgba(29,158,117,0.35)' }}>
              <Check size={38} className="text-brand-green" strokeWidth={2.5} />
            </div>
          </div>

          <span className="text-brand-green text-[10px] font-bold uppercase tracking-[0.25em] mb-3">
            Account created
          </span>

          <h1 className="font-syne font-extrabold text-center text-(--tx)"
            style={{ fontSize: 'clamp(26px, 8vw, 36px)', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
            Welcome,
          </h1>
          <h1 className="font-syne font-extrabold text-center text-brand-green"
            style={{ fontSize: 'clamp(26px, 8vw, 36px)', lineHeight: 1.15, letterSpacing: '-0.5px' }}>
            {firstName}! 🌱
          </h1>
        </div>

        {/* Sub */}
        <p className="text-(--tx-sub) text-sm text-center leading-relaxed mb-6 mx-auto max-w-[270px] anim-2">
          Your farm account is set up. Let's start protecting your{' '}
          <span className="text-(--tx) font-semibold">{cropName}</span>{' '}
          from disease.
        </p>

        {/* Feature cards */}
        <div className="flex flex-col gap-2.5 anim-3">
          {[
            { icon: Camera,      color: '#1D9E75', bg: 'rgba(29,158,117,0.1)',  br: 'rgba(29,158,117,0.22)', title: 'AI crop diagnosis',         desc: 'Point at a leaf — results in under 5 secs' },
            { icon: ShoppingBag, color: '#EF9F27', bg: 'rgba(239,159,39,0.1)',  br: 'rgba(239,159,39,0.22)', title: 'Buy treatments nearby',     desc: 'Verified agro-dealers matched to your crop' },
            { icon: Shield,      color: '#1D9E75', bg: 'rgba(29,158,117,0.08)', br: 'rgba(29,158,117,0.18)', title: 'Escrow-protected payments', desc: 'Money released only after delivery'          },
          ].map(({ icon: Icon, color, bg, br, title, desc }) => (
            <div key={title} className="flex items-center gap-4 px-4 py-3.5 rounded-2xl"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-br)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: bg, border: `1.5px solid ${br}` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-(--tx) leading-tight">{title}</p>
                <p className="text-xs text-(--tx-sub) mt-0.5 leading-snug">{desc}</p>
              </div>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color, opacity: 0.6 }} />
            </div>
          ))}
        </div>

        {/* Bottom spacer so content doesn't hide behind fixed footer */}
        <div className="h-28" />
      </div>

      {/* Fixed bottom — progress + footer */}
      <div className="relative z-10 px-6 pb-8 pt-4 shrink-0"
        style={{ borderTop: '1px solid var(--card-br)', background: 'var(--bg)' }}>

        {/* Progress bar */}
        <div className="mb-4 anim-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-(--tx-dim) text-[11px]">Taking you to your dashboard</p>
            <p className="text-(--tx-dim) text-[11px] font-mono">{Math.round(progress)}%</p>
          </div>
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--card-br)' }}>
            <div className="h-full rounded-full"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #1D9E75, #2EBF8E)', transition: 'width 0.1s linear' }} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-base">🌾</span>
          <p className="text-(--tx-dim) text-[11px] tracking-wide">
            Built for <span className="text-brand-green font-semibold">Nigerian farmers</span>
          </p>
          <span className="text-base">🇳🇬</span>
        </div>

      </div>
    </div>
  )
}