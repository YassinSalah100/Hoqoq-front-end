import { useState } from 'react'
import { AlertCircle, Check, Copy, ExternalLink, KeyRound, MailCheck } from 'lucide-react'
import { Header, Footer, DownloadButton } from './Chrome'
import { APP_PROTOCOL } from './config'
import { useLinkToken } from '../lib/linkToken'

const KINDS = {
  activate: {
    icon: MailCheck,
    title: 'تفعيل حساب مالك المكتب',
    intro: 'لإكمال التفعيل واختيار كلمة المرور، افتح تطبيق حقوق على جهازك.',
    appButton: 'فتح تطبيق حقوق للتفعيل',
    appStep: 'من شاشة الدخول اضغط «فعّل حسابك» والصق الرابط.',
    note: 'رابط التفعيل يُستخدم مرة واحدة فقط، وتنتهي صلاحيته بعد 24 ساعة من إرساله.',
  },
  'reset-password': {
    icon: KeyRound,
    title: 'إعادة تعيين كلمة المرور',
    intro: 'لاختيار كلمة مرور جديدة، افتح تطبيق حقوق على جهازك.',
    appButton: 'فتح تطبيق حقوق لتعيين كلمة المرور',
    appStep: 'من شاشة الدخول اضغط «نسيت كلمة المرور؟» ثم الصق الرابط في صفحة التعيين.',
    note: 'الرابط يُستخدم مرة واحدة فقط ولفترة محدودة. إن انتهت صلاحيته اطلب رابطًا جديدًا من التطبيق.',
  },
}

// Opened from the activation / password-reset email. The website never uses
// the token itself: it only hands it to the installed Firm Management app,
// which sends it to the backend. The page loads nothing from other sites and
// the token is removed from the address bar as soon as it's read.
export default function AppHandoff({ kind }) {
  const copy = KINDS[kind]
  const token = useLinkToken()
  const [copied, setCopied] = useState(false)
  const appLink = `${APP_PROTOCOL}://${kind}?token=${token}`
  const pasteLink = `${window.location.origin}/${kind}?token=${token}`
  const Icon = copy.icon

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pasteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      window.prompt('انسخ الرابط التالي:', pasteLink)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-cream-light text-brand-brown" dir="rtl">
      <Header withNav={false} />
      <main className="flex-1 flex items-start sm:items-center justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-lg rounded-3xl bg-white border border-brand-border shadow-[0_30px_60px_-35px_rgba(43,32,16,0.45)] p-6 sm:p-9">
          <div className="w-14 h-14 rounded-2xl bg-brand-brown text-brand-gold-light flex items-center justify-center mb-5">
            <Icon size={26} />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-2">{copy.title}</h1>

          {!token ? (
            <div className="mt-5 flex items-start gap-2.5 p-4 rounded-2xl bg-rust-100 border border-rust-100 text-rust-600">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-[15px] leading-relaxed">الرابط غير مكتمل أو غير صحيح. افتح الرابط كما وصلك في البريد الإلكتروني دون تعديل.</p>
            </div>
          ) : (
            <>
              <p className="text-[16px] text-brand-brown/70 leading-relaxed">{copy.intro}</p>

              <a
                href={appLink}
                className="mt-7 flex items-center justify-center gap-2 w-full rounded-xl bg-brand-gold hover:bg-brand-tagline text-white font-semibold py-3.5 text-[16px] transition-colors"
              >
                <ExternalLink size={18} />
                {copy.appButton}
              </a>
              <p className="mt-3 text-[13px] text-center text-brand-brown/55">
                سيطلب المتصفح الإذن بفتح تطبيق «Hoqooq» — اختر «فتح».
              </p>

              <div className="mt-8 pt-6 border-t border-brand-border">
                <p className="font-semibold mb-3">لم يُفتح التطبيق؟</p>
                <ol className="space-y-2.5 text-[15px] text-brand-brown/70 leading-relaxed list-decimal pr-5">
                  <li>
                    إن لم يكن التطبيق مثبتًا على جهازك، حمّله وثبّته أولًا ثم ارجع إلى هذه الصفحة.
                  </li>
                  <li>
                    أو انسخ الرابط، وافتح التطبيق، ثم {copy.appStep}
                  </li>
                </ol>
                <div className="mt-5 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={copyLink}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-brand-border hover:border-brand-gold/60 py-3 text-[15px] font-medium transition-colors"
                  >
                    {copied ? <Check size={17} className="text-emerald-600" /> : <Copy size={17} />}
                    {copied ? 'تم نسخ الرابط' : 'نسخ الرابط'}
                  </button>
                  <DownloadButton className="flex-1" />
                </div>
              </div>

              <p className="mt-6 text-[13px] text-brand-brown/50 leading-relaxed">{copy.note}</p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
