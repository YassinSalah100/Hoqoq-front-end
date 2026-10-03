import { NavLink } from 'react-router-dom'
import BrandMark from '../ui/BrandMark'
import {
  LayoutDashboard,
  Briefcase,
  Calendar,
  Users,
  CheckSquare,
  CalendarDays,
  Receipt,
  BarChart3,
  UserCog,
  ShieldCheck,
  Settings,
  CreditCard,
  History,
  LogOut,
  Building2,
  X,
} from 'lucide-react'
import { ROLE_LABELS, canSeeSidebarItem, resolveAccessRole, isSuperAdmin } from '../../data/auth'
import Avatar from '../ui/Avatar'

const NAV_GROUPS = [
  {
    title: null,
    items: [{ label: 'الرئيسية', to: '/dashboard', key: 'dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'إدارة المنصة',
    items: [
      { label: 'المكاتب', to: '/firms', key: 'firms', icon: Building2 },
    ],
  },
  {
    title: 'إدارة الأعمال',
    items: [
      { label: 'القضايا', to: '/cases', key: 'cases', icon: Briefcase },
      { label: 'الجلسات', to: '/hearings', key: 'hearings', icon: Calendar },
      { label: 'الموكلين', to: '/clients', key: 'clients', icon: Users },
      { label: 'المهام', to: '/tasks', key: 'tasks', icon: CheckSquare },
      { label: 'التقويم', to: '/calendar', key: 'calendar', icon: CalendarDays },
    ],
  },
  {
    title: 'المالية',
    items: [
      { label: 'الفواتير', to: '/invoices', key: 'invoices', icon: Receipt },
      { label: 'التقارير المالية', to: '/reports/finance', key: 'reports/finance', icon: BarChart3 },
    ],
  },
  {
    title: 'الموارد البشرية',
    items: [
      { label: 'الموظفين', to: '/employees', key: 'employees', icon: UserCog },
      { label: 'الأدوار والصلاحيات', to: '/roles', key: 'roles', icon: ShieldCheck },
    ],
  },
  {
    title: 'الإعدادات',
    items: [
      { label: 'إعدادات المكتب', to: '/settings', key: 'settings', icon: Settings },
      { label: 'الاشتراك', to: '/subscription', key: 'subscription', icon: CreditCard },
      { label: 'سجل الأحداث', to: '/audit-log', key: 'audit-log', icon: History },
    ],
  },
]

export default function Sidebar({ user, onLogout, mobileOpen, onCloseMobile }) {
  const role = resolveAccessRole(user)

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canSeeSidebarItem(user, item.key)),
  })).filter((group) => group.items.length > 0)

  return (
    <>
      {/* Below lg, the sidebar is an off-canvas drawer over a backdrop instead
          of a permanent 256px column — otherwise it eats most of a phone
          screen. */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-ink-900/50 lg:hidden" onClick={onCloseMobile} />
      )}

      <aside
        className={`w-64 shrink-0 bg-ink-800 text-white flex flex-col h-screen fixed lg:sticky top-0 z-50 transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        } right-0 lg:right-auto`}
      >
        <div className="flex items-start justify-between gap-2.5 px-5 pt-5 pb-4 border-b border-white/10 shrink-0">
          <div className="min-w-0">
            <BrandMark size={44} variant="dark" />
            <span className="mt-3 inline-block max-w-full truncate rounded-md bg-brass-500/15 border border-brass-500/25 px-2 py-0.5 text-[11px] text-brass-300">
              {isSuperAdmin(user) ? 'لوحة المشرف' : user?.tenant?.name ?? 'مساحة العمل'}
            </span>
          </div>
          <button onClick={onCloseMobile} className="p-1 rounded-lg text-ink-300 hover:text-white hover:bg-white/10 lg:hidden shrink-0">
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {visibleGroups.map((group, i) => (
            <div key={i}>
              {group.title && (
                <p className="px-3 mb-1.5 text-xs text-ink-300/70 font-medium">{group.title}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-brass-500/15 text-brass-300 font-medium border-r-2 border-brass-400'
                          : 'text-ink-300 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    <item.icon size={15} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 flex items-center gap-3 shrink-0">
          <Avatar name={user?.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-ink-300/70 truncate">{ROLE_LABELS[role] ?? role}</p>
          </div>
          <button
            onClick={onLogout}
            title="تسجيل الخروج"
            className="p-1.5 rounded-lg text-ink-300 hover:text-white hover:bg-white/10 shrink-0"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>
    </>
  )
}
