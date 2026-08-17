import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react'
import { authApi } from '../../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-6" dir="rtl">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-card border border-paper-line p-8">
        <h1 className="font-display text-2xl font-bold text-ink-800 mb-1">استعادة كلمة المرور</h1>
        <p className="text-sm text-ink-400 mb-6">أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين</p>

        {sent ? (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-brass-100 border border-brass-200">
            <CheckCircle2 size={16} className="text-brass-600 shrink-0 mt-0.5" />
            <p className="text-sm text-brass-700">
              إذا كان البريد الإلكتروني مسجلاً لدينا، ستصلك رسالة تحتوي على رابط إعادة تعيين كلمة المرور.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700">البريد الإلكتروني</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@lawfirm.sa"
                  className="w-full pr-4 pl-9 py-2.5 rounded-xl border border-paper-line bg-paper text-sm focus:outline-none focus:ring-2 focus:ring-brass-500 focus:border-transparent"
                />
                <Mail size={14} className="absolute left-3 top-3 text-ink-300" />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rust-100 border border-rust-200">
                <AlertCircle size={14} className="text-rust-500 shrink-0" />
                <p className="text-sm text-rust-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brass-500 hover:bg-brass-600 disabled:bg-brass-300 text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'إرسال رابط إعادة التعيين'}
            </button>
          </form>
        )}

        <p className="text-sm text-ink-500 text-center mt-5">
          <Link to="/login" className="text-brass-600 hover:underline font-medium">
            العودة لتسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  )
}
