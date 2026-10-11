import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { WifiOff } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { getDefaultRoute } from './data/auth'
import AuthenticatedLayout from './components/layout/AuthenticatedLayout'
import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import Activate from './pages/auth/Activate'
import Privacy from './pages/legal/Privacy'
import Terms from './pages/legal/Terms'
import Dashboard from './pages/dashboard/Dashboard'
import Cases from './pages/cases/Cases'
import CaseDetail from './pages/cases/CaseDetail'
import Hearings from './pages/hearings/Hearings'
import Clients from './pages/clients/Clients'
import ClientDetail from './pages/clients/ClientDetail'
import Tasks from './pages/tasks/Tasks'
import CalendarPage from './pages/calendar/CalendarPage'
import Invoices from './pages/finance/Invoices'
import FinanceReports from './pages/finance/FinanceReports'
import Employees from './pages/hr/Employees'
import Roles from './pages/hr/Roles'
import Settings from './pages/settings/Settings'
import Subscription from './pages/settings/Subscription'
import AuditLog from './pages/settings/AuditLog'
import Button from './components/ui/Button'
import { OFFLINE_MESSAGE, isNetworkError } from './lib/api'
import { IS_ADMIN_APP } from './lib/appVariant'

// Platform (Super Admin) pages: the firm desktop app replaces this with null
// at compile time, so the page code isn't even shipped there.
const Firms = import.meta.env.VITE_DESKTOP_APP === 'firm' ? null : lazy(() => import('./pages/platform/Firms'))

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <div className="w-8 h-8 border-2 border-brass-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// Shown when a saved session exists but couldn't be checked at startup. The
// session is kept; it retries by itself when the connection returns.
function StartupError({ error, onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6" dir="rtl">
      <div className="max-w-sm text-center flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-rust-100 flex items-center justify-center">
          <WifiOff size={26} className="text-rust-500" />
        </div>
        <p className="text-base font-semibold text-ink-800">
          {isNetworkError(error) ? OFFLINE_MESSAGE : 'تعذر الاتصال بالخادم حالياً'}
        </p>
        <p className="text-sm text-ink-500">جلستك محفوظة، وسيتم المتابعة تلقائيًا فور عودة الاتصال.</p>
        <Button onClick={onRetry}>إعادة المحاولة</Button>
      </div>
    </div>
  )
}

function Shell() {
  const { currentUser, restoring, restoreError, retryRestore, logout } = useAuth()

  // Wait for the stored-session check before deciding to bounce to /login —
  // otherwise every page refresh has a one-frame window where currentUser is
  // still null and the router redirects away from a perfectly valid session.
  if (restoring) return <Spinner />
  if (restoreError) return <StartupError error={restoreError} onRetry={retryRestore} />

  return (
    <Routes>
      <Route
        path="/"
        element={currentUser ? <AuthenticatedLayout user={currentUser} onLogout={logout} /> : <Navigate to="/login" replace />}
      >
        <Route index element={<Navigate to={getDefaultRoute(currentUser)} replace />} />

        {/* Platform administration (Super Admin) */}
        {Firms && (
          <Route
            path="firms"
            element={
              <Suspense fallback={<Spinner />}>
                <Firms />
              </Suspense>
            }
          />
        )}

        {/* Firm workspace — not part of the Super Admin desktop app */}
        {!IS_ADMIN_APP && <>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="cases" element={<Cases />} />
        <Route path="cases/:id" element={<CaseDetail />} />
        <Route path="hearings" element={<Hearings />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="reports/finance" element={<FinanceReports />} />
        <Route path="employees" element={<Employees />} />
        <Route path="roles" element={<Roles />} />
        <Route path="settings" element={<Settings />} />
        <Route path="subscription" element={<Subscription />} />
        <Route path="audit-log" element={<AuditLog />} />
        </>}
      </Route>

      {/* v1 is invite-only: no public signup, no marketplace. */}
      <Route path="/login" element={currentUser ? <Navigate to={getDefaultRoute(currentUser)} replace /> : <Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {!IS_ADMIN_APP && <Route path="/activate" element={<Activate />} />}
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}

export default App
