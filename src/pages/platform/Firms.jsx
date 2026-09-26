import { useMemo, useState } from 'react'
import {
  Building2,
  Plus,
  Users as UsersIcon,
  Mail,
  ShieldCheck,
  Trash2,
  Ban,
  CheckCircle2,
  PlayCircle,
  PauseCircle,
  RefreshCcw,
} from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import SearchInput from '../../components/ui/SearchInput'
import EmptyState from '../../components/ui/EmptyState'
import StatCard from '../../components/ui/StatCard'
import EnumBadge from '../../components/ui/EnumBadge'
import AuthedImage from '../../components/ui/AuthedImage'
import { LoadingBlock, ErrorBlock } from '../../components/ui/AsyncState'
import FormModal from '../../components/ui/FormModal'
import { tenantsApi, usersApi, subscriptionsApi, permissionsApi } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'
import { ACCOUNT_TYPE, JOB_CLASSIFICATION, TENANT_STATUS, USER_STATUS } from '../../data/enums'

// Super Admin portal.
//
// Scope (BR-011): the platform operator sees the firms registered with him and
// who their accounts are — never any case / client / document content.
//
// The ONLY account he creates is a firm's owner, as part of provisioning that
// firm (POST /tenants/provision — atomic firm + owner + subscription). Staff
// accounts (lawyer / secretary / assistant / accountant) are created by the
// firm's own owner from الموظفين inside his workspace.
//
// There's no password field anymore: the backend emails the owner a one-time
// activation link instead of accepting a bootstrap password (POST
// /tenants/provision no longer takes adminPassword as anything but a
// deprecated no-op). adminJobClassification is sent as a fixed 'OTHER' — per
// the backend's own docs it "grants no permissions", it's just descriptive
// metadata, so there's no reason to make the Super Admin pick one for an
// account whose whole point is running the firm, not practicing law under a
// classification.
function buildFirmFields(plans) {
  return [
    { name: 'firmName', label: 'اسم المكتب', required: true, placeholder: 'مكتب العدالة للمحاماة', span: 'full' },
    { name: 'firmContactEmail', label: 'البريد الإلكتروني للمكتب', type: 'email', required: true },
    { name: 'adminFullName', label: 'اسم مالك المكتب', required: true },
    { name: 'adminEmail', label: 'البريد الإلكتروني (للدخول)', type: 'email', required: true },
    {
      name: 'planId',
      label: 'خطة الاشتراك',
      type: 'select',
      required: true,
      options: (plans ?? []).map((p) => ({ value: p.id, label: `${p.name} — ${Number(p.priceMonthly).toLocaleString('ar')} ج.م/شهر` })),
    },
    {
      name: 'billingCycle',
      label: 'دورة الفوترة',
      type: 'select',
      required: true,
      options: [
        { value: 'MONTHLY', label: 'شهري' },
        { value: 'YEARLY', label: 'سنوي' },
      ],
    },
  ]
}

// Subscription.status (backend SubscriptionStatus enum: PENDING/ACTIVE/EXPIRED/CANCELLED).
const SUBSCRIPTION_STATUS_LABELS = {
  PENDING: 'قيد التفعيل',
  ACTIVE: 'نشط',
  EXPIRED: 'منتهي',
  CANCELLED: 'ملغى',
}

// Tenant.subscriptions is a full version history (see TenantsService.findAll
// — relations: ['subscriptions', 'subscriptions.plan']); the one currently
// in effect is whichever row hasn't been superseded by a plan/cycle change
// or archived (mirrors TenantsService.getPlatformOverview's own lookup).
function currentSubscriptionOf(firm) {
  return (firm?.subscriptions ?? []).find((s) => !s.supersededAt && !s.isArchived) ?? null
}

function SubscriptionBadge({ subscription }) {
  if (!subscription) return null
  return (
    <span className="shrink-0 text-[10px] bg-brass-100 text-brass-700 px-2 py-0.5 rounded-full">
      {subscription.plan?.name ?? '—'} ({SUBSCRIPTION_STATUS_LABELS[subscription.status] ?? subscription.status})
    </span>
  )
}

