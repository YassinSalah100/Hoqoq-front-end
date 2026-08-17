const SIZES = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-lg',
}

function initials(name = '') {
  const parts = name.replace(/^(أ\.|د\.)\s*/, '').trim().split(/\s+/)
  return parts.slice(0, 2).map((p) => p[0]).join('')
}

export default function Avatar({ name, size = 'md', className = '' }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-ink-800 text-white font-medium shrink-0 ${SIZES[size]} ${className}`}
    >
      {initials(name)}
    </div>
  )
}
