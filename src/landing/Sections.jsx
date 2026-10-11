import { useState } from 'react'
import {
  Briefcase,
  CalendarDays,
  Check,
  Crown,
  FileLock2,
  Gavel,
  History,
  KeyRound,
  Mail,
  Scale,
  ShieldCheck,
  UserCog,
  Wallet,
  ClipboardList,
  Users as Users2,
  ListChecks,
  FileText,
} from 'lucide-react'
import Reveal from './Reveal'
import { useReveal } from './motion'
import { CONTACT_EMAIL } from './config'

export const SCREENS = [
  { src: '/landing/screens/dashboard.webp', title: 'لوحة التحكم', text: 'نظرة سريعة على قضايا مكتبك وجلساتك القادمة وأرقامه المالية.' },
  { src: '/landing/screens/cases.webp', title: 'القضايا', text: 'كل قضايا المكتب بحالاتها ومحاكمها والمحامي المسؤول عنها.' },
  { src: '/landing/screens/hearings.webp', title: 'الجلسات', text: 'جدول الجلسات القادمة والسابقة ونتائجها.' },
  { src: '/landing/screens/finance.webp', title: 'التقارير المالية', text: 'الأتعاب والمحصَّل والمستحق لكل قضية وكل موكل.' },
]

export function WindowFrame({ children, className = '', label = 'حقوق — إدارة المكاتب' }) {
  return (
    <div className={`rounded-2xl overflow-hidden border border-brand-border bg-white shadow-[0_40px_80px_-40px_rgba(43,32,16,0.55)] ${className}`}>
      <div className="flex items-center gap-1.5 px-4 h-8 bg-brand-cream border-b border-brand-border" dir="ltr">
        <span className="w-2.5 h-2.5 rounded-full bg-[#e2d3b3]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#e2d3b3]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#e2d3b3]" />
        <span className="mx-auto text-[11px] text-brand-brown/40 font-medium" dir="rtl">
          {label}
        </span>
      </div>
      {children}
    </div>
  )
}

const ROLES = [
  {
    icon: Crown,
    role: 'مالك المكتب',
    lead: 'رؤية كاملة وتحكم كامل.',
    points: ['متابعة كل قضايا المكتب وجلساته من شاشة واحدة', 'إنشاء حسابات الفريق وتحديد صلاحيات كل فرد', 'تقارير مالية بالأتعاب والمحصَّل والمستحق', 'إدارة أنواع القضايا والمحاكم والقوائم الخاصة بالمكتب'],
  },
  {
    icon: Gavel,
    role: 'المحامي',
    lead: 'كل ما يخص قضاياك أمامك.',
    points: ['ملف القضية كاملًا: الأطراف والمحكمة والمستندات', 'جلساتك القادمة ونتائج الجلسات السابقة', 'مهامك بأولوياتها ومواعيد استحقاقها', 'يرى فقط القضايا المُسندة إليه أو المصرَّح له بها'],
  },
  {
    icon: ClipboardList,
    role: 'السكرتارية',
    lead: 'تنظيم يومي بلا أوراق متفرقة.',
    points: ['جدولة الجلسات والمواعيد في تقويم واحد', 'تسجيل بيانات الموكلين والخصوم بدقة', 'رفع المستندات وتصنيفها', 'متابعة المهام المتأخرة وتذكير الفريق'],
  },
  {
    icon: Wallet,
    role: 'المحاسب',
    lead: 'أرقام واضحة لكل قضية وكل موكل.',
    points: ['تسجيل الدفعات بطرق السداد المختلفة', 'المتبقي يُحسب تلقائيًا ويمنع السداد الزائد', 'عرض مالي لكل موكل عبر جميع قضاياه', 'لا يصل إلى المالية إلا من يملك صلاحيتها'],
  },
]

