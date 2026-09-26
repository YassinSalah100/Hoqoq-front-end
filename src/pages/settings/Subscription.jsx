import { Building2, Mail, Timer, Package } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import EmptyState from '../../components/ui/EmptyState'
import { LoadingBlock, ErrorBlock } from '../../components/ui/AsyncState'
import { tenantsApi } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'

// Subscription.status (backend SubscriptionStatus enum) — PENDING/ACTIVE/
// EXPIRED/CANCELLED only; there is no PAST_DUE or SUSPENDED value.
const STATUS_LABELS = {
  PENDING: 'قيد التفعيل',
  ACTIVE: 'نشط',
  EXPIRED: 'منتهي',
  CANCELLED: 'ملغى',
}

const BILLING_CYCLE_LABELS = {
  MONTHLY: 'شهري',
  YEARLY: 'سنوي',
}

// Read-only: activating/deactivating a subscription or changing its plan
// requires `platform.subscription.manage`, a platform permission a Firm
// Admin's account can never hold (see PermissionsGuard — platform.*/system.*
// codes are rejected outright for any non-SUPER_ADMIN account, and
// TenantsService.provisionTenant/setFirmAdminPermissions refuse to grant
// them in the first place). That management lives on the platform Firms
// page instead, where the Super Admin actually has the permission.
export default function Subscription() {
  const { data: firm, loading, error, reload } = useFetch(() => tenantsApi.getMyFirm(), [])

  if (loading) return <LoadingBlock label="جاري تحميل بيانات الاشتراك..." />
  if (error) return <ErrorBlock error={error} onRetry={reload} />
  if (!firm) return <EmptyState icon={Building2} message="لا توجد بيانات اشتراك" />

  // Tenant.subscriptions is a full version history (relations:
  // ['subscriptions', 'subscriptions.plan']) — the one in effect is
  // whichever row hasn't been superseded by a plan/cycle change or archived.
  const subscription = (firm.subscriptions ?? []).find((s) => !s.supersededAt && !s.isArchived) ?? null
  const plan = subscription?.plan

  const rows = [
    ['اسم المكتب', firm.name, Building2],
    ['البريد الإلكتروني', firm.contactEmail, Mail],
  ].filter(([, value]) => value)

  return (
    <div>
      <PageHeader title="الاشتراك" />

      <div className="max-w-md bg-white rounded-xl p-6 shadow-card border border-paper-line">
        {plan ? (
          <div className="flex items-center gap-2.5 p-3 rounded-lg mb-3 bg-brass-100 text-brass-700">
            <Package size={16} className="shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium">{plan.name}</p>
              <p className="text-xs opacity-80">
                {Number(subscription.billingCycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly).toLocaleString('ar')} ج.م /{' '}
                {BILLING_CYCLE_LABELS[subscription.billingCycle] ?? subscription.billingCycle}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 p-3 rounded-lg mb-3 bg-paper-soft text-ink-400">
            <Package size={16} className="shrink-0" />
            <p className="text-sm">لا توجد خطة اشتراك مفعّلة</p>
          </div>
        )}

        {subscription && (
          <div
            className={`flex items-center gap-2.5 p-3 rounded-lg mb-5 ${
              subscription.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-brass-100 text-brass-700'
            }`}
          >
            <Timer size={16} className="shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium">{STATUS_LABELS[subscription.status] ?? subscription.status}</p>
              {subscription.currentPeriodEnd && (
                <p className="text-xs opacity-80">
                  ينتهي في {new Date(subscription.currentPeriodEnd).toLocaleDateString('ar-SA')}
                </p>
              )}
            </div>
          </div>
        )}

        <p className="text-sm text-ink-400 mb-4">بيانات المكتب المشترك</p>
        <ul className="space-y-3">
          {rows.map(([label, value, Icon]) => (
            <li key={label} className="flex items-start gap-2.5">
              <Icon size={14} className="text-ink-300 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-ink-400">{label}</p>
                <p className="text-sm text-ink-800 truncate">{value}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
