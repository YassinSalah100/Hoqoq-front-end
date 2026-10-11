// Which app this build is. Set at build time by VITE_DESKTOP_APP:
//   (unset)  web app — every account type, as before
//   'firm'   Hoqooq — Firm Management desktop app (Firm Admin + Employees)
//   'admin'  Hoqooq — Super Admin desktop app (platform administrators only)
// Access is enforced by the backend on every request; this only decides
// which accounts the app accepts and which screens it contains.
const VARIANT = import.meta.env.VITE_DESKTOP_APP ?? 'web'

export const IS_FIRM_APP = VARIANT === 'firm'
export const IS_ADMIN_APP = VARIANT === 'admin'

// Returns the refusal message when this app doesn't accept the account, else null.
export function accountRefusal(user) {
  const isSuperAdmin = user?.accountType === 'SUPER_ADMIN'
  if (IS_FIRM_APP && isSuperAdmin) return 'حساب مشرف المنصة غير متاح في تطبيق سطح المكتب، استخدم تطبيق مشرف المنصة أو الموقع'
  if (IS_ADMIN_APP && !isSuperAdmin) return 'هذا التطبيق مخصص لمشرف المنصة فقط، استخدم تطبيق حقوق لإدارة المكاتب'
  return null
}