export function Roles() {
  const [active, setActive] = useState(0)
  const r = ROLES[active]
  const Icon = r.icon
  return (
    <section id="roles" className="scroll-mt-20 py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal className="max-w-2xl mx-auto text-center mb-12">
          <p className="inline-flex items-center gap-2 text-[13px] font-semibold tracking-wide mb-4 text-brand-gold">
            <span className="w-6 h-px bg-current opacity-60" />
            لكل فرد في مكتبك
            <span className="w-6 h-px bg-current opacity-60" />
          </p>
          <h2 className="font-display text-[30px] sm:text-[40px] font-bold leading-snug">مكان عمل واحد، وصلاحيات تناسب كل دور</h2>
          <p className="mt-4 text-[16px] sm:text-lg leading-relaxed text-brand-brown/60">كل عضو في الفريق يرى ما يحتاجه لعمله فقط، ويحدد مدير المكتب الصلاحيات بدقة.</p>
        </Reveal>
        <Reveal className="grid lg:grid-cols-[300px_1fr] gap-5 lg:gap-8 items-stretch">
          <div role="tablist" aria-label="الأدوار" className="grid grid-cols-2 lg:grid-cols-1 gap-2.5">
            {ROLES.map((item, i) => {
              const ItemIcon = item.icon
              const on = active === i
              return (
                <button
                  key={item.role}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setActive(i)}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-4 text-right transition-all duration-300 ${
                    on ? 'bg-brand-brown text-brand-cream border-brand-brown shadow-[0_18px_40px_-24px_rgba(43,32,16,0.8)]' : 'bg-white border-brand-border hover:border-brand-gold/50'
                  }`}
                >
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${on ? 'bg-white/10 text-brand-gold-light' : 'bg-brand-cream text-brand-gold'}`}>
                    <ItemIcon size={19} />
                  </span>
                  <span className="font-semibold text-[15px]">{item.role}</span>
                </button>
              )
            })}
          </div>
          <div key={active} className="hero-in rounded-3xl border border-brand-border bg-white p-7 sm:p-10 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-12 h-12 rounded-2xl bg-brand-cream text-brand-gold flex items-center justify-center">
                <Icon size={23} />
              </span>
              <h3 className="font-display text-2xl sm:text-3xl font-bold">{r.role}</h3>
            </div>
            <p className="text-brand-brown/60 text-[16px] mb-7">{r.lead}</p>
            <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
              {r.points.map((p, i) => (
                <li key={p} className="hero-in flex items-start gap-3 text-[15px] leading-relaxed" style={{ '--d': `${120 + i * 70}ms` }}>
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

const SHOWCASE = [
  {
    screen: 1,
    icon: Briefcase,
    eyebrow: 'القضايا',
    title: 'كل قضية في ملف واحد منظم',
    text: 'من المسودة إلى الإغلاق: المحكمة والدائرة ورقم القضية، الموكلون والخصوم، المحامي المسؤول وفريق القضية، والمستندات بكل إصداراتها.',
    points: ['عرض جدولي أو بطاقات مع بحث وتصفية بالحالة', 'اقتراح بيانات الموكل من قضاياه السابقة لتجنب إعادة الإدخال', 'سجل زمني لكل ما حدث في القضية'],
  },
  {
    screen: 2,
    icon: CalendarDays,
    eyebrow: 'الجلسات',
    title: 'لا تفوتك جلسة',
    text: 'جدول واضح للجلسات القادمة والسابقة، مع نوع الجلسة والمحكمة والمحامي المكلَّف، وتسجيل النتيجة أو التأجيل مع الاحتفاظ بالجلسة السابقة.',
    points: ['جلسات اليوم في أعلى الصفحة', 'تذكيرات تلقائية قبل الموعد', 'تقويم موحّد للجلسات والمهام والمواعيد'],
  },
  {
    screen: 3,
    icon: Scale,
    eyebrow: 'المالية',
    title: 'أتعابك واضحة حتى آخر جنيه',
    text: 'سجّل الأتعاب المتفق عليها والدفعات، ويحسب حقوق المتبقي تلقائيًا لكل قضية ولكل موكل، مع تقارير توضح المحصَّل والمستحق.',
    points: ['منع السداد الزائد تلقائيًا', 'عكس الدفعات بدل حذفها للحفاظ على السجل', 'تقارير حسب القضية والموكل'],
  },
]

function ShowcaseRow({ item, flip }) {
  const ref = useReveal({ threshold: 0.2 })
  const Icon = item.icon
  return (
    <div ref={ref} className={`reveal grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${flip ? 'lg:[&>*:first-child]:order-2' : ''}`}>
      <div>
        <p className="inline-flex items-center gap-2 rounded-full bg-brand-cream px-3 py-1 text-[13px] font-semibold text-brand-gold mb-5">
          <Icon size={15} />
          {item.eyebrow}
        </p>
        <h3 className="font-display text-[28px] sm:text-[34px] font-bold leading-snug">{item.title}</h3>
        <p className="mt-4 text-[16px] text-brand-brown/65 leading-relaxed">{item.text}</p>
        <ul className="mt-6 space-y-3">
          {item.points.map((p) => (
            <li key={p} className="flex items-start gap-3 text-[15px]">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-brand-brown text-brand-gold-light flex items-center justify-center shrink-0">
                <Check size={12} strokeWidth={3} />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="showcase-img">
        <WindowFrame>
          <img src={SCREENS[item.screen].src} alt={item.eyebrow} loading="lazy" className="block w-full h-auto" />
        </WindowFrame>
      </div>
    </div>
  )
}

const MORE = [
  { icon: Users2, title: 'الموكلون والخصوم', text: 'بيانات كل طرف داخل قضيته، ورؤية الموكل عبر كل قضاياه ومستحقاته.' },
  { icon: ListChecks, title: 'المهام', text: 'مهام بأولويات ومواعيد، وتنبيه بالمتأخر منها.' },
  { icon: FileText, title: 'المستندات', text: 'رفع وتصنيف المستندات مع الاحتفاظ بكل إصداراتها.' },
  { icon: UserCog, title: 'الموظفون والصلاحيات', text: 'حسابات للفريق وصلاحيات على مستوى كل قضية.' },
]

export function Showcase() {
  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-28 mt-20 sm:mt-28 bg-brand-cream">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col gap-20 sm:gap-28">
        {SHOWCASE.map((item, i) => (
          <ShowcaseRow key={item.eyebrow} item={item} flip={i % 2 === 1} />
        ))}
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-20 sm:mt-24">
        <Reveal className="text-center mb-8">
          <h3 className="font-display text-[24px] sm:text-[28px] font-bold">وكل ما يحتاجه مكتبك أيضًا</h3>
        </Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {MORE.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 80} className="lift rounded-2xl bg-white border border-brand-border p-5">
              <Icon size={20} className="text-brand-gold mb-3" />
              <p className="font-semibold text-[15px] mb-1.5">{title}</p>
              <p className="text-[13.5px] text-brand-brown/60 leading-relaxed">{text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

const TRUST = [
  { icon: ShieldCheck, title: 'فصل تام بين المكاتب', text: 'لا يستطيع أي مكتب الوصول إلى بيانات مكتب آخر؛ يتحقق الخادم من ذلك في كل طلب.' },
  { icon: UserCog, title: 'صلاحيات على مستوى القضية', text: 'الموظف لا يرى إلا ما منحه مدير المكتب صلاحيته، وعلى القضايا المحددة فقط.' },
  { icon: KeyRound, title: 'حماية تسجيل الدخول', text: 'كلمات مرور قوية، وقفل مؤقت بعد المحاولات الخاطئة، وحفظ الجلسة على الجهاز بتشفير Windows.' },
  { icon: History, title: 'سجل لا يُحذف', text: 'القضايا والمستندات والدفعات لا تُحذف نهائيًا، بل تُؤرشف أو تُعكس مع الاحتفاظ بالسجل.' },
  { icon: FileLock2, title: 'لا نسخ للقضايا على الجهاز', text: 'بيانات القضايا تبقى على الخادم ولا يحتفظ التطبيق بنسخة منها على جهاز المستخدم.' },
]

export function Trust() {
  return (
    <section id="security" className="scroll-mt-20 py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal className="max-w-2xl mx-auto text-center mb-12 sm:mb-16">
          <p className="inline-flex items-center gap-2 text-[13px] font-semibold tracking-wide mb-4 text-brand-gold">
            <span className="w-6 h-px bg-current opacity-60" />
            الخصوصية والصلاحيات
            <span className="w-6 h-px bg-current opacity-60" />
          </p>
          <h2 className="font-display text-[30px] sm:text-[40px] font-bold leading-snug">بيانات موكليك أمانة</h2>
          <p className="mt-4 text-[16px] sm:text-lg leading-relaxed text-brand-brown/60">صُمم حقوق ليصل كل شخص إلى ما يخصه فقط.</p>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {TRUST.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={(i % 3) * 90} className={`lift rounded-2xl border border-brand-border bg-white p-6 ${i === 3 ? 'lg:col-start-1' : ''}`}>
              <Icon size={22} className="text-brand-gold mb-4" />
              <h3 className="font-semibold text-[17px] mb-2">{title}</h3>
              <p className="text-[14.5px] text-brand-brown/60 leading-relaxed">{text}</p>
            </Reveal>
          ))}
          <Reveal delay={180} className="rounded-2xl bg-brand-brown text-brand-cream p-6 flex flex-col justify-between gap-5">
            <p className="text-[15px] leading-relaxed text-brand-cream/80">لديك سؤال عن طريقة حفظ بيانات مكتبك أو الصلاحيات؟ نسعد بالإجابة.</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-2 text-brand-gold-light font-semibold hover:underline underline-offset-4">
              <Mail size={17} />
              تواصل معنا
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

