import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, Download, Menu, X } from 'lucide-react'
import BrandMark from '../components/ui/BrandMark'
import { ANDROID_APK_URL, APP_VERSION, CONTACT_EMAIL, DOWNLOAD_SIZE, DOWNLOAD_URL, GUIDE_URL } from './config'
import { useActiveSection, useScrolled } from './motion'

const NAV = [
  ['demo', 'جرّب الآن'],
  ['features', 'المزايا'],
  ['roles', 'لفريقك'],
  ['how', 'كيف يعمل'],
  ['faq', 'الأسئلة الشائعة'],
]
const NAV_IDS = NAV.map(([id]) => id)

export function DownloadButton({ className = '', size = 'md', withMeta = false, tone = 'gold' }) {
  const sizes = size === 'lg' ? 'px-7 py-3.5 text-[16px]' : 'px-5 py-2.5 text-sm'
  const tones = {
    gold: 'bg-brand-gold hover:bg-brand-tagline text-white shadow-[0_10px_30px_-10px_rgba(185,139,51,0.75)]',
    light: 'bg-brand-cream-light hover:bg-white text-brand-brown shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)]',
  }
  return (
    <div className={`inline-flex flex-col items-center gap-1.5 ${className}`}>
      <a
        href={DOWNLOAD_URL}
        rel="noopener"
        className={`btn-sheen group inline-flex w-full items-center justify-center gap-2.5 rounded-xl font-semibold transition-[background-color,transform] duration-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light focus-visible:ring-offset-2 ${sizes} ${tones[tone]}`}
      >
        <Download size={size === 'lg' ? 20 : 17} className="transition-transform duration-300 group-hover:translate-y-0.5" />
        تحميل لنظام Windows
      </a>
      {withMeta && (
        <span className="text-[12.5px] opacity-60" dir="rtl">
          الإصدار {APP_VERSION} · {DOWNLOAD_SIZE} · Windows 10 / 11
        </span>
      )}
    </div>
  )
}

export function Header({ withNav = true }) {
  const [open, setOpen] = useState(false)
  const scrolled = useScrolled()
  const active = useActiveSection(withNav ? NAV_IDS : [])

  useEffect(() => {
    if (!open) return undefined
    const close = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [open])

  return (
    <header
      className={`sticky top-0 z-40 transition-[background-color,box-shadow,border-color] duration-300 border-b ${
        scrolled || !withNav
          ? 'bg-brand-cream-light/85 backdrop-blur-md border-brand-border shadow-[0_8px_30px_-22px_rgba(43,32,16,0.45)]'
          : 'bg-brand-cream-light border-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-[72px] flex items-center justify-between gap-4">
        <Link to="/" aria-label="حقوق — الصفحة الرئيسية" className="shrink-0 transition-opacity hover:opacity-80">
          <BrandMark size={42} />
        </Link>
        {withNav && (
          <>
            <nav aria-label="أقسام الصفحة" className="hidden md:flex items-center gap-1 text-[15px]">
              {NAV.map(([id, label]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className={`relative px-3.5 py-2 rounded-lg transition-colors ${
                    active === id ? 'text-brand-brown' : 'text-brand-brown/60 hover:text-brand-brown'
                  }`}
                >
                  {label}
                  <span
                    className={`absolute inset-x-3.5 -bottom-0.5 h-[2px] rounded-full bg-brand-gold transition-transform duration-300 origin-center ${
                      active === id ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </a>
              ))}
            </nav>
            <div className="hidden md:block">
              <DownloadButton />
            </div>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
              className="md:hidden p-2 -m-2 rounded-lg text-brand-brown"
            >
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
          </>
        )}
      </div>
      {withNav && (
        <div className={`md:hidden faq-body ${open ? 'open' : ''}`}>
          <div>
            <nav className="border-t border-brand-border bg-brand-cream-light px-4 pt-2 pb-4 flex flex-col">
              {NAV.map(([id, label]) => (
                <a key={id} href={`#${id}`} onClick={() => setOpen(false)} className="py-3 text-brand-brown/80 border-b border-brand-border/60 last:border-0">
                  {label}
                </a>
              ))}
              <DownloadButton className="mt-4 w-full" />
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}

export function BackToTop() {
  const show = useScrolled(900)
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0 })}
      aria-label="العودة إلى أعلى الصفحة"
      className={`fixed bottom-5 left-5 z-40 w-11 h-11 rounded-full bg-brand-brown text-brand-gold-light flex items-center justify-center shadow-[0_10px_30px_-10px_rgba(43,32,16,0.7)] transition-all duration-500 hover:-translate-y-0.5 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <ArrowUp size={19} />
    </button>
  )
}

export function Footer() {
  return (
    <footer className="bg-[#221909] text-brand-cream/70">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr] text-center md:text-right">
        <div className="flex flex-col items-center md:items-start gap-3">
          <BrandMark size={46} variant="dark" />
          <p className="text-sm max-w-xs leading-relaxed text-brand-cream/55">منصة متكاملة لإدارة مكاتب المحاماة: القضايا والجلسات والموكلون والمهام والمستندات والمالية.</p>
        </div>
        <div className="flex flex-col items-center md:items-start gap-2.5 text-sm">
          <p className="text-brand-gold-light font-semibold mb-1">الصفحة</p>
          {NAV.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="hover:text-white transition-colors">
              {label}
            </a>
          ))}
        </div>
        <div className="flex flex-col items-center md:items-start gap-2.5 text-sm">
          <p className="text-brand-gold-light font-semibold mb-1">تواصل معنا</p>
          <p className="text-brand-cream/55">لطلب حساب لمكتبك أو للاستفسار:</p>
          <a href={GUIDE_URL} target="_blank" rel="noopener" className="hover:text-white transition-colors">دليل الاستخدام (PDF)</a>
          <a href={ANDROID_APK_URL} rel="noopener" className="hover:text-white transition-colors">تطبيق Android (APK)</a>
          <a href={`mailto:${CONTACT_EMAIL}`} dir="ltr" className="hover:text-white transition-colors">
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="max-w-6xl mx-auto px-4 sm:px-6 py-5 text-xs text-center md:text-right text-brand-cream/40">
          © {new Date().getFullYear()} حقوق — جميع الحقوق محفوظة. تطوير Ethereal Software Solutions.
        </p>
      </div>
    </footer>
  )
}
