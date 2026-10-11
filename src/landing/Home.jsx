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
  ChevronDown,
  Languages,
  CircleCheck,
  Gavel,
  Info,
} from 'lucide-react'
import './landing.css'
import { Header, Footer, DownloadButton, BackToTop } from './Chrome'
import Reveal from './Reveal'
import { useReveal, isWindowsDevice } from './motion'
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

const HIGHLIGHTS = [
  { icon: Languages, text: 'واجهة عربية بالكامل' },
  { icon: Gavel, text: 'مصمَّم لمكاتب المحاماة في مصر' },
  { icon: UserCog, text: 'صلاحيات لكل موظف ولكل قضية' },
  { icon: Monitor, text: 'تطبيق لنظام Windows' },
]

const STEPS = [
  { icon: MailCheck, title: 'نُنشئ حساب مكتبك', text: 'تواصل معنا، ونُنشئ مساحة مكتبك وحساب المالك، فتصلك رسالة تفعيل على بريدك الإلكتروني.' },
  { icon: Download, title: 'حمّل التطبيق وفعّل حسابك', text: 'ثبّت حقوق على جهازك، ثم افتح رابط التفعيل واضغط «فتح تطبيق حقوق» لاختيار كلمة المرور.' },
  { icon: Users, title: 'أضف فريقك وابدأ العمل', text: 'أنشئ حسابات المحامين والموظفين بصلاحياتهم، وابدأ بإدارة قضاياك وجلساتك من مكان واحد.' },
]

const SCREENS = [
  { src: '/landing/screens/dashboard.webp', title: 'لوحة التحكم', text: 'نظرة سريعة على قضايا مكتبك وجلساتك القادمة وأرقامه المالية.' },
  { src: '/landing/screens/cases.webp', title: 'القضايا', text: 'كل قضايا المكتب بحالاتها ومحاكمها والمحامي المسؤول عنها.' },
  { src: '/landing/screens/hearings.webp', title: 'الجلسات', text: 'جدول الجلسات القادمة والسابقة ونتائجها.' },
  { src: '/landing/screens/finance.webp', title: 'التقارير المالية', text: 'الأتعاب والمحصَّل والمستحق لكل قضية وكل موكل.' },
]

const FAQ = [
  {
    q: 'كيف أحصل على حساب لمكتبي؟',
    a: `حسابات المكاتب يُنشئها فريق حقوق. راسلنا على ${CONTACT_EMAIL} وسنُنشئ مساحة مكتبك وحساب المالك، ثم تصلك رسالة تفعيل لاختيار كلمة المرور.`,
  },
  {
    q: 'هل يحتاج التطبيق إلى اتصال بالإنترنت؟',
    a: 'نعم. تُحفظ بيانات مكتبك على خوادم حقوق المركزية حتى يعمل فريقك كله على البيانات نفسها. إذا انقطع الاتصال يبقى التطبيق مفتوحًا ومستقرًا، ويعود للعمل تلقائيًا عند عودة الاتصال دون فقدان ما حُفظ.',
  },
  {
    q: 'كيف يضيف المالك المحامين والموظفين؟',
    a: 'من صفحة «الموظفين» داخل التطبيق يُنشئ مدير المكتب حساب كل موظف ويحدد صلاحياته، ثم يمكنه منحه صلاحيات إضافية على قضايا بعينها من تبويب «الفريق» داخل القضية.',
  },
  {
    q: 'ظهرت رسالة «Windows protected your PC» عند التثبيت، ماذا أفعل؟',
    a: 'هذا تنبيه يظهر مع البرامج الجديدة. اضغط «More info» ثم «Run anyway» لمتابعة التثبيت. حمّل التطبيق دائمًا من هذه الصفحة فقط.',
  },
  {
    q: 'هل يرى مكتب آخر بيانات مكتبي؟',
    a: 'لا. بيانات كل مكتب منفصلة تمامًا، ويتحقق الخادم من ذلك في كل طلب، ولا يطّلع موظف إلا على ما منحه مدير المكتب صلاحية الوصول إليه.',
  },
  {
    q: 'نسيت كلمة المرور، كيف أستعيدها؟',
    a: 'من شاشة الدخول في التطبيق اضغط «نسيت كلمة المرور؟» وأدخل بريدك، فتصلك رسالة بها رابط لتعيين كلمة مرور جديدة. أما الموظفون فيعيد مدير المكتب تعيين كلمات مرورهم.',
  },
]

