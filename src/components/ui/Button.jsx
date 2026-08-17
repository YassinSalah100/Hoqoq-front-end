const VARIANTS = {
  primary: 'bg-brass-500 hover:bg-brass-600 text-white',
  secondary: 'bg-white border border-paper-line hover:bg-paper-soft text-ink-700',
  ghost: 'text-ink-600 hover:bg-paper-soft',
  danger: 'bg-rust-500 hover:bg-rust-600 text-white',
}

export default function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
