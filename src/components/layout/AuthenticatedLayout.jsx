import { useState } from 'react'
import { Outlet, Link } from 'react-router-dom'
import { Timer, X } from 'lucide-react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import Button from '../ui/Button'
import { isSuperAdmin } from '../../data/auth'
import { tenantsApi } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'

const TRIAL_DAYS = 14

// Mirrors the backend's own rule (TenantsService.provisionFirm ->
// createTrialSubscription: 14 days from the firm's creation date) since there
// is no read endpoint yet for the subscription record itself.
function trialDaysLeft(createdAt) {
  if (!createdAt) return null
  const end = new Date(createdAt)
  end.setDate(end.getDate() + TRIAL_DAYS)
  return Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24))
}

export default function AuthenticatedLayout({ user, onLogout }) {
  const [showBanner, setShowBanner] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const isSA = isSuperAdmin(user)

  // The Super Admin operates the platform — he has no firm and no subscription
  // of his own, so the firm-facing trial banner must never show for him.
  const { data: firm } = useFetch(() => (isSA ? Promise.resolve(null) : tenantsApi.getMyFirm()), [isSA])
  const daysLeft = trialDaysLeft(firm?.createdAt)
  const showTrialBanner = showBanner && !isSA && daysLeft !== null

  return (
    <div className="flex h-screen bg-paper" dir="rtl">
      <Sidebar user={user} onLogout={onLogout} mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar user={user} onLogout={onLogout} onOpenMenu={() => setMobileNavOpen(true)} />
        {showTrialBanner && (
          <div
            className={`flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2.5 text-sm ${
              daysLeft <= 0 ? 'bg-rust-100 text-rust-600' : 'bg-brass-100 text-brass-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Timer size={14} className="shrink-0" />
              <span>
                {daysLeft <= 0 ? (
                  'انتهت فترتك التجريبية المجانية'
                ) : (
                  <>
                    أنت في فترة التجربة المجانية —<strong className="mx-1">{daysLeft} أيام متبقية</strong>
                  </>
                )}
              </span>
              <span className="hidden sm:inline opacity-80">للوصول لجميع الميزات بالكامل.</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link to="/subscription">
                <Button variant="primary" className="!py-1.5 !px-3 text-xs">
                  اشترك الآن
                </Button>
              </Link>
              <button onClick={() => setShowBanner(false)} className="hover:opacity-70">
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
