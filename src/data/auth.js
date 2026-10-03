// Role model — matches the real backend (hoqoq backend/Hoqooq/src/core).
//
// There is no Roles module: access is (1) `user.accountType`
// (SUPER_ADMIN|FIRM_ADMIN|EMPLOYEE, plus a direct `isSuperAdmin` boolean),
// which is fixed at account creation and never changes, and (2) a flat
// `permissions: string[]` array of atomic codes granted directly to the
// account (PERMISSIONS.* in permissions.constant.ts) — no role-wide grants,
// no per-role default set beyond what's explicitly assigned at
// onboarding/provisioning time or later via employeesApi.setPermissions /
// tenantsApi.setFirmAdminPermissions. `jobClassification` (LAWYER/SECRETARY/
// ACCOUNTANT/ASSISTANT/OTHER) is profile data only — it grants nothing.
//
// That means sidebar visibility can NOT be a static "this role sees these
// pages" table: two EMPLOYEE accounts can have completely different access.
// What actually gates every page is `permissions`, matching each
// controller's @RequirePermissions(...) one-for-one. ROLE_LABELS below is
// display-only and never used for gating.

export const ROLE_LABELS = {
  admin: 'مشرف المنصة',
  firm_admin: 'مالك المكتب',
  lawyer: 'محامي',
  secretary: 'سكرتير',
  accountant: 'محاسب',
  assistant: 'مساعد',
  member: 'عضو الفريق',
}

// Marks a page only the Firm Admin may open (PRD: subscription visibility,
// audit.view and report.view are reserved to the Firm Admin in v1).
const FIRM_ADMIN_ONLY = 'FIRM_ADMIN_ONLY'

// Every sidebar route mapped to the exact backend permission code that gates
// it (see permissions.constant.ts). `null` = any firm member.
const SIDEBAR_PERMISSION = {
  dashboard: 'dashboard.read',
  cases: 'case.view',
  hearings: 'hearing.view',
  // Clients are case-local records; the page is derived from the cases list
  // and the backend only joins clients for accounts holding client.view.
  clients: 'client.view',
  tasks: 'task.view',
  calendar: 'calendar.read',
  invoices: 'finance.firm.view',
  'reports/finance': 'finance.firm.view',
  employees: 'employee.view',
  // Roles.jsx is the per-employee permission editor.
  roles: 'employee.manage',
  settings: 'firm.profile.read',
  'audit-log': FIRM_ADMIN_ONLY,
  subscription: FIRM_ADMIN_ONLY,
}

const SIDEBAR_ORDER = [
  'dashboard', 'cases', 'hearings', 'clients', 'tasks', 'calendar',
  'invoices', 'reports/finance', 'employees', 'roles',
  'settings', 'audit-log', 'subscription',
]

export function isFirmAdmin(user) {
  return user?.accountType === 'FIRM_ADMIN'
}

export function isSuperAdmin(user) {
  return Boolean(user?.isSuperAdmin) || user?.accountType === 'SUPER_ADMIN'
}

// Display-only label — never used for access gating (see module comment).
export function resolveAccessRole(user) {
  if (!user) return null
  if (isSuperAdmin(user)) return 'admin'
  if (user.accountType === 'FIRM_ADMIN') return 'firm_admin'
  const byJob = { LAWYER: 'lawyer', SECRETARY: 'secretary', ACCOUNTANT: 'accountant', ASSISTANT: 'assistant' }
  return byJob[user.jobClassification] ?? 'member'
}

// BR-001: the Firm Admin has unrestricted access inside their own firm and
// holds no permission codes at all — mirrors the backend PermissionsGuard,
// which returns true for FIRM_ADMIN before checking any code.
export function hasPermission(user, permissionKey) {
  if (isFirmAdmin(user)) return true
  return (user?.permissions ?? []).includes(permissionKey)
}

export function canSeeSidebarItem(user, path) {
  if (!user) return false
  // Platform-admin sections are only for the Super Admin.
  if (path === 'firms') return isSuperAdmin(user)
  if (isSuperAdmin(user)) return false
  if (!(path in SIDEBAR_PERMISSION)) return false

  const required = SIDEBAR_PERMISSION[path]
  if (required === FIRM_ADMIN_ONLY) return isFirmAdmin(user)
  if (required === null) return true
  return hasPermission(user, required)
}

// Where to land a user right after login — the first sidebar route they
// actually have permission for, so a freshly-onboarded account with nothing
// granted yet doesn't get bounced straight into a 403 on /dashboard.
export function getDefaultRoute(user) {
  if (!user) return '/dashboard'
  if (isSuperAdmin(user)) return '/firms'
  const accessible = SIDEBAR_ORDER.find((path) => canSeeSidebarItem(user, path))
  return accessible ? `/${accessible}` : '/dashboard'
}
