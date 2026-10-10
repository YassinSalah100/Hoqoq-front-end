import { useConnectivity } from '../../lib/connectivity'

const VARIANTS = {
  primary: 'bg-brass-500 hover:bg-brass-600 text-white',
  secondary: 'bg-white border border-paper-line hover:bg-paper-soft text-ink-700',
  ghost: 'text-ink-600 hover:bg-paper-soft',
  danger: 'bg-rust-500 hover:bg-rust-600 text-white',
}

export const NEEDS_CONNECTION_HINT = 'يتطلب اتصالاً بالإنترنت'

// `requiresConnection` marks buttons that save to the backend: they are
// disabled while offline. Cancel/close buttons leave it off.
export default function Button({ variant = 'primary', className = '', children, requiresConnection = false, disabled, title, ...props }) {
  const online = useConnectivity()
  const blocked = requiresConnection && !online
  return (
    <button
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      disabled={disabled || blocked}
      title={blocked ? NEEDS_CONNECTION_HINT : title}
      {...props}
    >
      {children}
    </button>
  )
}
