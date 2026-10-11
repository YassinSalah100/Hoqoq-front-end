import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Menu, X } from 'lucide-react'
import BrandMark from '../components/ui/BrandMark'
import { CONTACT_EMAIL, DOWNLOAD_URL } from './config'

const NAV = [
  ['#features', 'المزايا'],
  ['#how', 'كيف يعمل'],
  ['#screens', 'لقطات من التطبيق'],
  ['#download', 'التحميل'],
]

export function DownloadButton({ className = '', size = 'md' }) {
  const sizes = size === 'lg' ? 'px-7 py-3.5 text-base' : 'px-5 py-2.5 text-sm'
  return (
    <a
      href={DOWNLOAD_URL}
      rel="noopener"
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-brand-gold hover:bg-brand-tagline text-white font-semibold shadow-[0_8px_24px_-8px_rgba(185,139,51,0.6)] transition-colors ${sizes} ${className}`}
    >
      <Download size={size === 'lg' ? 20 : 17} />
      تحميل لنظام Windows
    </a>
  )
}

export function Header({ withNav = true }) {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-30 bg-brand-cream-light/90 backdrop-blur border-b border-brand-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-[72px] flex items-center justify-between gap-4">
        <Link to="/" aria-label="حقوق — الصفحة الرئيسية" className="shrink-0">
          <BrandMark size={44} />
        </Link>
        {withNav && (
          <>
            <nav className="hidden md:flex items-center gap-7 text-[15px] text-brand-brown/75">
              {NAV.map(([href, label]) => (
                <a key={href} href={href} className="hover:text-brand-gold transition-colors">
                  {label}
                </a>
              ))}
            </nav>
            <div className="hidden md:block">
              <DownloadButton />
            </div>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
              className="md:hidden p-2 -m-2 text-brand-brown"
            >
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
          </>
        )}
      </div>
      {withNav && open && (
        <nav className="md:hidden border-t border-brand-border bg-brand-cream-light px-4 py-3 flex flex-col gap-1">
          {NAV.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)} className="py-2.5 text-brand-brown/80">
              {label}
            </a>
          ))}
          <DownloadButton className="mt-2" />
        </nav>
      )}
    </header>
  )
}

export function Footer() {
  return (
    <footer className="bg-brand-brown text-brand-cream/70">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
        <div className="flex flex-col items-center md:items-start gap-3 text-center md:text-right">
          <BrandMark size={46} variant="dark" />
          <p className="text-sm max-w-xs leading-relaxed">منصة متكاملة لإدارة مكاتب المحاماة في مصر.</p>
        </div>
        <div className="flex flex-col items-center md:items-start gap-2 text-sm">
          <p className="text-brand-gold-light font-semibold mb-1">تواصل معنا</p>
          <a href={`mailto:${CONTACT_EMAIL}`} dir="ltr" className="hover:text-white">
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="max-w-6xl mx-auto px-4 sm:px-6 py-4 text-xs text-center md:text-right text-brand-cream/45">
          © {new Date().getFullYear()} حقوق — جميع الحقوق محفوظة. تطوير Ethereal Software Solutions.
        </p>
      </div>
    </footer>
  )
}