function WindowFrame({ children, className = '' }) {
  return (
    <div className={`rounded-2xl overflow-hidden border border-brand-border bg-white shadow-[0_40px_80px_-40px_rgba(43,32,16,0.55)] ${className}`}>
      <div className="flex items-center gap-1.5 px-4 h-8 bg-brand-cream border-b border-brand-border" dir="ltr">
        <span className="w-2.5 h-2.5 rounded-full bg-[#e2d3b3]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#e2d3b3]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#e2d3b3]" />
        <span className="mx-auto text-[11px] text-brand-brown/40 font-medium" dir="rtl">
          حقوق — إدارة المكاتب
        </span>
      </div>
      {children}
    </div>
  )
}

function SectionTitle({ eyebrow, title, intro, light = false }) {
  return (
    <Reveal className="max-w-2xl mx-auto text-center mb-12 sm:mb-16">
      {eyebrow && (
        <p className={`inline-flex items-center gap-2 text-[13px] font-semibold tracking-wide mb-4 ${light ? 'text-brand-gold-light' : 'text-brand-gold'}`}>
          <span className="w-6 h-px bg-current opacity-60" />
          {eyebrow}
          <span className="w-6 h-px bg-current opacity-60" />
        </p>
      )}
      <h2 className={`font-display text-[30px] sm:text-[40px] font-bold leading-snug ${light ? 'text-brand-cream' : 'text-brand-brown'}`}>{title}</h2>
      {intro && <p className={`mt-4 text-[16px] sm:text-lg leading-relaxed ${light ? 'text-brand-cream/65' : 'text-brand-brown/60'}`}>{intro}</p>}
    </Reveal>
  )
}

