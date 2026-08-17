// Like Badge, but keyed by backend enum CODE (e.g. "OPEN") rather than by
// display label, since every enum map in src/data/enums.js is { CODE: { label, bg, text } }.
export default function EnumBadge({ code, map, dot = false, className = '' }) {
  const entry = map?.[code] ?? { label: code, bg: 'bg-paper-soft', text: 'text-ink-500' }
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${entry.bg} ${entry.text} ${className}`}
    >
      {dot && entry.dot && <span className={`w-1.5 h-1.5 rounded-full ${entry.dot}`} />}
      {entry.label}
    </span>
  )
}
