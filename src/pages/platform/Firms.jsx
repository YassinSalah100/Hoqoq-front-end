import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  Plus,
  Users as UsersIcon,
  Mail,
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
import { TENANT_STATUS, USER_STATUS } from '../../data/enums'

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
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [showNewFirm, setShowNewFirm] = useState(false)

  const { data: firms, loading, error, reload } = useFetch(() => tenantsApi.list(), [])
  const { data: users, reload: reloadUsers } = useFetch(() => usersApi.list(), [])
  const { data: plans } = useFetch(() => subscriptionsApi.listPlans(), [])
  const { data: permissionCatalog } = useFetch(() => permissionsApi.catalog(), [])
  const ownerPermissionKeys = useMemo(
    () => (permissionCatalog?.codes ?? []).filter((code) => !code.startsWith('platform.')),
    [permissionCatalog]
  )

  const firmRows = useMemo(() => (Array.isArray(firms) ? firms : firms?.items ?? []), [firms])
  const userRows = useMemo(() => (Array.isArray(users) ? users : users?.items ?? []), [users])

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((firm) => {
            const members = usersByFirm[firm.id] ?? []
            const owner = members.find((m) => m.id === firm.ownerUserId)
            const ownerPending = owner?.status === 'INVITED'
            const subscription = currentSubscriptionOf(firm)
            return (
              <div
                key={firm.id}
                onClick={() => navigate(`/firms/${firm.id}`)}
                className="bg-white rounded-xl shadow-card border border-paper-line overflow-hidden cursor-pointer hover:shadow-md hover:border-brass-200 transition-all"
              >
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-ink-800 text-white shrink-0 flex items-center justify-center overflow-hidden">
                      <AuthedImage
                        hasSource={Boolean(firm.logoUrl)}
                        src={firm.logoUrl ? `${tenantsApi.firmLogoUrl(firm.id)}?v=${encodeURIComponent(firm.logoUrl)}` : null}
                        alt={firm.name}
                        className="w-full h-full object-cover"
                        fallback={<Building2 size={20} />}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink-800 truncate">{firm.name}</p>
                      <p className="text-xs text-ink-400 flex items-center gap-1 mt-1 truncate">
                        <Mail size={11} />
                        <span className="font-mono" dir="ltr">{firm.contactEmail ?? '—'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-paper-line">
                    <div className="flex items-center gap-1.5">
                      {ownerPending && <EnumBadge code="INVITED" map={USER_STATUS} />}
                      <EnumBadge code={firm.status} map={TENANT_STATUS} />
                    </div>
                    <div className="flex items-center gap-2">
                      <SubscriptionBadge subscription={subscription} />
                      <span className="inline-flex items-center gap-1 text-xs bg-paper-soft text-ink-500 px-2 py-0.5 rounded-full">
                        <UsersIcon size={11} />
                        {members.length}
                      </span>
                    </div>
                  </div>
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
    </div>
  )
}