export default function Firms() {
  const [query, setQuery] = useState('')
  const [showNewFirm, setShowNewFirm] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [statusTogglingId, setStatusTogglingId] = useState(null)
  const [subscriptionActionId, setSubscriptionActionId] = useState(null)
  const [changingPlanForId, setChangingPlanForId] = useState(null)

  const { data: firms, loading, error, reload } = useFetch(() => tenantsApi.list(), [])
  const { data: users, reload: reloadUsers } = useFetch(() => usersApi.list(), [])
  const { data: plans } = useFetch(() => subscriptionsApi.listPlans(), [])
  // Full permission catalog, so a newly provisioned firm owner gets full run
  // of their own firm by default instead of the Super Admin having to
  // hand-pick dozens of permission codes for an account that's supposed to
  // have everything anyway.
  const { data: permissionCatalog } = useFetch(() => permissionsApi.catalog(), [])
  const ownerPermissionKeys = useMemo(
    () => (permissionCatalog?.codes ?? []).filter((code) => !code.startsWith('platform.')),
    [permissionCatalog]
  )

  const firmRows = useMemo(() => (Array.isArray(firms) ? firms : firms?.items ?? []), [firms])
  const userRows = useMemo(() => (Array.isArray(users) ? users : users?.items ?? []), [users])

  // Group the platform's user accounts under the firm they belong to.
  const usersByFirm = useMemo(() => {
    const map = {}
    userRows.forEach((u) => {
      const id = u.tenant?.id
      if (!id) return
      map[id] = map[id] ?? []
      map[id].push(u)
    })
    return map
  }, [userRows])

  const filtered = firmRows.filter(
    (f) => !query || (f.name ?? '').includes(query) || (f.contactEmail ?? '').toLowerCase().includes(query.toLowerCase())
  )

  const totalFirmAccounts = userRows.filter((u) => u.tenant).length

  async function handleDeleteFirm(firm) {
    const members = usersByFirm[firm.id] ?? []
    const warning = members.length
      ? `سيتم حذف مكتب "${firm.name}" وجميع حساباته (${members.length}). هل أنت متأكد؟`
      : `هل أنت متأكد من حذف مكتب "${firm.name}"؟`
    if (!confirm(warning)) return

    setDeletingId(firm.id)
    try {
      await tenantsApi.remove(firm.id)
      reload()
      reloadUsers()
    } catch (err) {
      alert(err.message ?? 'تعذر حذف المكتب')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleToggleTenantStatus(firm) {
    const nextStatus = firm.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const question =
      nextStatus === 'INACTIVE'
        ? `هل أنت متأكد من إيقاف مساحة عمل مكتب "${firm.name}"؟`
        : `هل أنت متأكد من تفعيل مساحة عمل مكتب "${firm.name}"؟`
    if (!confirm(question)) return

    setStatusTogglingId(firm.id)
    try {
      await tenantsApi.updateStatus(firm.id, nextStatus)
      reload()
    } catch (err) {
      alert(err.message ?? 'تعذر تحديث حالة المكتب')
    } finally {
      setStatusTogglingId(null)
    }
  }

  // Only a Super Admin can hold `platform.subscription.manage` — a Firm
  // Admin's own permission set can never include it (see
  // TenantsService.provisionTenant/setFirmAdminPermissions, both reject any
  // `platform.*`/`system.*` code). So activating, deactivating, or changing
  // a firm's plan is exclusively a platform-admin action, done here rather
  // than from the firm's own settings/Subscription page.
  async function handleActivateSubscription(firm) {
    setSubscriptionActionId(firm.id)
    try {
      await subscriptionsApi.activate(firm.id)
      reload()
    } catch (err) {
      alert(err.message ?? 'تعذر تفعيل الاشتراك')
    } finally {
      setSubscriptionActionId(null)
    }
  }

  async function handleDeactivateSubscription(firm) {
    if (!confirm(`هل أنت متأكد من إيقاف اشتراك مكتب "${firm.name}"؟`)) return
    setSubscriptionActionId(firm.id)
    try {
      await subscriptionsApi.deactivate(firm.id)
      reload()
    } catch (err) {
      alert(err.message ?? 'تعذر إيقاف الاشتراك')
    } finally {
      setSubscriptionActionId(null)
    }
  }

  const changingPlanFirm = firmRows.find((f) => f.id === changingPlanForId) ?? null

  return (
    <div>
      <PageHeader
        title="المكاتب المسجّلة"
        breadcrumb={[{ label: 'إدارة المنصة' }]}
        actions={
          <Button onClick={() => setShowNewFirm(true)}>
            <Plus size={14} />
            إنشاء مكتب جديد
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard label="إجمالي المكاتب" value={firmRows.length} icon="Building2" accent="gold" />
        <StatCard label="إجمالي حسابات المكاتب" value={totalFirmAccounts} icon="Users" accent="ink" />
      </div>

      <SearchInput
        placeholder="بحث باسم المكتب أو البريد..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-xs mb-6"
      />

      {loading && <LoadingBlock label="جاري تحميل المكاتب..." />}
      {error && <ErrorBlock error={error} onRetry={reload} />}

      {!loading && !error && (filtered.length ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((firm) => {
            const members = usersByFirm[firm.id] ?? []
            // Tenant.status defaults to ACTIVE the moment a firm is
            // provisioned — it says nothing about whether the owner has
            // actually finished activating their account yet (they start
            // as INVITED until they open the emailed link and set a
            // password/MFA). Without this, a freshly created firm looked
            // identical to a fully operational one.
            const owner = members.find((m) => m.id === firm.ownerUserId)
            const ownerPending = owner?.status === 'INVITED'
            return (
              <div key={firm.id} className="bg-white rounded-xl shadow-card border border-paper-line overflow-hidden">
                <div className="flex items-start justify-between gap-3 p-5 border-b border-paper-line">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-ink-800 text-white shrink-0 flex items-center justify-center overflow-hidden">
                      <AuthedImage
                        hasSource={Boolean(firm.logoUrl)}
                        src={firm.logoUrl ? `${tenantsApi.firmLogoUrl(firm.id)}?v=${encodeURIComponent(firm.logoUrl)}` : null}
                        alt={firm.name}
                        className="w-full h-full object-cover"
                        fallback={<Building2 size={18} />}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-800 truncate">{firm.name}</p>
                      <p className="text-xs text-ink-400 flex items-center gap-1 mt-1 truncate">
                        <Mail size={11} />
                        <span className="font-mono" dir="ltr">{firm.contactEmail ?? '—'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {ownerPending && <EnumBadge code="INVITED" map={USER_STATUS} />}
                    <EnumBadge code={firm.status} map={TENANT_STATUS} />
                    <span className="inline-flex items-center gap-1 text-xs bg-paper-soft text-ink-500 px-2.5 py-1 rounded-full">
                      <UsersIcon size={11} />
                      {members.length}
                    </span>
                    <button
                      onClick={() => handleToggleTenantStatus(firm)}
                      disabled={statusTogglingId === firm.id}
                      title={firm.status === 'ACTIVE' ? 'إيقاف مساحة العمل' : 'تفعيل مساحة العمل'}
                      className="text-ink-300 hover:text-brass-700 p-1.5 rounded-lg hover:bg-brass-100 disabled:opacity-50"
                    >
                      {firm.status === 'ACTIVE' ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                    </button>
                    <button
                      onClick={() => handleDeleteFirm(firm)}
                      disabled={deletingId === firm.id}
                      title="حذف المكتب"
                      className="text-ink-300 hover:text-rust-600 p-1.5 rounded-lg hover:bg-rust-100 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <p className="text-xs text-ink-400 shrink-0">حسابات المكتب</p>
                    <div className="flex items-center gap-1.5">
                      <SubscriptionBadge subscription={currentSubscriptionOf(firm)} />
                      <button
                        onClick={() => handleActivateSubscription(firm)}
                        disabled={subscriptionActionId === firm.id}
                        title="تفعيل الاشتراك"
                        className="text-ink-300 hover:text-emerald-600 p-1 rounded-lg hover:bg-emerald-100 disabled:opacity-50"
                      >
                        <PlayCircle size={14} />
                      </button>
                      <button
                        onClick={() => handleDeactivateSubscription(firm)}
                        disabled={subscriptionActionId === firm.id}
                        title="إيقاف الاشتراك"
                        className="text-ink-300 hover:text-rust-600 p-1 rounded-lg hover:bg-rust-100 disabled:opacity-50"
                      >
                        <PauseCircle size={14} />
                      </button>
                      <button
                        onClick={() => setChangingPlanForId(firm.id)}
                        title="تغيير الخطة"
                        className="text-ink-300 hover:text-brass-700 p-1 rounded-lg hover:bg-brass-100"
                      >
                        <RefreshCcw size={14} />
                      </button>
                    </div>
                  </div>
                  {members.length ? (
                    <ul className="space-y-1.5">
                      {members.map((m) => {
                        const isOwner = m.id === firm.ownerUserId
                        return (
                          <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                            <span className="text-ink-700 truncate flex items-center gap-1.5">
                              {isOwner && <ShieldCheck size={12} className="text-brass-600 shrink-0" />}
                              {m.fullName || m.email}
                            </span>
                            <span className="flex items-center gap-1.5 shrink-0">
                              {m.status === 'INVITED' && (
                                <span className="text-[10px] bg-paper-soft text-ink-400 px-2 py-0.5 rounded-full">
                                  {USER_STATUS.INVITED.label}
                                </span>
                              )}
                              <span className="text-xs text-ink-400">
                                {m.accountType === 'EMPLOYEE' && m.jobClassification
                                  ? JOB_CLASSIFICATION[m.jobClassification] ?? m.jobClassification
                                  : ACCOUNT_TYPE[m.accountType] ?? m.accountType}
                              </span>
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-ink-300">لا توجد حسابات لهذا المكتب بعد</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          message="لا توجد مكاتب مسجّلة حتى الآن"
          actionLabel="إنشاء مكتب جديد"
          onAction={() => setShowNewFirm(true)}
        />
      ))}

      <p className="text-xs text-ink-300 mt-6 text-center">
        حسابات المحامين والسكرتارية يُنشئها مالك كل مكتب من داخل مساحة عمله.
      </p>

      {/* The Super Admin provisions the firm (named) together with its owner
          account — nothing else. The owner then creates his own staff. */}
      <FormModal
        open={showNewFirm}
        onClose={() => setShowNewFirm(false)}
        title="إنشاء مكتب جديد ومالكه"
        fields={buildFirmFields(plans)}
        submitLabel="إنشاء المكتب"
        initialValues={{ planId: plans?.[0]?.id, billingCycle: 'MONTHLY' }}
        onSubmit={async (values) => {
          await tenantsApi.provisionFirm({
            ...values,
            adminJobClassification: 'OTHER',
            permissionKeys: ownerPermissionKeys,
          })
          reload()
          reloadUsers()
        }}
      />

      {/* Plan/cycle change is a versioned subscription op (PATCH
          /subscriptions/:tenantId), Super-Admin-only just like activate/
          deactivate — see handleActivateSubscription's comment. `key` forces
          a fresh FormModal instance per firm so its internal form state
          doesn't leak stale values between two different firms' modals. */}
      <FormModal
        key={changingPlanForId ?? 'none'}
        open={Boolean(changingPlanFirm)}
        onClose={() => setChangingPlanForId(null)}
        title={changingPlanFirm ? `تغيير خطة اشتراك «${changingPlanFirm.name}»` : 'تغيير الخطة'}
        fields={[
          {
            name: 'planId',
            label: 'خطة الاشتراك',
            type: 'select',
            required: true,
            options: (plans ?? []).map((p) => ({
              value: p.id,
              label: `${p.name} — ${Number(p.priceMonthly).toLocaleString('ar')} ج.م/شهر`,
            })),
          },
          {
            name: 'billingCycle',
            label: 'دورة الفوترة',
            type: 'select',
            required: true,
            options: [
              { value: 'MONTHLY', label: 'شهري' },
              { value: 'YEARLY', label: 'سنوي' },
            ],
          },
        ]}
        submitLabel="حفظ"
        initialValues={{
          planId: currentSubscriptionOf(changingPlanFirm)?.plan?.id ?? plans?.[0]?.id,
          billingCycle: currentSubscriptionOf(changingPlanFirm)?.billingCycle ?? 'MONTHLY',
        }}
        onSubmit={async (values) => {
          await subscriptionsApi.change(changingPlanFirm.id, values)
          reload()
        }}
      />
    </div>
  )
}
