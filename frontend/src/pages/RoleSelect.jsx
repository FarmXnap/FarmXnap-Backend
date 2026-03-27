import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLogo from '../component/AppLogo'

const ROLES = [
  {
    key:    'farmer',
    emoji:  '🌾',
    title:  "I'm a Farmer",
    tag:    'Diagnose & treat',
    desc:   'Snap a leaf, get instant AI diagnosis, buy the cure from a nearby dealer — all in one tap.',
    perks:  ['Free AI crop scanning', 'Nearby dealer map', 'Escrow-protected payments'],
    path:   '/signup/farmer',
    color:  'text-brand-green',
    border: 'border-brand-green/40',
    bg:     'bg-brand-green/[0.07]',
    dot:    'bg-brand-green',
    accent: '#1D9E75',
  },
  {
    key:    'dealer',
    emoji:  '🏪',
    title:  "I'm an Agro-dealer",
    tag:    'Sell & grow',
    desc:   'List your agro-products, get matched with local farmers who need exactly what you sell.',
    perks:  ['Product storefront', 'Verified farmer leads', 'Direct payouts via Interswitch'],
    path:   '/signup/dealer',
    color:  'text-brand-amber',
    border: 'border-brand-amber/40',
    bg:     'bg-brand-amber/[0.06]',
    dot:    'bg-brand-amber',
    accent: '#EF9F27',
  },
]

export default function RoleSelect() {
  const navigate   = useNavigate()
  const [selected, setSelected] = useState(null)
  const active = ROLES.find(r => r.key === selected)

  return (
    <div className="page-shell grain">
      <div className="orb orb-1" />

      <nav className="app-nav">
        <button className="nav-back" onClick={() => navigate('/')}>← Back</button>
        <AppLogo />
        <div className="w-16" />
      </nav>

      <div className="page-body">
        <header className="page-header">
          <p className="page-eyebrow" style={{
            color: selected === 'dealer' ? 'rgba(239,159,39,0.7)' : undefined
          }}>
            {selected === 'farmer' ? 'Step 1 of 3 · Farmer' : selected === 'dealer' ? 'Step 1 of 3 · Agro-dealer' : 'Get started'}
          </p>
          <h1 className="page-title">How will you use FarmXnap?</h1>
          <p className="page-subtitle">Choose your role to continue</p>
        </header>

        {/* Progress bar — step 1 active */}
        <div className="flex items-center gap-2 mb-6 anim-1">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-1.5 rounded-full transition-all"
              style={{
                flex: i === 0 ? 1 : undefined,
                width: i > 0 ? 24 : undefined,
                background: i === 0
                  ? (selected === 'dealer' ? '#EF9F27' : '#1D9E75')
                  : 'var(--card-br)',
              }} />
          ))}
        </div>

        <div className="flex flex-col gap-3 anim-1">
          {ROLES.map(role => {
            const isSel = selected === role.key
            return (
              <button
                key={role.key}
                onClick={() => setSelected(isSel ? null : role.key)}
                className={`w-full text-left rounded-3xl p-5 transition-all active:scale-[0.98] border-[1.5px] ${
                  isSel ? `${role.bg} ${role.border}` : 'bg-(--card-bg) border-(--card-br)'
                }`}
              >
                {/* Always visible: icon + title + radio */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all ${
                      isSel ? `${role.bg} border ${role.border}` : 'bg-(--card-bg) border border-(--card-br)'
                    }`}>
                      {role.emoji}
                    </div>
                    <div>
                      <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 transition-all ${
                        isSel ? role.color : 'text-(--tx-dim)'
                      }`}>{role.tag}</p>
                      <p className="font-syne font-bold text-(--tx) text-base leading-tight">{role.title}</p>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      borderColor: isSel ? role.accent : 'var(--card-br)',
                      background:  isSel ? role.accent : 'transparent',
                    }}>
                    {isSel && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>

                {/* Expanded details — only when selected */}
                {isSel && (
                  <div className="mt-4 anim-1">
                    <div className={`h-px mb-4 ${
                      role.key === 'farmer' ? 'bg-brand-green/20' : 'bg-brand-amber/20'
                    }`} />
                    <p className="text-[13px] text-(--tx-sub) leading-relaxed mb-4">{role.desc}</p>
                    <div className="flex flex-col gap-2">
                      {role.perks.map(p => (
                        <div key={p} className="flex items-center gap-2.5">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${role.dot}`} />
                          <span className="text-xs text-(--tx-sub)">{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <div className="h-24" />
      </div>

      <div className="page-cta">
        <button
          className={`btn-main transition-all ${active ? (active.key === 'dealer' ? 'amber' : '') : 'ghost'}`}
          onClick={() => active && navigate(active.path)}
          disabled={!selected}
        >
          {selected
            ? `Continue as ${active?.key === 'farmer' ? 'Farmer' : 'Agro-dealer'} →`
            : 'Select your role to continue'
          }
        </button>
        <p className="cta-note" style={{ "--cta-link-color": selected === 'dealer' ? "rgba(239,159,39,0.8)" : undefined }}>
          Already have an account?{' '}
          <button onClick={() => navigate('/signin')}>Sign in</button>
        </p>
      </div>
    </div>
  )
}