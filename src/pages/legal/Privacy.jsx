import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import BrandMark from '../../components/ui/BrandMark'

// Placeholder page so the footer link on /login goes somewhere real instead
// of bouncing back through the catch-all route — the actual policy text
// still needs drafting/legal review before launch, this isn't it.
export default function Privacy() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 bg-paper text-center" dir="rtl">
      <BrandMark size={56} />
      <div className="max-w-md">
        <h1 className="font-display text-xl font-bold text-ink-800 mb-2">سياسة الخصوصية</h1>
        <p className="text-sm text-ink-500 leading-relaxed">
          هذه الصفحة قيد الإعداد. للاستفسار عن كيفية التعامل مع بياناتكم، يرجى التواصل معنا على{' '}
          <a href="mailto:support@hoqooq.app" className="text-brass-700 hover:underline">support@hoqooq.app</a>.
        </p>
      </div>
      <Link to="/login" className="flex items-center gap-1.5 text-sm text-brass-700 hover:text-brass-800 hover:underline">
        العودة لتسجيل الدخول
        <ArrowRight size={14} />
      </Link>
    </div>
  )
}
