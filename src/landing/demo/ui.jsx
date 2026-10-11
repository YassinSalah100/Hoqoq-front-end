// Small building blocks styled exactly like the real app (ink / brass / paper tokens).
import { X } from 'lucide-react'
import { CASE_STATUS, initials } from './demoData'

export function Avatar({ name, size = 'md', className = '' }) {
  const sizes = { sm: 'w-7 h-7 text-[11px]', md: 'w-8 h-8 text-xs' }
  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-brass-100 text-brass-700 font-semibold shrink-0 ${sizes[size]} ${className}`}>
      {initials(name)}
    </span>
  )
}

export function StatusPill({ status }) {
  const meta = CASE_STATUS[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${meta.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

export function Badge({ meta }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${meta.cls}`}>{meta.label}</span>
}

export function Card({ className = '', children }) {
  return <div className={`bg-white rounded-xl shadow-card border border-paper-line ${className}`}>{children}</div>
}

export function Btn({ variant = 'primary', className = '', children, ...props }) {
  const v = {
    primary: 'bg-brass-500 hover:bg-brass-600 text-white',
    secondary: 'bg-white border border-paper-line hover:bg-paper-soft text-ink-700',
    ghost: 'text-ink-600 hover:bg-paper-soft',
    dark: 'bg-ink-800 hover:bg-ink-900 text-white',
  }
  return (
    <button type="button" className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-50 ${v[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

export const inputCls =
  'w-full px-3 py-2 rounded-lg border border-paper-line bg-paper text-[13px] focus:outline-none focus:ring-2 focus:ring-brass-500/30 focus:border-brass-500'

export function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-medium text-ink-700">{label}</span>
      {children}
    </label>
  )
}

// In-frame modal (stays inside the demo window, like the app's dialogs).
export function Modal({ title, onClose, children }) {
  return (
    <div className="absolute inset-0 z-30 flex items-start sm:items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-ink-900/40" aria-hidden="true" />
      <div role="dialog" aria-label={title} className="hero-in relative w-full max-w-md bg-white rounded-xl shadow-pop overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-paper-line">
          <h4 className="font-semibold text-ink-800 text-[15px]">{title}</h4>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="p-1 rounded-md text-ink-400 hover:text-ink-700 hover:bg-paper-soft">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function PageHeader({ title, breadcrumb, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div className="min-w-0">
        {breadcrumb && <div className="flex items-center gap-1.5 text-[12px] text-ink-400 mb-1">{breadcrumb}</div>}
        <h2 className="font-display text-[22px] sm:text-2xl font-bold text-ink-800 truncate">{title}</h2>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
