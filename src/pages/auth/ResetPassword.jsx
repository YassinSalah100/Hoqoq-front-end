import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { authApi } from '../../lib/api'
import { isStrongPassword, WEAK_PASSWORD_MESSAGE } from '../../lib/passwordPolicy'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!isStrongPassword(password)) {
      setError(WEAK_PASSWORD_MESSAGE)
      return
    }
    if (password !== confirm) {
      setError('كلمتا المرور غير متطابقتين')
      return
    }

    setLoading(true)
    try {
      await authApi.resetPassword(token, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      setError(err.message === 'Invalid or expired reset token' ? 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية' : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-6" dir="rtl">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-card border border-paper-line p-8">
        <h1 className="font-display text-2xl font-bold text-ink-800 mb-1">تعيين كلمة مرور جديدة</h1>
        <p className="text-sm text-ink-400 mb-6">أدخل كلمة المرور الجديدة لحسابك</p>

        {!token && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-brass-100 border border-brass-200 mb-4">
            <AlertCircle size={14} className="text-brass-700 shrink-0" />
            <p className="text-sm text-brass-700">رابط إعادة التعيين غير صالح أو منتهي الصلاحية.</p>
          </div>
        )}

        {done ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-brass-100 border border-brass-200">
            <CheckCircle2 size={16} className="text-brass-600 shrink-0" />
            <p className="text-sm text-brass-700">تم تحديث كلمة المرور بنجاح، جاري تحويلك لتسجيل الدخول...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700">كلمة المرور الجديدة</label>
              <input
                type="password"
                required
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-paper-line bg-paper text-sm focus:outline-none focus:ring-2 focus:ring-brass-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700">تأكيد كلمة المرور</label>
              <input
                type="password"
                required
                dir="ltr"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-paper-line bg-paper text-sm focus:outline-none focus:ring-2 focus:ring-brass-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rust-100 border border-rust-200">
                <AlertCircle size={14} className="text-rust-500 shrink-0" />
                <p className="text-sm text-rust-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full bg-brass-500 hover:bg-brass-600 disabled:bg-brass-300 text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'تحديث كلمة المرور'}
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
