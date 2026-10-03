import { useState } from 'react'
import { Outlet, Link } from 'react-router-dom'
import { Timer, X } from 'lucide-react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import Button from '../ui/Button'
import { isFirmAdmin } from '../../data/auth'
import { tenantsApi } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'

const DAY_MS = 24 * 60 * 60 * 1000
const GRACE_DAYS = 7 // BR-026
const RENEWAL_WARNING_DAYS = 7

function daysUntil(date) {
  return Math.ceil((date.getTime() - Date.now()) / DAY_MS)
}

// What (if anything) the Firm Admin should be warned about. A PENDING or
// CANCELLED subscription can't reach this screen at all — the backend refuses
// the login — so only two cases are left: the period has ended and the firm
// is in its 7-day grace period (BR-026), or renewal is coming up soon.
function subscriptionNotice(firm) {
  const sub = (firm?.subscriptions ?? []).find((s) => !s.supersededAt && !s.isArchived)
  if (!sub?.currentPeriodEnd) return null
  const periodEnd = new Date(sub.currentPeriodEnd)
  periodEnd.setHours(23, 59, 59, 999)
  const graceEnd = sub.graceEndAt ? new Date(sub.graceEndAt) : new Date(periodEnd.getTime() + GRACE_DAYS * DAY_MS)

  if (sub.status === 'EXPIRED' || periodEnd < new Date()) {
    const left = Math.max(daysUntil(graceEnd), 0)
    return {
      tone: 'bg-rust-100 text-rust-600',
      text: (
        <>
          انتهت مدة اشتراك المكتب — فترة السماح تنتهي خلال<strong className="mx-1">{left} أيام</strong>، وبعدها سيتوقف الدخول لجميع الحسابات.
        </>
      ),
    }
  }
  const left = daysUntil(periodEnd)
  if (sub.status === 'ACTIVE' && left <= RENEWAL_WARNING_DAYS) {
    return {
      tone: 'bg-brass-100 text-brass-700',
      text: (
        <>
          ينتهي اشتراك المكتب خلال<strong className="mx-1">{left} أيام</strong>— تواصل مع الدعم الفني للتجديد.
        </>
      ),
    }
  }
  return null
}

export default function AuthenticatedLayout({ user, onLogout }) {
  const [showBanner, setShowBanner] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  // Subscription details are Firm Admin information (PRD §4.2); the Super
  // Admin has no firm and employees don't see billing.
  const firmAdmin = isFirmAdmin(user)

  const { data: firm } = useFetch(() => (firmAdmin ? tenantsApi.getMyFirm() : Promise.resolve(null)), [firmAdmin])
  const notice = showBanner && firmAdmin ? subscriptionNotice(firm) : null

  return (
    <div className="flex h-screen bg-paper" dir="rtl">
      <Sidebar user={user} onLogout={onLogout} mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar user={user} onLogout={onLogout} onOpenMenu={() => setMobileNavOpen(true)} />
        {notice && (
          <div className={`flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2.5 text-sm ${notice.tone}`}>
            <div className="flex items-center gap-2">
              <Timer size={14} className="shrink-0" />
              <span>{notice.text}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link to="/subscription">
                <Button variant="primary" className="!py-1.5 !px-3 text-xs">
                  تفاصيل الاشتراك
                </Button>
              </Link>
              <button onClick={() => setShowBanner(false)} className="hover:opacity-70" aria-label="إغلاق">
                <X size={14} />
              </button>
            </div>
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
