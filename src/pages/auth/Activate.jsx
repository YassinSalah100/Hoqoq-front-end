import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react'
import { authApi } from '../../lib/api'
import { LoadingBlock } from '../../components/ui/AsyncState'

const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-paper-line bg-paper text-sm focus:outline-none focus:ring-2 focus:ring-brass-500 focus:border-transparent'

// One-time account activation — the link from the invitation email
// (POST /auth/activation/setup then /auth/activate). Firm Admin accounts
// must also set up an authenticator app here (mfaRequired comes back from
// the setup call); a plain employee just sets their password.
export default function Activate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [setupLoading, setSetupLoading] = useState(true)
  const [setupError, setSetupError] = useState(null)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [secret, setSecret] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) {
      setSetupLoading(false)
      return
    }
    authApi
      .activationSetup(token)
      .then((res) => {
        setMfaRequired(Boolean(res.mfaRequired))
        if (res.mfaRequired && res.provisioningUri) {
          setSecret(res.secret)
          // Generated locally in the browser — the provisioning URI carries
          // the raw MFA secret, so it must never be sent to a third-party
          // QR-rendering service.
          QRCode.toDataURL(res.provisioningUri, { width: 200, margin: 1 })
            .then(setQrDataUrl)
            .catch(() => setQrDataUrl(null))
        }
      })
      .catch((err) => setSetupError(err.message ?? 'رابط التفعيل غير صالح أو منتهي الصلاحية'))
      .finally(() => setSetupLoading(false))
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 12) {
      setError('كلمة المرور يجب أن تكون 12 حرفاً على الأقل')
      return
    }
    if (newPassword !== confirm) {
      setError('كلمتا المرور غير متطابقتين')
      return
    }
    if (mfaRequired && !/^\d{6}$/.test(mfaCode)) {
      setError('أدخل رمز المصادقة الثنائية المكوّن من 6 أرقام')
      return
    }

    setSaving(true)
    try {
      await authApi.activate(token, newPassword, mfaRequired ? mfaCode : undefined)
      setDone(true)
      setTimeout(() => navigate('/login'), 1800)
    } catch (err) {
      setError(err.message ?? 'تعذر تفعيل الحساب')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-6" dir="rtl">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-card border border-paper-line p-8">
        <h1 className="font-display text-2xl font-bold text-ink-800 mb-1">تفعيل الحساب</h1>
        <p className="text-sm text-ink-400 mb-6">أكمل إعداد حسابك لتتمكن من تسجيل الدخول</p>

        {!token && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rust-100 border border-rust-200">
            <AlertCircle size={14} className="text-rust-500 shrink-0" />
            <p className="text-sm text-rust-600">رابط التفعيل غير صالح — تأكد من فتح نفس الرابط المُرسل إلى بريدك الإلكتروني.</p>
          </div>
        )}

        {token && setupLoading && <LoadingBlock label="جاري التحقق من رابط التفعيل..." />}

        {token && !setupLoading && setupError && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rust-100 border border-rust-200">
            <AlertCircle size={14} className="text-rust-500 shrink-0" />
            <p className="text-sm text-rust-600">{setupError}</p>
          </div>
        )}

        {token && !setupLoading && !setupError && (
          done ? (
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
                  minLength={12}
                  dir="ltr"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                />
                <p className="text-xs text-ink-300">12 حرفاً على الأقل</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-ink-700">تأكيد كلمة المرور</label>
                <input
                  type="password"
                  required
                  dir="ltr"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputClass}
                />
              </div>

              {mfaRequired && (
                <div className="rounded-xl border border-paper-line p-4 bg-paper-soft/60">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck size={15} className="text-brass-600" />
                    <p className="text-sm font-medium text-ink-700">إعداد المصادقة الثنائية (إلزامي لملّاك المكاتب)</p>
                  </div>
                  <p className="text-xs text-ink-500 mb-3">
                    امسح الرمز التالي باستخدام تطبيق مصادقة (مثل Google Authenticator)، ثم أدخل الرمز المكوّن من 6 أرقام لتأكيد الإعداد.
                  </p>
                  {qrDataUrl && (
                    <div className="flex justify-center mb-3">
                      <img src={qrDataUrl} alt="QR code لإعداد المصادقة الثنائية" width={180} height={180} className="rounded-lg border border-paper-line" />
                    </div>
                  )}
                  {secret && (
                    <p className="text-xs text-ink-400 text-center mb-3">
                      أو أدخل هذا المفتاح يدوياً: <span dir="ltr" className="font-mono tracking-wider text-ink-600">{secret}</span>
                    </p>
                  )}
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    dir="ltr"
                    className={`${inputClass} text-center tracking-widest`}
                  />
                </div>
              )}

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
          )
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
