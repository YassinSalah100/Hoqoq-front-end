import { AlertCircle, Loader2 } from 'lucide-react'

export function LoadingBlock({ label = 'جاري التحميل...' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-ink-400">
      <Loader2 size={16} className="animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function ErrorBlock({ error, onRetry }) {
  return (
    <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-rust-100 border border-rust-200">
      <div className="flex items-center gap-2">
        <AlertCircle size={15} className="text-rust-500 shrink-0" />
        <p className="text-sm text-rust-600">{error?.message ?? 'حدث خطأ غير متوقع، الرجاء المحاولة لاحقاً'}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="text-sm font-medium text-rust-600 hover:underline shrink-0">
          إعادة المحاولة
        </button>
      )}
    </div>
  )
}
