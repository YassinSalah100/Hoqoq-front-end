import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Eye, EyeOff, LogIn, AlertCircle, Briefcase, Gavel, Sparkles, ShieldCheck } from 'lucide-react'
import { getDefaultRoute } from '../../data/auth'
import { useAuth } from '../../context/AuthContext'

function SealIcon({ size = 64 }) {
  return <img src="/logo.png" alt="حقوق" width={size} height={size} className="object-contain" style={{ width: size, height: size }} />
}

function ArabesqueBackground() {
  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full opacity-[0.08] text-white">
      <defs>
        <pattern id="arabesque" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
          <polygon
            points="50,10 61,35 88,35 67,57 76,84 50,68 24,84 33,57 12,35 39,35"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
            opacity="0.6"
          />
          <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
          <polygon points="0,0 8,5 0,10 -8,5" fill="none" stroke="currentColor" strokeWidth="0.4" opacity="0.3" transform="translate(0,0)" />
          <polygon points="0,0 8,5 0,10 -8,5" fill="none" stroke="currentColor" strokeWidth="0.4" opacity="0.3" transform="translate(100,0)" />
          <polygon points="0,0 8,5 0,10 -8,5" fill="none" stroke="currentColor" strokeWidth="0.4" opacity="0.3" transform="translate(0,100)" />
          <polygon points="0,0 8,5 0,10 -8,5" fill="none" stroke="currentColor" strokeWidth="0.4" opacity="0.3" transform="translate(100,100)" />
        </pattern>
      </defs>
      <rect width="200" height="200" fill="url(#arabesque)" />
    </svg>
  )
}

const FEATURES = [
  { icon: Briefcase, label: 'إدارة القضايا' },
  { icon: Gavel, label: 'جدولة الجلسات' },
  { icon: Sparkles, label: 'مساعد ذكي' },
]

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [showMfaField, setShowMfaField] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { user } = await login(email, password, mfaCode)
      navigate(getDefaultRoute(user))
    } catch (err) {
      // BR-001: never reveal which field was wrong.
      if (err.status === 401 || err.status === 400 || err.status === 404) {
        setError('بيانات الدخول غير صحيحة')
      } else if (err.status >= 500) {
        setError('تعذر الاتصال بالخادم حالياً، الرجاء المحاولة لاحقاً')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" dir="rtl">
      <div className="hidden md:flex md:w-1/2 relative bg-ink-800 text-white flex-col items-center justify-center p-12 overflow-hidden">
        <ArabesqueBackground />

        <div className="relative flex flex-col items-center text-center">
          <div className="mb-4 transition-transform duration-300 hover:rotate-45">
            <SealIcon size={64} />
          </div>
          <h1 className="font-display text-4xl font-bold">حقوق</h1>
          <p className="text-ink-200 font-light mt-2 mb-6">منصة إدارة الأعمال القانونية</p>

          <div className="w-16 h-px bg-ink-600 mb-6" />

          <p className="font-display italic text-lg text-brass-300 max-w-xs leading-relaxed">
            "نُيسِّر العمل القانوني حتى تركِّزوا على العدالة"
          </p>

          <div className="flex items-center gap-6 mt-10">
            {FEATURES.map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-sm text-ink-100">
                <Icon size={14} className="text-brass-400" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-sm py-8">
          <div className="md:hidden flex justify-center mb-6">
            <SealIcon size={48} />
          </div>

          <h1 className="font-display text-2xl font-bold text-ink-800 mb-1">أهلاً بعودتك</h1>
          <p className="text-sm text-ink-400 mb-6">سجّل الدخول إلى مكتبك القانوني</p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-700">البريد الإلكتروني</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@lawfirm.sa"
                  dir="ltr"
                  className="w-full pr-4 pl-9 py-2.5 rounded-xl border border-paper-line bg-paper text-ink-900 placeholder:text-ink-300 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500 focus:border-transparent transition-all"
                />
                <Mail size={14} className="absolute left-3 top-3 text-ink-300" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-ink-700">كلمة المرور</label>
                <Link to="/forgot-password" className="text-xs text-brass-600 hover:text-brass-700 hover:underline">
                  نسيت كلمة المرور؟
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  dir="ltr"
                  className="w-full pr-4 pl-9 py-2.5 rounded-xl border border-paper-line bg-paper text-ink-900 placeholder:text-ink-300 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute left-3 top-3 text-ink-300 hover:text-ink-500"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Only Firm Admin accounts ever have MFA enabled, and the backend
                deliberately returns the same generic error whether the
                password or the code was wrong (no account-enumeration
                signal) — so this stays a manual, collapsed-by-default toggle
                instead of auto-appearing after a failed attempt. */}
            {showMfaField ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-ink-700">رمز المصادقة الثنائية</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    dir="ltr"
                    className="w-full pr-4 pl-9 py-2.5 rounded-xl border border-paper-line bg-paper text-ink-900 placeholder:text-ink-300 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-brass-500 focus:border-transparent transition-all"
                  />
                  <ShieldCheck size={14} className="absolute left-3 top-3 text-ink-300" />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowMfaField(true)}
                className="text-xs text-ink-400 hover:text-brass-700 text-right w-fit"
              >
                لديك رمز مصادقة ثنائية؟
              </button>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="accent-brass-500 w-4 h-4 rounded"
              />
              <label htmlFor="remember" className="text-sm text-ink-500">
                تذكرني
              </label>
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
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري الدخول...
                </>
              ) : (
                <>
                  دخول
                  <LogIn size={14} />
                </>
              )}
            </button>
          </form>

          {/* v1 is invite-only (master spec Part 0): no public signup. */}
          <p className="text-xs text-ink-300 text-center mt-6 leading-relaxed">
            الوصول إلى المنصة بالدعوة فقط.
            <br />
            للحصول على حساب لمكتبك، تواصل مع إدارة المنصة.
          </p>
        </div>
      </div>
    </div>
  )
}