function Hero() {
  return (
    <section className="relative z-10 bg-brand-brown text-brand-cream">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="hero-glow absolute -top-1/3 -left-1/4 w-[70%] h-[120%] rounded-full bg-[radial-gradient(closest-side,rgba(217,180,94,0.16),transparent)]" />
        <div className="hero-glow absolute -bottom-1/3 right-[-10%] w-[55%] h-[90%] rounded-full bg-[radial-gradient(closest-side,rgba(185,139,51,0.12),transparent)]" style={{ animationDelay: '-9s' }} />
        <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] bg-[size:56px_56px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 grid lg:grid-cols-[1fr_1.15fr] gap-12 items-center">
        <div className="text-center lg:text-right pb-4 lg:pb-24">
          <p className="hero-in inline-flex items-center gap-2 rounded-full border border-brand-gold/35 bg-white/[0.03] px-3.5 py-1.5 text-[13px] text-brand-gold-light" style={{ '--d': '0ms' }}>
            <ShieldCheck size={15} />
            منصة إدارة الأعمال القانونية
          </p>
          <h1 className="hero-in mt-6 font-display text-[36px] sm:text-5xl lg:text-[56px] font-bold leading-[1.22]" style={{ '--d': '120ms' }}>
            أدِر مكتب المحاماة
            <br />
            <span className="bg-gradient-to-l from-brand-gold-light via-[#f0d590] to-brand-gold bg-clip-text text-transparent">بدقة ووضوح وثقة</span>
          </h1>
          <p className="hero-in mt-6 text-[16px] sm:text-lg text-brand-cream/70 leading-relaxed max-w-xl mx-auto lg:mx-0" style={{ '--d': '240ms' }}>
            حقوق يجمع قضاياك وجلساتك وموكليك ومهام فريقك ومستنداتك وحساباتك في تطبيق واحد لنظام Windows، مع صلاحيات دقيقة لكل عضو في المكتب.
          </p>
          <div className="hero-in mt-9 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start items-center sm:items-start" style={{ '--d': '360ms' }}>
            <DownloadButton size="lg" withMeta className="w-full sm:w-auto text-brand-cream" />
            <a
              href="#how"
              className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl border border-brand-cream/20 px-7 py-3.5 text-[16px] text-brand-cream/90 hover:bg-white/[0.06] hover:border-brand-cream/35 transition-colors"
            >
              كيف أبدأ؟
            </a>
          </div>
        </div>

        <div className="relative lg:-mb-20">
          <div className="hero-shot">
            <WindowFrame>
              <img src="/landing/screens/dashboard.webp" alt="لوحة تحكم تطبيق حقوق" className="block w-full h-auto" fetchpriority="high" />
            </WindowFrame>
          </div>
          <div
            className="float-card hidden sm:flex absolute -right-4 lg:-right-10 top-[18%] items-center gap-3 rounded-xl bg-white text-brand-brown border border-brand-border px-4 py-3 shadow-[0_18px_40px_-18px_rgba(43,32,16,0.55)]"
            style={{ '--d': '1.3s' }}
            aria-hidden="true"
          >
            <span className="w-9 h-9 rounded-lg bg-brand-cream text-brand-gold flex items-center justify-center">
              <CalendarDays size={18} />
            </span>
            <span className="text-right">
              <span className="block text-[13px] font-semibold">جلسة غدًا 10:00 ص</span>
              <span className="block text-[11.5px] text-brand-brown/55">محكمة استئناف القاهرة</span>
            </span>
          </div>
          <div
            className="float-card hidden sm:flex absolute -left-3 lg:-left-8 bottom-[14%] items-center gap-3 rounded-xl bg-white text-brand-brown border border-brand-border px-4 py-3 shadow-[0_18px_40px_-18px_rgba(43,32,16,0.55)]"
            style={{ '--d': '1.6s', animationDelay: '1.6s, 3.5s' }}
            aria-hidden="true"
          >
            <span className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CircleCheck size={18} />
            </span>
            <span className="text-right">
              <span className="block text-[13px] font-semibold">تم تسجيل دفعة</span>
              <span className="block text-[11.5px] text-brand-brown/55">وتحديث المتبقي تلقائيًا</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

function Highlights() {
  return (
    <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-28 sm:pt-32 lg:pt-36">
      <Reveal className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {HIGHLIGHTS.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-3 rounded-xl border border-brand-border bg-white/70 px-4 py-3.5">
            <Icon size={19} className="text-brand-gold shrink-0" />
            <span className="text-[14px] sm:text-[15px] font-medium text-brand-brown/80">{text}</span>
          </div>
        ))}
      </Reveal>
    </div>
  )
}

