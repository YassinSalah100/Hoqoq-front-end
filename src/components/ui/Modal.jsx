import { X } from 'lucide-react'

const SIZES = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative bg-white rounded-xl shadow-pop w-full ${SIZES[size] ?? SIZES.md} max-h-[90vh] sm:max-h-[85vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-paper-line sticky top-0 bg-white z-10">
          <h3 className="text-base sm:text-lg font-semibold text-ink-800">{title}</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-800 p-1 rounded-lg hover:bg-paper-soft shrink-0">
            <X size={15} />
          </button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  )
}
