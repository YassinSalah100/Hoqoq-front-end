import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Eye, EyeOff, AlertCircle, Briefcase, Gavel, Sparkles, ShieldCheck, Lock, TriangleAlert, ArrowLeft } from 'lucide-react'
import { getDefaultRoute } from '../../data/auth'
import { useAuth } from '../../context/AuthContext'
import BrandMark from '../../components/ui/BrandMark'

const FEATURES = [
  { icon: Briefcase, label: 'إدارة القضايا', desc: 'تتبّع كل قضية من الفتح حتى الحكم' },
  { icon: Gavel, label: 'جدولة الجلسات', desc: 'مواعيد المحاكم بلا تعارض' },
  { icon: Sparkles, label: 'مساعد ذكي', desc: 'ملخصات وتنبيهات تلقائية' },
]

// This project's Tailwind text scale is compact (text-sm = 11.5px), so the
// login form uses explicit pixel sizes to stay comfortably readable.
const inputClass =
  'w-full h-12 pr-4 pl-11 rounded-lg border border-brand-border bg-white text-brand-brown placeholder:text-brand-brown/35 text-[16px] focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold transition'
const labelClass = 'text-[14px] font-medium text-brand-brown'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [showMfaField, setShowMfaField] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function handlePasswordKeyEvent(e) {
    if (typeof e.getModifierState === 'function') setCapsLockOn(e.getModifierState('CapsLock'))
  }

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
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
      } else if (err.status === 429) {
        setError('محاولات دخول كثيرة، الرجاء الانتظار قليلاً ثم المحاولة مرة أخرى')
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
    <div className="min-h-screen flex bg-brand-cream-light" dir="rtl">
      {/* Form column */}
      <div className="flex-1 flex flex-col min-h-screen">
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-[420px]">
            <div className="lg:hidden flex justify-center mb-10">
              <BrandMark size={72} />
            </div>

            <h1 className="font-display text-[32px] leading-tight font-bold text-brand-brown">أهلاً بعودتك</h1>
            <p className="text-[16px] text-brand-tagline mt-2 mb-10">سجّل الدخول للمتابعة إلى مكتبك</p>

            <form onSubmit={handleLogin} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className={labelClass}>البريد الإلكتروني</label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@lawfirm.com"
                    dir="ltr"
                    className={inputClass}
                  />
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-brown/35" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className={labelClass}>كلمة المرور</label>
                  <Link to="/forgot-password" className="text-[14px] text-brand-gold hover:text-brand-tagline font-medium">
                    نسيت كلمة المرور؟
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={handlePasswordKeyEvent}
                    onKeyDown={handlePasswordKeyEvent}
                    placeholder="••••••••"
                    dir="ltr"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-brown/35 hover:text-brand-brown"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {capsLockOn && (
                  <p className="flex items-center gap-1.5 text-[13px] text-brand-tagline">
                    <TriangleAlert size={14} />
                    مفتاح Caps Lock مُفعّل
                  </p>
                )}
              </div>

              {/* Only Firm Admin accounts can have MFA, and the backend
                  deliberately returns the same error for a wrong password or
                  a wrong code (no account-enumeration signal), so the code
                  field stays an opt-in toggle rather than a second screen. */}
              {showMfaField && (
                <div className="flex flex-col gap-2">
                  <label htmlFor="mfaCode" className={labelClass}>رمز المصادقة الثنائية</label>
                  <div className="relative">
                    <input
                      id="mfaCode"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      dir="ltr"
                      className={`${inputClass} tracking-[0.4em]`}
                    />
                    <ShieldCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-brown/35" />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="accent-brand-gold w-4 h-4"
                  />
                  <span className="text-[14px] text-brand-brown/80">تذكرني</span>
                </label>
                {!showMfaField && (
                  <button
                    type="button"
                    onClick={() => setShowMfaField(true)}
                    className="text-[14px] text-brand-brown/60 hover:text-brand-gold"
                  >
                    استخدام رمز التحقق
                  </button>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-rust-100 border border-rust-100">
                  <AlertCircle size={18} className="text-rust-500 shrink-0" />
                  <p className="text-[14px] text-rust-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-brand-gold hover:bg-brand-tagline disabled:opacity-60 text-white text-[16px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري الدخول...
                  </>
                ) : (
                  <>
                    تسجيل الدخول
                    <ArrowLeft size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center justify-center gap-1.5 mt-6 text-[13px] text-brand-brown/55">
              <Lock size={14} />
              اتصال مشفّر — بياناتك محمية
            </div>

            <div className="mt-10 pt-6 border-t border-brand-border text-center text-[14px] text-brand-brown/70">
              ليس لديك حساب؟{' '}
              <a href="mailto:sales@hoqooq.app" className="text-brand-gold hover:text-brand-tagline font-semibold">
                اطلب الدخول لمكتبك
              </a>
            </div>
          </div>
        </div>

        <footer className="px-6 py-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-brand-brown/50">
          <Link to="/privacy" className="hover:text-brand-gold">سياسة الخصوصية</Link>
          <Link to="/terms" className="hover:text-brand-gold">شروط الاستخدام</Link>
          <a href="mailto:support@hoqooq.app" className="hover:text-brand-gold">الدعم الفني</a>
        </footer>
      </div>

      {/* Brand column */}
      <aside className="hidden lg:flex lg:w-[46%] relative bg-brand-brown text-white flex-col overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[32rem] h-[32rem] rounded-full bg-brand-gold/[0.10] blur-[120px]" />
        <div className="absolute -bottom-48 -right-32 w-[30rem] h-[30rem] rounded-full bg-brand-gold/[0.07] blur-[120px]" />
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-brand-gold/30 to-transparent" />

        <div className="relative flex-1 flex flex-col justify-center w-full max-w-lg mx-auto px-12 py-16">
          <BrandMark size={120} variant="dark" className="self-start" />

          <p className="font-display text-[26px] leading-relaxed text-brand-gold-light mt-12 max-w-md">
            نُيسِّر العمل القانوني
            <br />
            حتى تركِّزوا على العدالة.
          </p>

          <div className="mt-12 flex flex-col gap-5 max-w-md">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-lg bg-brand-gold/15 border border-brand-gold/25 flex items-center justify-center shrink-0">
                  <Icon size={20} className="text-brand-gold-light" />
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-white">{label}</p>
                  <p className="text-[14px] text-white/55 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative px-12 py-6 border-t border-white/10 text-[13px] text-white/40 text-center">
          © 2026 حقوق · الإصدار 1.0
        </div>
      </aside>
    </div>
  )
}
