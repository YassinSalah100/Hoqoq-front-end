import { useState } from 'react'
import {
  Briefcase,
  CalendarDays,
  Users,
  ListChecks,
  FileText,
  Wallet,
  ShieldCheck,
  Building2,
  MailCheck,
  Download,
  UserCog,
  Monitor,
  Wifi,
  Check,
} from 'lucide-react'
import { Header, Footer, DownloadButton } from './Chrome'
import { CONTACT_EMAIL, SYSTEM_REQUIREMENTS } from './config'

const FEATURES = [
  { icon: Briefcase, title: 'إدارة القضايا', text: 'ملف متكامل لكل قضية: بياناتها، المحكمة والدائرة، الموكلون والخصوم، والحالة من المسودة حتى الإغلاق والأرشفة.' },
  { icon: CalendarDays, title: 'الجلسات والتقويم', text: 'جدولة الجلسات ومتابعة نتائجها وتأجيلها، مع تقويم موحّد يجمع الجلسات والمهام والمواعيد.' },
  { icon: Users, title: 'الموكلون والخصوم', text: 'بيانات الموكلين والخصوم داخل كل قضية، مع التعرّف على الموكل المتكرر عبر قضايا متعددة.' },
  { icon: ListChecks, title: 'المهام والمتابعة', text: 'توزيع المهام على فريقك بأولويات ومواعيد استحقاق، وتنبيه بالمهام المتأخرة.' },
  { icon: FileText, title: 'المستندات', text: 'حفظ مستندات القضايا وتصنيفها والاحتفاظ بكل إصداراتها السابقة دون حذف.' },
  { icon: Wallet, title: 'الإدارة المالية', text: 'الأتعاب المتفق عليها والدفعات والمتبقي لكل قضية ولكل موكل، مع تقارير مالية للمكتب.' },
  { icon: UserCog, title: 'صلاحيات دقيقة', text: 'يحدد مدير المكتب ما يراه ويفعله كل موظف، وعلى مستوى كل قضية على حدة.' },
  { icon: Building2, title: 'بيانات كل مكتب منفصلة', text: 'لا يطّلع أي مكتب على بيانات مكتب آخر؛ الفصل مُطبَّق على مستوى الخادم في كل طلب.' },
]

const STEPS = [
  { icon: MailCheck, title: 'نُنشئ حساب مكتبك', text: `تواصل معنا، ونُنشئ مساحة مكتبك وحساب المالك، فتصلك رسالة تفعيل على بريدك الإلكتروني.` },
  { icon: Download, title: 'حمّل التطبيق وفعّل حسابك', text: 'ثبّت حقوق على جهازك، ثم افتح رابط التفعيل واضغط «فتح تطبيق حقوق» لاختيار كلمة المرور.' },
  { icon: Users, title: 'أضف فريقك وابدأ العمل', text: 'أنشئ حسابات المحامين والموظفين بصلاحياتهم، وابدأ بإدارة قضاياك وجلساتك من مكان واحد.' },
]

const SCREENS = [
  { src: '/landing/screens/dashboard.webp', title: 'لوحة التحكم', text: 'نظرة سريعة على قضايا مكتبك وجلساتك القادمة وأرقامه المالية.' },
  { src: '/landing/screens/cases.webp', title: 'القضايا', text: 'كل قضايا المكتب بحالاتها ومحاكمها والمحامي المسؤول عنها.' },
  { src: '/landing/screens/hearings.webp', title: 'الجلسات', text: 'جدول الجلسات القادمة والسابقة ونتائجها.' },
  { src: '/landing/screens/finance.webp', title: 'التقارير المالية', text: 'الأتعاب والمحصَّل والمستحق لكل قضية وكل موكل.' },
]

function Screenshot({ src, alt, className = '' }) {
  return (
    <div className={`rounded-2xl overflow-hidden border border-brand-border bg-white shadow-[0_30px_60px_-30px_rgba(43,32,16,0.45)] ${className}`}>
      <div className="flex items-center gap-1.5 px-4 h-8 bg-brand-cream border-b border-brand-border" dir="ltr">
        <span className="w-2.5 h-2.5 rounded-full bg-[#e4d6b8]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#e4d6b8]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#e4d6b8]" />
      </div>
      <img src={src} alt={alt} loading="lazy" className="block w-full h-auto" />
    </div>
  )
}

