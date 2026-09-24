/**
 * Bluestem mark and wordmark (BRAND_GUIDE.md): an RSM Blue stem rising into an
 * RSM Green leaf. The wordmark splits "blue" / "stem" — on light UI blue + Midnight,
 * on Midnight white + green.
 */
export default function BluestemMark({ className = 'w-8 h-8' }) {
  return (
    <svg viewBox="40 30 200 220" className={className} aria-hidden="true">
      <path d="M62 232 Q75 150 150 130" stroke="#009CDE" strokeWidth="26" strokeLinecap="round" fill="none" />
      <g transform="translate(155 108) rotate(-45)">
        <path d="M-72 0 C-40 -50 40 -50 72 0 C40 50 -40 50 -72 0 Z" fill="#3F9C35" />
        <path d="M-45 0 L45 0" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export function BluestemWordmark({ onDark = false, className = '' }) {
  return (
    <span
      className={`font-heading font-semibold leading-none tracking-[-0.01em] ${onDark ? 'text-white' : 'text-primary-500'} ${className}`}
      aria-label="bluestem"
    >
      blue<span className={onDark ? 'text-brand-green' : 'text-midnight-900'}>stem</span>
    </span>
  )
}
