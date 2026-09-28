import { Routes, Route, Navigate } from 'react-router-dom'
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
import Expenses from './pages/finance/Expenses'
import FinanceReports from './pages/finance/FinanceReports'
import Employees from './pages/hr/Employees'
import Roles from './pages/hr/Roles'
import Users from './pages/platform/Users'
import Firms from './pages/platform/Firms'
import FirmDetail from './pages/platform/FirmDetail'
import Settings from './pages/settings/Settings'
import Subscription from './pages/settings/Subscription'
import AuditLog from './pages/settings/AuditLog'
import AISearch from './pages/ai/AISearch'

function Shell() {
  const { currentUser, restoring, logout } = useAuth()

  // Wait for the stored-session check before deciding to bounce to /login —
  // otherwise every page refresh has a one-frame window where currentUser is
  // still null and the router redirects away from a perfectly valid session.
  if (restoring) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="w-8 h-8 border-2 border-brass-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/"
        element={currentUser ? <AuthenticatedLayout user={currentUser} onLogout={logout} /> : <Navigate to="/login" replace />}
      >
        <Route index element={<Navigate to={getDefaultRoute(currentUser)} replace />} />

        {/* Platform administration (Super Admin) */}
        <Route path="firms" element={<Firms />} />
        <Route path="firms/:id" element={<FirmDetail />} />
        <Route path="users" element={<Users />} />

        {/* Firm workspace */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="cases" element={<Cases />} />
        <Route path="cases/:id" element={<CaseDetail />} />
        <Route path="hearings" element={<Hearings />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="reports/finance" element={<FinanceReports />} />
        <Route path="employees" element={<Employees />} />
        <Route path="roles" element={<Roles />} />
        <Route path="settings" element={<Settings />} />
        <Route path="subscription" element={<Subscription />} />
        <Route path="audit-log" element={<AuditLog />} />
        <Route path="ai-search" element={<AISearch />} />
      </Route>

      {/* v1 is invite-only: no public signup, no marketplace. */}
      <Route path="/login" element={currentUser ? <Navigate to={getDefaultRoute(currentUser)} replace /> : <Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/activate" element={<Activate />} />
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
