// AppLogo — leaf icon + FarmXnap wordmark
// size: 'sm' (nav default) | 'lg' (landing/welcome)

export default function AppLogo({ size = 'sm' }) {
  const dim = size === 'lg' ? 32 : 22

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size === 'lg' ? 10 : 7 }}>
      {/* Leaf SVG */}
      <svg xmlns="http://www.w3.org/2000/svg" width={dim} height={dim} viewBox="0 0 80 80" style={{ flexShrink: 0 }}>
        <path d="M40 72 C16 56, 8 28, 24 8 C30 0, 50 0, 56 8 C72 28, 64 56, 40 72Z" fill="#1D9E75"/>
        <path d="M40 68 L40 12" fill="none" stroke="#0F6E56" strokeWidth="2" strokeLinecap="round"/>
        <path d="M40 52 L26 40" fill="none" stroke="#0F6E56" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M40 38 L28 28" fill="none" stroke="#0F6E56" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M40 26 L32 20" fill="none" stroke="#0F6E56" strokeWidth="1" strokeLinecap="round"/>
        <path d="M40 52 L54 40" fill="none" stroke="#0F6E56" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M40 38 L52 28" fill="none" stroke="#0F6E56" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M40 26 L48 20" fill="none" stroke="#0F6E56" strokeWidth="1" strokeLinecap="round"/>
        <path d="M4 22 L4 4 L22 4" fill="none" stroke="#2EBF8E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M76 22 L76 4 L58 4" fill="none" stroke="#2EBF8E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4 58 L4 76 L22 76" fill="none" stroke="#2EBF8E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M76 58 L76 76 L58 76" fill="none" stroke="#2EBF8E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {/* Wordmark — reuses app-logo class from index.css */}
      <span className={size === 'lg' ? 'landing-logo' : 'app-logo'}>
        Farm<span>X</span>nap
      </span>
    </div>
  )
}