function Section({ id, eyebrow, title, intro, children, className = '' }) {
  return (
    <section id={id} className={`scroll-mt-20 py-16 sm:py-24 ${className}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-10 sm:mb-14">
          {eyebrow && <p className="text-sm font-semibold text-brand-gold mb-3">{eyebrow}</p>}
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-brown leading-snug">{title}</h2>
          {intro && <p className="mt-4 text-[16px] sm:text-lg text-brand-brown/65 leading-relaxed">{intro}</p>}
        </div>
        {children}
      </div>
    </section>
  )
}

export default function Home() {
  const [active, setActive] = useState(0)
  return (
    <div className="min-h-screen bg-brand-cream-light text-brand-brown" dir="rtl">
      <Header />

      {/* Hero */}
      <section className="relative z-10 bg-brand-brown text-brand-cream">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_20%_20%,#D9B45E_0,transparent_45%),radial-gradient(circle_at_85%_70%,#B98B33_0,transparent_40%)]" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-0 grid lg:grid-cols-[1fr_1.15fr] gap-10 lg:gap-12 items-center">
          <div className="text-center lg:text-right pb-6 lg:pb-20">
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-gold/40 px-3.5 py-1 text-[13px] text-brand-gold-light mb-6">
              <ShieldCheck size={15} />
              منصة إدارة الأعمال القانونية
            </p>
            <h1 className="font-display text-[34px] sm:text-5xl lg:text-[54px] font-bold leading-[1.25]">
              أدِر مكتب المحاماة
              <br />
              <span className="text-brand-gold-light">بدقة ووضوح وثقة</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-brand-cream/75 leading-relaxed max-w-xl mx-auto lg:mx-0">
              حقوق يجمع قضاياك وجلساتك وموكليك ومهام فريقك ومستنداتك وحساباتك في تطبيق واحد لنظام Windows، مع صلاحيات دقيقة لكل عضو في المكتب.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <DownloadButton size="lg" />
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-xl border border-brand-cream/25 px-7 py-3.5 text-base text-brand-cream hover:bg-white/5 transition-colors"
              >
                تعرّف على المزايا
              </a>
            </div>
            <p className="mt-4 text-[13px] text-brand-cream/50">Windows 10 / 11 — 64-bit · يتطلب اتصالًا بالإنترنت</p>
          </div>
          <div className="lg:-mb-16 lg:translate-y-6">
            <Screenshot src="/landing/screens/dashboard.webp" alt="لوحة تحكم تطبيق حقوق" />
          </div>
        </div>
      </section>

      {/* Features */}
      <Section
        id="features"
        eyebrow="المزايا"
        title="كل ما يحتاجه مكتبك في مكان واحد"
        intro="صُمّم حقوق لطبيعة عمل مكاتب المحاماة في مصر: من فتح القضية حتى تحصيل الأتعاب."
        className="pt-28 sm:pt-36"
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl bg-white border border-brand-border p-6 hover:border-brand-gold/50 hover:shadow-[0_12px_30px_-18px_rgba(43,32,16,0.35)] transition">
              <div className="w-11 h-11 rounded-xl bg-brand-cream flex items-center justify-center text-brand-gold mb-4">
                <Icon size={22} />
              </div>
              <h3 className="font-semibold text-[17px] mb-2">{title}</h3>
              <p className="text-[14.5px] text-brand-brown/65 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section id="how" eyebrow="كيف يعمل" title="ابدأ في ثلاث خطوات" className="bg-brand-cream">
        <div className="grid md:grid-cols-3 gap-5">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="relative rounded-2xl bg-white border border-brand-border p-7">
              <span className="absolute top-5 left-5 font-display text-4xl font-bold text-brand-gold/20">{(i + 1).toLocaleString('ar-EG')}</span>
              <div className="w-12 h-12 rounded-xl bg-brand-brown text-brand-gold-light flex items-center justify-center mb-5">
                <Icon size={22} />
              </div>
              <h3 className="font-semibold text-lg mb-2">{title}</h3>
              <p className="text-[15px] text-brand-brown/65 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
        <p className="text-center mt-8 text-[15px] text-brand-brown/70">
          لطلب حساب لمكتبك راسلنا على{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} dir="ltr" className="text-brand-gold font-medium hover:underline">
            {CONTACT_EMAIL}
          </a>
        </p>
      </Section>

      {/* Screenshots */}
      <Section id="screens" eyebrow="من داخل التطبيق" title="واجهة عربية واضحة ومريحة" intro="صُممت الواجهة بالكامل باللغة العربية ومن اليمين إلى اليسار.">
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {SCREENS.map((s, i) => (
            <button
              key={s.src}
              type="button"
              onClick={() => setActive(i)}
              className={`px-4 py-2 rounded-full text-sm border transition ${
                active === i ? 'bg-brand-brown text-brand-cream border-brand-brown' : 'bg-white border-brand-border text-brand-brown/70 hover:border-brand-gold/60'
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
        <div className="max-w-5xl mx-auto">
          <Screenshot src={SCREENS[active].src} alt={SCREENS[active].title} />
          <p className="text-center mt-5 text-brand-brown/65">{SCREENS[active].text}</p>
        </div>
      </Section>

      {/* Download */}
      <section id="download" className="scroll-mt-20 py-16 sm:py-24 bg-brand-brown text-brand-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-brand-gold-light mb-6">
            <Monitor size={30} />
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold">حمّل حقوق لنظام Windows</h2>
          <p className="mt-4 text-brand-cream/70 text-lg">تطبيق مكتب المحاماة للمالك والمحامين والموظفين.</p>
          <div className="mt-8">
            <DownloadButton size="lg" />
          </div>
          <ul className="mt-8 flex flex-col sm:flex-row flex-wrap justify-center gap-x-8 gap-y-2 text-[14px] text-brand-cream/70">
            {SYSTEM_REQUIREMENTS.map((req) => (
              <li key={req} className="inline-flex items-center justify-center gap-2">
                <Check size={15} className="text-brand-gold" />
                {req}
              </li>
            ))}
          </ul>
          <div className="mt-10 grid sm:grid-cols-2 gap-4 text-right">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <p className="font-semibold text-brand-gold-light mb-1.5 flex items-center gap-2">
                <Wifi size={17} /> يعمل عبر الإنترنت
              </p>
              <p className="text-[14px] text-brand-cream/65 leading-relaxed">
                تُحفظ بيانات مكتبك على خوادم حقوق المركزية، وإذا انقطع الاتصال يبقى التطبيق مستقرًا ويعود للعمل تلقائيًا عند عودته.
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <p className="font-semibold text-brand-gold-light mb-1.5 flex items-center gap-2">
                <ShieldCheck size={17} /> عند التثبيت لأول مرة
              </p>
              <p className="text-[14px] text-brand-cream/65 leading-relaxed">
                قد يعرض Windows تنبيه «Windows protected your PC». اضغط «More info» ثم «Run anyway» لمتابعة التثبيت.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
