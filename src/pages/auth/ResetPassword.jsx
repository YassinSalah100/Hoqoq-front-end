import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { authApi } from '../../lib/api'
import { tokenFromPasted, useLinkToken } from '../../lib/linkToken'

const ERROR_MESSAGES = {
  'Invalid or expired reset token': 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية — اطلب رابطًا جديدًا',
  'Reset token was already used': 'تم استخدام هذا الرابط من قبل — اطلب رابطًا جديدًا إن احتجت',
}
import { isStrongPassword, WEAK_PASSWORD_MESSAGE } from '../../lib/passwordPolicy'

export default function ResetPassword() {
  const navigate = useNavigate()
  // From a hoqooq:// link (token in the address), or pasted from the email.
  const linkToken = useLinkToken()
  const [pasted, setPasted] = useState('')
  const token = linkToken || tokenFromPasted(pasted)
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
      setError(ERROR_MESSAGES[err.message] ?? err.message ?? 'تعذر تحديث كلمة المرور')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-6" dir="rtl">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-card border border-paper-line p-8">
        <h1 className="font-display text-2xl font-bold text-ink-800 mb-1">تعيين كلمة مرور جديدة</h1>
        <p className="text-sm text-ink-400 mb-6">أدخل كلمة المرور الجديدة لحسابك</p>

        {done ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-brass-100 border border-brass-200">
            <CheckCircle2 size={16} className="text-brass-600 shrink-0" />
            <p className="text-sm text-brass-700">تم تحديث كلمة المرور بنجاح، جاري تحويلك لتسجيل الدخول...</p>
          </div>
        ) : !token ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-700">رابط إعادة تعيين كلمة المرور</label>
            <input
              dir="ltr"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="https://…/reset-password?token=…"
              className="w-full px-4 py-2.5 rounded-xl border border-paper-line bg-paper text-sm focus:outline-none focus:ring-2 focus:ring-brass-500 focus:border-transparent"
            />
            <p className="text-xs text-ink-400">انسخ الرابط من رسالة إعادة التعيين في بريدك والصقه هنا.</p>
            {pasted.trim() && (
              <div className="flex items-center gap-2 p-3 mt-2 rounded-xl bg-rust-100 border border-rust-200">
                <AlertCircle size={14} className="text-rust-500 shrink-0" />
                <p className="text-sm text-rust-600">هذا ليس رابطًا صحيحًا — انسخ الرابط كاملًا من البريد.</p>
              </div>
            )}
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
