import { useParams, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import {
  Building2,
  Mail,
  Users as UsersIcon,
  ShieldCheck,
  Ban,
  CheckCircle2,
  PlayCircle,
  PauseCircle,
  RefreshCcw,
  ArrowRight,
} from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import EnumBadge from '../../components/ui/EnumBadge'
import AuthedImage from '../../components/ui/AuthedImage'
import StatCard from '../../components/ui/StatCard'
import { LoadingBlock, ErrorBlock } from '../../components/ui/AsyncState'
import FormModal from '../../components/ui/FormModal'
import { tenantsApi, usersApi, subscriptionsApi } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'
import { ACCOUNT_TYPE, JOB_CLASSIFICATION, TENANT_STATUS, USER_STATUS } from '../../data/enums'

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
    <span className="shrink-0 text-xs bg-brass-100 text-brass-700 px-2.5 py-1 rounded-full">
      {subscription.plan?.name ?? '—'} ({SUBSCRIPTION_STATUS_LABELS[subscription.status] ?? subscription.status})
    </span>
  )
}

export default function FirmDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [statusTogglingId, setStatusTogglingId] = useState(null)
  const [subscriptionActionId, setSubscriptionActionId] = useState(null)
  const [changingPlan, setChangingPlan] = useState(false)

  const { data: firm, loading, error, reload } = useFetch(() => tenantsApi.get(id), [id])
  const { data: users } = useFetch(() => usersApi.list(), [])
  const { data: plans } = useFetch(() => subscriptionsApi.listPlans(), [])

  const userRows = useMemo(() => (Array.isArray(users) ? users : users?.items ?? []), [users])

  const members = useMemo(
    () => userRows.filter((u) => u.tenant?.id === id),
    [userRows, id]
  )

  const owner = members.find((m) => m.id === firm?.ownerUserId)

  async function handleToggleTenantStatus() {
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

  async function handleActivateSubscription() {
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

  async function handleDeactivateSubscription() {
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

  if (loading) return <LoadingBlock label="جاري تحميل بيانات المكتب..." />
  if (error) return <ErrorBlock error={error} onRetry={reload} />
  if (!firm) return <ErrorBlock error="لم يتم العثور على المكتب" onRetry={() => navigate('/firms')} />

  const subscription = currentSubscriptionOf(firm)
  const ownerPending = owner?.status === 'INVITED'
  const employees = members.filter((m) => m.id !== firm.ownerUserId)

  return (
    <div>
      <PageHeader
        title={firm.name}
        breadcrumb={[{ label: 'إدارة المنصة' }, { label: 'المكاتب', to: '/firms' }, { label: firm.name }]}
      />

      {/* Firm info header */}
      <div className="bg-white rounded-xl shadow-card border border-paper-line p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-ink-800 text-white shrink-0 flex items-center justify-center overflow-hidden">
              <AuthedImage
                hasSource={Boolean(firm.logoUrl)}
                src={firm.logoUrl ? `${tenantsApi.firmLogoUrl(firm.id)}?v=${encodeURIComponent(firm.logoUrl)}` : null}
                alt={firm.name}
                className="w-full h-full object-cover"
                fallback={<Building2 size={28} />}
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink-800">{firm.name}</h2>
              <p className="text-sm text-ink-400 flex items-center gap-1.5 mt-1">
                <Mail size={13} />
                <span className="font-mono" dir="ltr">{firm.contactEmail ?? '—'}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {ownerPending && <EnumBadge code="INVITED" map={USER_STATUS} />}
            <EnumBadge code={firm.status} map={TENANT_STATUS} />
            <button
              onClick={handleToggleTenantStatus}
              disabled={statusTogglingId === firm.id}
              title={firm.status === 'ACTIVE' ? 'إيقاف مساحة العمل' : 'تفعيل مساحة العمل'}
              className="text-ink-300 hover:text-brass-700 p-2 rounded-lg hover:bg-brass-100 disabled:opacity-50"
            >
              {firm.status === 'ACTIVE' ? <Ban size={16} /> : <CheckCircle2 size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="إجمالي الحسابات" value={members.length} icon="Users" accent="ink" />
        <StatCard label="الموظفين" value={employees.length} icon="Users" accent="gold" />
        <StatCard
          label="الاشتراك"
          value={subscription?.plan?.name ?? '—'}
          icon="Building2"
          accent="gold"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription section */}
        <div className="bg-white rounded-xl shadow-card border border-paper-line overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-paper-line">
            <h3 className="font-semibold text-ink-800">الاشتراك</h3>
            <div className="flex items-center gap-1.5">
              <SubscriptionBadge subscription={subscription} />
              <button
                onClick={handleActivateSubscription}
                disabled={subscriptionActionId === firm.id}
                title="تفعيل الاشتراك"
                className="text-ink-300 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-100 disabled:opacity-50"
              >
                <PlayCircle size={15} />
              </button>
              <button
                onClick={handleDeactivateSubscription}
                disabled={subscriptionActionId === firm.id}
                title="إيقاف الاشتراك"
                className="text-ink-300 hover:text-rust-600 p-1.5 rounded-lg hover:bg-rust-100 disabled:opacity-50"
              >
                <PauseCircle size={15} />
              </button>
              <button
                onClick={() => setChangingPlan(true)}
                title="تغيير الخطة"
                className="text-ink-300 hover:text-brass-700 p-1.5 rounded-lg hover:bg-brass-100"
              >
                <RefreshCcw size={15} />
              </button>
            </div>
          </div>
          <div className="p-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-400">الخطة</span>
              <span className="text-ink-700 font-medium">{subscription?.plan?.name ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-400">الحالة</span>
              <span className="text-ink-700">{SUBSCRIPTION_STATUS_LABELS[subscription?.status] ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-400">دورة الفوترة</span>
              <span className="text-ink-700">{subscription?.billingCycle === 'YEARLY' ? 'سنوي' : 'شهري'}</span>
            </div>
            {subscription?.plan?.priceMonthly != null && (
              <div className="flex justify-between">
                <span className="text-ink-400">السعر الشهري</span>
                <span className="text-ink-700 font-mono" dir="ltr">{Number(subscription.plan.priceMonthly).toLocaleString('ar')} ج.م</span>
              </div>
            )}
          </div>
        </div>

        {/* Firm admin (owner) */}
        <div className="bg-white rounded-xl shadow-card border border-paper-line overflow-hidden">
          <div className="px-5 py-4 border-b border-paper-line">
            <h3 className="font-semibold text-ink-800">مدير المكتب</h3>
          </div>
          <div className="p-5">
            {owner ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brass-100 text-brass-700 flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="font-semibold text-ink-800">{owner.fullName || owner.email}</p>
                  <p className="text-xs text-ink-400 font-mono mt-0.5" dir="ltr">{owner.email}</p>
                  {owner.status === 'INVITED' && (
                    <span className="inline-block text-[10px] bg-paper-soft text-ink-400 px-2 py-0.5 rounded-full mt-1">
                      {USER_STATUS.INVITED.label}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-300">لا يوجد مدير مكتب</p>
            )}
          </div>
        </div>
      </div>

      {/* Employees list */}
      <div className="bg-white rounded-xl shadow-card border border-paper-line overflow-hidden mt-6">
        <div className="flex items-center justify-between px-5 py-4 border-b border-paper-line">
          <h3 className="font-semibold text-ink-800">حسابات المكتب</h3>
          <span className="inline-flex items-center gap-1 text-xs bg-paper-soft text-ink-500 px-2.5 py-1 rounded-full">
            <UsersIcon size={11} />
            {members.length}
          </span>
        </div>
        <div className="p-5">
          {members.length ? (
            <ul className="space-y-3">
              {members.map((m) => {
                const isOwner = m.id === firm.ownerUserId
                return (
                  <li key={m.id} className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg hover:bg-paper-soft/50">
                    <span className="text-sm text-ink-700 truncate flex items-center gap-2">
                      {isOwner && <ShieldCheck size={14} className="text-brass-600 shrink-0" />}
                      <span className="font-medium">{m.fullName || m.email}</span>
                      <span className="text-xs text-ink-300 font-mono hidden sm:inline" dir="ltr">{m.email}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      {m.status === 'INVITED' && (
                        <span className="text-[10px] bg-paper-soft text-ink-400 px-2 py-0.5 rounded-full">
                          {USER_STATUS.INVITED.label}
                        </span>
                      )}
                      <span className="text-xs text-ink-400">
                        {isOwner
                          ? ACCOUNT_TYPE.FIRM_ADMIN
                          : m.accountType === 'EMPLOYEE' && m.jobClassification
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

      <FormModal
        open={changingPlan}
        onClose={() => setChangingPlan(false)}
        title={`تغيير خطة اشتراك «${firm.name}»`}
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
          planId: subscription?.plan?.id ?? plans?.[0]?.id,
          billingCycle: subscription?.billingCycle ?? 'MONTHLY',
        }}
        onSubmit={async (values) => {
          await subscriptionsApi.change(firm.id, values)
          reload()
        }}
      />
    </div>
  )
}
