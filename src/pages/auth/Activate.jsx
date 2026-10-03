import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { authApi } from '../../lib/api'
import { isStrongPassword, PASSWORD_RULE_HINT, WEAK_PASSWORD_MESSAGE } from '../../lib/passwordPolicy'

const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-paper-line bg-paper text-sm focus:outline-none focus:ring-2 focus:ring-brass-500 focus:border-transparent'

const ERROR_MESSAGES = {
  'Invalid or expired activation token': 'رابط التفعيل غير صالح أو منتهي الصلاحية',
  'Invitation was already used': 'تم استخدام رابط التفعيل هذا من قبل — يمكنك تسجيل الدخول مباشرة',
  'Employee credentials are administered by the Firm Admin': 'بيانات دخول الموظفين يحددها مدير المكتب، تواصل معه',
}

// One-time Firm Admin activation from the invitation email — just
// POST /auth/activate { token, newPassword }. Employees never come through
// here: their credentials are set by the Firm Admin directly.
export default function Activate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!isStrongPassword(newPassword)) {
      setError(WEAK_PASSWORD_MESSAGE)
      return
    }
    if (newPassword !== confirm) {
      setError('كلمتا المرور غير متطابقتين')
      return
    }

    setSaving(true)
    try {
      await authApi.activate(token, newPassword)
      setDone(true)
      setTimeout(() => navigate('/login'), 1800)
    } catch (err) {
      setError(ERROR_MESSAGES[err.message] ?? err.message ?? 'تعذر تفعيل الحساب')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-6" dir="rtl">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-card border border-paper-line p-8">
        <h1 className="font-display text-2xl font-bold text-ink-800 mb-1">تفعيل الحساب</h1>
        <p className="text-sm text-ink-400 mb-6">اختر كلمة مرور لحسابك لتتمكن من تسجيل الدخول</p>

        {!token ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rust-100 border border-rust-200">
            <AlertCircle size={14} className="text-rust-500 shrink-0" />
            <p className="text-sm text-rust-600">رابط التفعيل غير صالح — تأكد من فتح نفس الرابط المُرسل إلى بريدك الإلكتروني.</p>
          </div>
        ) : done ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-brass-100 border border-brass-200">
            <CheckCircle2 size={16} className="text-brass-600 shrink-0" />
            <p className="text-sm text-brass-700">تم تفعيل حسابك بنجاح، جاري تحويلك لتسجيل الدخول...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700">كلمة المرور الجديدة</label>
              <input
                type="password"
                required
                autoComplete="new-password"
                dir="ltr"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
              />
              <p className="text-xs text-ink-300">{PASSWORD_RULE_HINT}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700">تأكيد كلمة المرور</label>
              <input
                type="password"
                required
                autoComplete="new-password"
                dir="ltr"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
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
              disabled={saving}
              className="w-full bg-brass-500 hover:bg-brass-600 disabled:bg-brass-300 text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'تفعيل الحساب'}
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
