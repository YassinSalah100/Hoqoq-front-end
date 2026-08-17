export default function Badge({ label, map, dot = false, className = '' }) {
  const style = map?.[label] ?? { bg: 'bg-paper-soft', text: 'text-ink-500' }
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text} ${className}`}
    >
      {dot && style.dot && <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
      {label}
    </span>
  )
}