function Features() {
  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionTitle eyebrow="المزايا" title="كل ما يحتاجه مكتبك في مكان واحد" intro="صُمّم حقوق لطبيعة عمل مكاتب المحاماة في مصر: من فتح القضية حتى تحصيل الأتعاب." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <Reveal
              key={title}
              delay={(i % 4) * 90}
              className="lift group rounded-2xl bg-white border border-brand-border p-6 hover:border-brand-gold/45 hover:shadow-[0_22px_45px_-28px_rgba(43,32,16,0.5)]"
            >
              <div className="w-11 h-11 rounded-xl bg-brand-cream text-brand-gold flex items-center justify-center mb-5 transition-colors duration-300 group-hover:bg-brand-brown group-hover:text-brand-gold-light">
                <Icon size={21} />
              </div>
              <h3 className="font-semibold text-[17px] mb-2">{title}</h3>
              <p className="text-[14.5px] text-brand-brown/60 leading-relaxed">{text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const lineRef = useReveal({ threshold: 0.3 })
  return (
    <section id="how" className="scroll-mt-20 py-20 sm:py-28 bg-brand-cream">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionTitle eyebrow="كيف يعمل" title="ابدأ في ثلاث خطوات" intro="من إنشاء الحساب إلى عمل فريقك كله على التطبيق." />
        <div ref={lineRef} className="relative">
          <div className="hidden md:block absolute top-[46px] right-[16.66%] left-[16.66%] h-[2px] bg-brand-border overflow-hidden" aria-hidden="true">
            <div className="draw-line h-full bg-gradient-to-l from-brand-gold via-brand-gold-light to-brand-gold" />
          </div>
          <ol className="relative grid md:grid-cols-3 gap-5 md:gap-8">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <Reveal as="li" key={title} delay={i * 160} className="text-center md:px-2">
                <div className="relative mx-auto w-[92px] h-[92px] rounded-full bg-brand-cream flex items-center justify-center">
                  <div className="w-[68px] h-[68px] rounded-2xl bg-brand-brown text-brand-gold-light flex items-center justify-center shadow-[0_14px_30px_-14px_rgba(43,32,16,0.7)]">
                    <Icon size={26} />
                  </div>
                  <span className="absolute -top-1 -left-1 w-8 h-8 rounded-full bg-brand-gold text-white text-[14px] font-bold flex items-center justify-center ring-4 ring-brand-cream">
                    {(i + 1).toLocaleString('ar-EG')}
                  </span>
                </div>
                <h3 className="mt-6 font-semibold text-lg">{title}</h3>
                <p className="mt-2 text-[15px] text-brand-brown/60 leading-relaxed max-w-xs mx-auto">{text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
        <Reveal className="text-center mt-12 text-[15px] text-brand-brown/65">
          لطلب حساب لمكتبك راسلنا على{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} dir="ltr" className="text-brand-gold font-semibold hover:underline underline-offset-4">
            {CONTACT_EMAIL}
          </a>
        </Reveal>
      </div>
    </section>
  )
}

function Screens() {
  const [active, setActive] = useState(0)
  return (
    <section id="screens" className="scroll-mt-20 py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionTitle eyebrow="من داخل التطبيق" title="واجهة عربية واضحة ومريحة" intro="صُممت الواجهة بالكامل باللغة العربية ومن اليمين إلى اليسار، لتجد كل شيء في مكانه المتوقع." />
        <Reveal className="flex justify-center mb-8">
          <div role="tablist" aria-label="لقطات من التطبيق" className="inline-flex flex-wrap justify-center gap-1 rounded-2xl bg-brand-cream p-1.5">
            {SCREENS.map((s, i) => (
              <button
                key={s.src}
                type="button"
                role="tab"
                aria-selected={active === i}
                onClick={() => setActive(i)}
                className={`px-4 sm:px-5 py-2 rounded-xl text-[14px] font-medium transition-all duration-300 ${
                  active === i ? 'bg-white text-brand-brown shadow-[0_6px_16px_-10px_rgba(43,32,16,0.6)]' : 'text-brand-brown/55 hover:text-brand-brown'
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>
        </Reveal>
        <Reveal scale className="max-w-5xl mx-auto">
          <WindowFrame>
            <div className="relative">
              {SCREENS.map((s, i) => (
                <img
                  key={s.src}
                  src={s.src}
                  alt={s.title}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  className={`shot-layer block w-full h-auto ${i === 0 ? 'relative' : 'absolute inset-0'} ${
                    active === i ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.01]'
                  }`}
                />
              ))}
            </div>
          </WindowFrame>
          <p key={active} className="hero-in text-center mt-6 text-brand-brown/60">
            {SCREENS[active].text}
          </p>
        </Reveal>
      </div>
    </section>
  )
}

function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section id="faq" className="scroll-mt-20 py-20 sm:py-28 bg-brand-cream">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <SectionTitle eyebrow="الأسئلة الشائعة" title="إجابات سريعة" />
        <div className="flex flex-col gap-3">
          {FAQ.map(({ q, a }, i) => {
            const isOpen = open === i
            return (
              <Reveal key={q} delay={i * 60} className={`rounded-2xl border bg-white transition-colors duration-300 ${isOpen ? 'border-brand-gold/45' : 'border-brand-border'}`}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-5 text-right font-semibold text-[16px]"
                  >
                    {q}
                    <ChevronDown size={19} className={`shrink-0 text-brand-gold transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                </h3>
                <div className={`faq-body ${isOpen ? 'open' : ''}`}>
                  <div>
                    <p className="px-5 sm:px-6 pb-5 text-[15px] text-brand-brown/65 leading-relaxed">{a}</p>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function DownloadSection() {
  const onWindows = isWindowsDevice()
  return (
    <section id="download" className="scroll-mt-20 relative overflow-hidden py-20 sm:py-28 bg-brand-brown text-brand-cream">
      <div className="hero-glow absolute -top-1/2 left-1/4 w-[60%] h-[140%] rounded-full bg-[radial-gradient(closest-side,rgba(217,180,94,0.13),transparent)] pointer-events-none" aria-hidden="true" />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <Reveal scale>
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-brand-gold-light mb-7">
            <Monitor size={30} />
          </div>
          <h2 className="font-display text-[30px] sm:text-[42px] font-bold">حمّل حقوق لنظام Windows</h2>
          <p className="mt-4 text-brand-cream/65 text-lg">تطبيق مكتب المحاماة للمالك والمحامين والموظفين.</p>
          <DownloadButton size="lg" withMeta className="mt-9 text-brand-cream" />
          {!onWindows && (
            <p className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/10 px-4 py-2.5 text-[14px] text-brand-cream/80">
              <Info size={16} className="text-brand-gold-light shrink-0" />
              التطبيق مخصص لأجهزة الكمبيوتر بنظام Windows — افتح هذه الصفحة من جهاز الكمبيوتر لتحميله.
            </p>
          )}
          <ul className="mt-9 flex flex-col sm:flex-row flex-wrap justify-center gap-x-8 gap-y-2.5 text-[14px] text-brand-cream/65">
            {SYSTEM_REQUIREMENTS.map((req) => (
              <li key={req} className="inline-flex items-center justify-center gap-2">
                <Check size={15} className="text-brand-gold" />
                {req}
              </li>
            ))}
          </ul>
        </Reveal>
        <div className="mt-12 grid sm:grid-cols-2 gap-4 text-right">
          <Reveal delay={100} className="rounded-2xl bg-white/[0.04] border border-white/10 p-6">
            <p className="font-semibold text-brand-gold-light mb-2 flex items-center gap-2">
              <Wifi size={17} /> يعمل عبر الإنترنت
            </p>
            <p className="text-[14px] text-brand-cream/60 leading-relaxed">
              تُحفظ بيانات مكتبك على خوادم حقوق المركزية، وإذا انقطع الاتصال يبقى التطبيق مستقرًا ويعود للعمل تلقائيًا عند عودته.
            </p>
          </Reveal>
          <Reveal delay={200} className="rounded-2xl bg-white/[0.04] border border-white/10 p-6">
            <p className="font-semibold text-brand-gold-light mb-2 flex items-center gap-2">
              <ShieldCheck size={17} /> عند التثبيت لأول مرة
            </p>
            <p className="text-[14px] text-brand-cream/60 leading-relaxed">
              قد يعرض Windows تنبيه «Windows protected your PC». اضغط «More info» ثم «Run anyway» لمتابعة التثبيت.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-brand-cream-light text-brand-brown overflow-x-clip" dir="rtl">
      <Header />
      <main>
        <Hero />
        <Highlights />
        <Features />
        <HowItWorks />
        <Screens />
        <Faq />
        <DownloadSection />
      </main>
      <Footer />
      <BackToTop />
    </div>
  )
}
