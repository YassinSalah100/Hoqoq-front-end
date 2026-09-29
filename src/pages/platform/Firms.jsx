import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Plus,
  Users as UsersIcon,
  Mail,
  ShieldCheck,
  ChevronLeft,
  X,
  CreditCard,
  CalendarDays,
  PlayCircle,
  PauseCircle,
  RefreshCcw,
  Power,
  Clock,
  UserRound,
} from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import SearchInput from '../../components/ui/SearchInput'
import EmptyState from '../../components/ui/EmptyState'
import StatCard from '../../components/ui/StatCard'
import AuthedImage from '../../components/ui/AuthedImage'
import { LoadingBlock, ErrorBlock } from '../../components/ui/AsyncState'
import FormModal from '../../components/ui/FormModal'
import { tenantsApi, usersApi, subscriptionsApi, permissionsApi } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'
import { ACCOUNT_TYPE, JOB_CLASSIFICATION } from '../../data/enums'

// Super Admin portal.
//
// Scope (BR-011): the platform operator sees the firms registered with him and
// who their accounts are — never any case / client / document content. He
// can suspend a firm's workspace or subscription, but never delete a firm or
// its accounts (the backend has no delete endpoint for it either).
//
// The ONLY account he creates is a firm's owner, as part of provisioning that
// firm (POST /tenants/provision — atomic firm + owner + subscription). The
// owner is emailed a one-time activation link; staff accounts are created by
// the owner from inside his own workspace. adminJobClassification is sent as
// a fixed 'OTHER' — it's descriptive metadata that grants no permissions.
function buildFirmFields(plans) {
  return [
    { name: 'firmName', label: 'اسم المكتب', required: true, placeholder: 'مكتب العدالة للمحاماة', span: 'full' },
    { name: 'firmContactEmail', label: 'البريد الإلكتروني للمكتب', type: 'email', required: true },
    { name: 'adminFullName', label: 'اسم مالك المكتب', required: true },
    { name: 'adminEmail', label: 'البريد الإلكتروني (للدخول)', type: 'email', required: true },
    { name: 'planId', label: 'خطة الاشتراك', type: 'select', required: true, options: planOptions(plans) },
    { name: 'billingCycle', label: 'دورة الفوترة', type: 'select', required: true, options: CYCLE_OPTIONS },
  ]
}

const CYCLE_OPTIONS = [
  { value: 'MONTHLY', label: 'شهري' },
  { value: 'YEARLY', label: 'سنوي' },
]
const CYCLE_LABELS = { MONTHLY: 'شهري', YEARLY: 'سنوي' }

function planOptions(plans) {
  return (plans ?? []).map((p) => ({
    value: p.id,
    label: `${p.name} — ${Number(p.priceMonthly).toLocaleString('ar-EG')} ج.م/شهر`,
  }))
}

// Subscription.status (backend enum: PENDING / ACTIVE / EXPIRED / CANCELLED).
const SUBSCRIPTION_STATUS = {
  PENDING: { label: 'قيد التفعيل', cls: 'bg-brass-100 text-brass-700' },
  ACTIVE: { label: 'اشتراك نشط', cls: 'bg-emerald-100 text-emerald-700' },
  EXPIRED: { label: 'منتهي', cls: 'bg-rust-100 text-rust-600' },
  CANCELLED: { label: 'ملغى', cls: 'bg-rust-100 text-rust-600' },
}

const USER_STATUS_STYLE = {
  ACTIVE: { label: 'نشط', cls: 'bg-emerald-100 text-emerald-700' },
  INVITED: { label: 'في انتظار التفعيل', cls: 'bg-brass-100 text-brass-700' },
  INACTIVE: { label: 'موقوف', cls: 'bg-rust-100 text-rust-600' },
}

function Pill({ className = '', children }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-medium px-2.5 py-1 rounded-full ${className}`}>{children}</span>
}

// Tenant.subscriptions is the full version history; the one in effect is the
// row that hasn't been superseded by a plan change or archived.
function currentSubscriptionOf(firm) {
  return (firm?.subscriptions ?? []).find((s) => !s.supersededAt && !s.isArchived) ?? null
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
}

function memberRole(m) {
  return m.accountType === 'EMPLOYEE' && m.jobClassification
    ? JOB_CLASSIFICATION[m.jobClassification] ?? m.jobClassification
    : ACCOUNT_TYPE[m.accountType] ?? m.accountType
}

function FirmLogo({ firm, size = 40 }) {
  return (
    <div
      className="rounded-lg bg-ink-800 text-brass-300 shrink-0 flex items-center justify-center overflow-hidden ring-1 ring-paper-line"
      style={{ width: size, height: size }}
    >
      <AuthedImage
        hasSource={Boolean(firm.logoUrl)}
        src={firm.logoUrl ? `${tenantsApi.firmLogoUrl(firm.id)}?v=${encodeURIComponent(firm.logoUrl)}` : null}
        alt={firm.name}
        className="w-full h-full object-cover bg-white"
        fallback={<Building2 size={Math.round(size * 0.45)} />}
      />
    </div>
  )
}

// A firm is "awaiting activation" until its owner has opened the emailed
// link (owner INVITED) or its subscription is still PENDING — Tenant.status
// alone is ACTIVE from the moment the firm is provisioned.
function firmHealth(firm, owner) {
  const sub = currentSubscriptionOf(firm)
  if (firm.status !== 'ACTIVE') return 'suspended'
  if (owner?.status === 'INVITED' || !sub || sub.status === 'PENDING') return 'pending'
  if (sub.status !== 'ACTIVE') return 'lapsed'
  return 'active'
}

const HEALTH_PILL = {
  active: { label: 'نشط', cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  pending: { label: 'في انتظار التفعيل', cls: 'bg-brass-100 text-brass-700', dot: 'bg-brass-500' },
  lapsed: { label: 'اشتراك غير نشط', cls: 'bg-rust-100 text-rust-600', dot: 'bg-rust-500' },
  suspended: { label: 'مساحة العمل موقوفة', cls: 'bg-rust-100 text-rust-600', dot: 'bg-rust-500' },
}

function HealthPill({ health }) {
  const h = HEALTH_PILL[health]
  return (
    <Pill className={h.cls}>
      <span className={`w-1.5 h-1.5 rounded-full ${h.dot}`} />
      {h.label}
    </Pill>
  )
}

function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-paper-line last:border-0">
      <span className="flex items-center gap-2 text-[13px] text-ink-400 shrink-0">
        <Icon size={15} className="text-ink-300" />
        {label}
      </span>
      <span className="text-[13px] text-ink-800 text-left">{children}</span>
    </div>
  )
}

function FirmDrawer({ firm, members, busy, onClose, onToggleWorkspace, onActivateSub, onDeactivateSub, onChangePlan }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const sub = currentSubscriptionOf(firm)
  const owner = members.find((m) => m.id === firm.ownerUserId)
  const health = firmHealth(firm, owner)
  const subStyle = SUBSCRIPTION_STATUS[sub?.status]
  const price = sub?.plan
    ? sub.billingCycle === 'YEARLY'
      ? `${Number(sub.plan.priceYearly).toLocaleString('ar-EG')} ج.م / سنة`
      : `${Number(sub.plan.priceMonthly).toLocaleString('ar-EG')} ج.م / شهر`
    : '—'

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="absolute inset-y-0 left-0 w-full max-w-[520px] bg-paper shadow-pop flex flex-col">
        <div className="bg-white border-b border-paper-line px-6 pt-5 pb-6">
          <div className="flex justify-end">
            <button onClick={onClose} className="p-1.5 rounded-lg text-ink-400 hover:text-ink-800 hover:bg-paper-soft" aria-label="إغلاق">
              <X size={18} />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <FirmLogo firm={firm} size={64} />
            <div className="min-w-0">
              <h2 className="font-display text-[22px] font-bold text-ink-800 truncate">{firm.name}</h2>
              <p className="flex items-center gap-1.5 text-[13px] text-ink-400 mt-1">
                <Mail size={13} />
                <span dir="ltr" className="truncate">{firm.contactEmail ?? '—'}</span>
              </p>
              <div className="mt-2.5">
                <HealthPill health={health} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <section>
            <h3 className="text-[12px] font-semibold text-ink-400 mb-3">الإجراءات</h3>
            <div className="grid grid-cols-2 gap-2 [&>button]:justify-center [&>button]:py-2.5">
              {sub?.status === 'ACTIVE' ? (
                <Button variant="secondary" onClick={onDeactivateSub} disabled={busy}>
                  <PauseCircle size={15} />
                  إيقاف الاشتراك
                </Button>
              ) : (
                <Button onClick={onActivateSub} disabled={busy}>
                  <PlayCircle size={15} />
                  تفعيل الاشتراك
                </Button>
              )}
              <Button variant="secondary" onClick={onChangePlan} disabled={busy}>
                <RefreshCcw size={15} />
                تغيير الخطة
              </Button>
              <Button variant="secondary" onClick={onToggleWorkspace} disabled={busy} className="col-span-2">
                <Power size={15} />
                {firm.status === 'ACTIVE' ? 'إيقاف مساحة العمل' : 'إعادة تفعيل مساحة العمل'}
              </Button>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-paper-line shadow-card px-5 py-2">
            <div className="flex items-center justify-between py-3 border-b border-paper-line">
              <h3 className="text-[14px] font-semibold text-ink-800">الاشتراك</h3>
              {subStyle && <Pill className={subStyle.cls}>{subStyle.label}</Pill>}
            </div>
            <DetailRow icon={CreditCard} label="الخطة">
              <span className="font-semibold">{sub?.plan?.name ?? '—'}</span>
              {sub?.billingCycle && <span className="text-ink-400"> · {CYCLE_LABELS[sub.billingCycle]}</span>}
            </DetailRow>
            <DetailRow icon={CreditCard} label="القيمة">{price}</DetailRow>
            <DetailRow icon={CalendarDays} label="بداية الفترة">{formatDate(sub?.currentPeriodStart)}</DetailRow>
            <DetailRow icon={CalendarDays} label="نهاية الفترة">{formatDate(sub?.currentPeriodEnd)}</DetailRow>
          </section>

          <section className="bg-white rounded-xl border border-paper-line shadow-card px-5 py-2">
            <div className="py-3 border-b border-paper-line">
              <h3 className="text-[14px] font-semibold text-ink-800">بيانات المكتب</h3>
            </div>
            <DetailRow icon={UserRound} label="المالك">{owner?.fullName || owner?.email || '—'}</DetailRow>
            <DetailRow icon={Mail} label="بريد المالك">
              <span dir="ltr">{owner?.email ?? '—'}</span>
            </DetailRow>
            <DetailRow icon={Clock} label="تاريخ التسجيل">{formatDate(firm.createdAt)}</DetailRow>
          </section>

          <section className="bg-white rounded-xl border border-paper-line shadow-card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-paper-line">
              <h3 className="text-[14px] font-semibold text-ink-800">حسابات المكتب</h3>
              <span className="text-[12px] text-ink-400">{members.length} حساب</span>
            </div>
            {members.length ? (
              <ul>
                {members.map((m) => {
                  const isOwner = m.id === firm.ownerUserId
                  const st = USER_STATUS_STYLE[m.status]
                  return (
                    <li key={m.id} className="flex items-center gap-3 px-5 py-3 border-b border-paper-line last:border-0">
                      <div className="w-9 h-9 rounded-full bg-brass-100 text-brass-700 flex items-center justify-center text-[13px] font-semibold shrink-0">
                        {(m.fullName || m.email || '?').trim().charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-[14px] font-medium text-ink-800 truncate">
                          {m.fullName || m.email}
                          {isOwner && <ShieldCheck size={14} className="text-brass-600 shrink-0" />}
                        </p>
                        <p className="text-[12px] text-ink-400 truncate" dir="ltr" style={{ textAlign: 'right' }}>{m.email}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[12px] text-ink-500">{isOwner ? 'مالك المكتب' : memberRole(m)}</span>
                        {st && m.status !== 'ACTIVE' && <Pill className={st.cls}>{st.label}</Pill>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="px-5 py-6 text-[13px] text-ink-400 text-center">لا توجد حسابات لهذا المكتب بعد</p>
            )}
          </section>

          <p className="text-[12px] text-ink-300 text-center">
            حسابات المحامين والسكرتارية يُنشئها مالك المكتب من داخل مساحة عمله.
          </p>
        </div>
      </aside>
    </div>
  )
}

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'active', label: 'نشطة' },
  { key: 'pending', label: 'في انتظار التفعيل' },
  { key: 'inactive', label: 'موقوفة' },
]

export default function Firms() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [showNewFirm, setShowNewFirm] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [changingPlanForId, setChangingPlanForId] = useState(null)

  const { data: firms, loading, error, reload } = useFetch(() => tenantsApi.list(), [])
  const { data: users, reload: reloadUsers } = useFetch(() => usersApi.list(), [])
  const { data: plans } = useFetch(() => subscriptionsApi.listPlans(), [])
  // Full permission catalog, so a newly provisioned firm owner gets full run
  // of their own firm by default.
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
      ;(map[id] ??= []).push(u)
    })
    return map
  }, [userRows])

  const healthById = useMemo(() => {
    const map = {}
    firmRows.forEach((f) => {
      const owner = (usersByFirm[f.id] ?? []).find((m) => m.id === f.ownerUserId)
      map[f.id] = firmHealth(f, owner)
    })
    return map
  }, [firmRows, usersByFirm])

  const counts = useMemo(() => {
    const c = { all: firmRows.length, active: 0, pending: 0, inactive: 0 }
    firmRows.forEach((f) => {
      const h = healthById[f.id]
      if (h === 'active') c.active++
      else if (h === 'pending') c.pending++
      else c.inactive++
    })
    return c
  }, [firmRows, healthById])

  const q = query.trim().toLowerCase()
  const filtered = firmRows.filter((f) => {
    const h = healthById[f.id]
    if (filter === 'active' && h !== 'active') return false
    if (filter === 'pending' && h !== 'pending') return false
    if (filter === 'inactive' && !(h === 'lapsed' || h === 'suspended')) return false
    if (!q) return true
    return (f.name ?? '').toLowerCase().includes(q) || (f.contactEmail ?? '').toLowerCase().includes(q)
  })

  const selectedFirm = firmRows.find((f) => f.id === selectedId) ?? null
  const changingPlanFirm = firmRows.find((f) => f.id === changingPlanForId) ?? null

  async function runAction(fn, failMessage) {
    setBusy(true)
    try {
      await fn()
      reload()
      reloadUsers()
    } catch (err) {
      alert(err.message ?? failMessage)
    } finally {
      setBusy(false)
    }
  }

  function toggleWorkspace(firm) {
    const next = firm.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const question =
      next === 'INACTIVE'
        ? `سيتم إيقاف مساحة عمل مكتب «${firm.name}» ولن يتمكن أي من حساباته من الدخول. هل تريد المتابعة؟`
        : `هل تريد إعادة تفعيل مساحة عمل مكتب «${firm.name}»؟`
    if (!confirm(question)) return
    runAction(() => tenantsApi.updateStatus(firm.id, next), 'تعذر تحديث حالة المكتب')
  }

  function deactivateSub(firm) {
    if (!confirm(`هل تريد إيقاف اشتراك مكتب «${firm.name}»؟`)) return
    runAction(() => subscriptionsApi.deactivate(firm.id), 'تعذر إيقاف الاشتراك')
  }

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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="إجمالي المكاتب" value={counts.all} icon="Building2" accent="gold" />
        <StatCard label="مكاتب نشطة" value={counts.active} icon="CheckCircle2" accent="gold" />
        <StatCard label="في انتظار التفعيل" value={counts.pending} icon="Clock" accent="ink" />
        <StatCard label="إجمالي الحسابات" value={userRows.filter((u) => u.tenant).length} icon="Users" accent="ink" />
      </div>

      <div className="bg-white rounded-xl border border-paper-line shadow-card overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4 border-b border-paper-line">
          <div className="flex items-center gap-1 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-2 whitespace-nowrap px-3 py-1.5 rounded-lg text-[13px] transition-colors ${
                  filter === f.key ? 'bg-ink-800 text-white' : 'text-ink-500 hover:bg-paper-soft'
                }`}
              >
                {f.label}
                <span className={`text-[11px] px-1.5 rounded-md ${filter === f.key ? 'bg-white/15' : 'bg-paper-soft text-ink-400'}`}>
                  {counts[f.key]}
                </span>
              </button>
            ))}
          </div>
          <SearchInput
            placeholder="بحث باسم المكتب أو البريد..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="md:w-72"
          />
        </div>

        {loading && <LoadingBlock label="جاري تحميل المكاتب..." />}
        {error && (
          <div className="p-5">
            <ErrorBlock error={error} onRetry={reload} />
          </div>
        )}

        {!loading && !error && (
          filtered.length ? (
            <>
              <div className="hidden md:grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_90px_28px] gap-4 px-5 py-2.5 bg-paper text-[12px] font-medium text-ink-400">
                <span>المكتب</span>
                <span>الخطة</span>
                <span>الحالة</span>
                <span>الحسابات</span>
                <span />
              </div>
              <ul>
                {filtered.map((firm) => {
                  const members = usersByFirm[firm.id] ?? []
                  const sub = currentSubscriptionOf(firm)
                  return (
                    <li key={firm.id}>
                      <button
                        onClick={() => setSelectedId(firm.id)}
                        className="group w-full text-right grid grid-cols-[minmax(0,1fr)_28px] md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_90px_28px] items-center gap-4 px-5 py-4 border-t border-paper-line hover:bg-brass-50/60 transition-colors"
                      >
                        <span className="flex items-center gap-3 min-w-0">
                          <FirmLogo firm={firm} />
                          <span className="min-w-0">
                            <span className="block text-[14px] font-semibold text-ink-800 truncate">{firm.name}</span>
                            <span className="block text-[12px] text-ink-400 truncate" dir="ltr" style={{ textAlign: 'right' }}>
                              {firm.contactEmail ?? '—'}
                            </span>
                          </span>
                        </span>
                        <span className="hidden md:block text-[13px] text-ink-700">
                          {sub?.plan?.name ?? '—'}
                          {sub?.billingCycle && <span className="text-ink-400"> · {CYCLE_LABELS[sub.billingCycle]}</span>}
                        </span>
                        <span className="hidden md:block">
                          <HealthPill health={healthById[firm.id]} />
                        </span>
                        <span className="hidden md:flex items-center gap-1.5 text-[13px] text-ink-500">
                          <UsersIcon size={14} className="text-ink-300" />
                          {members.length}
                        </span>
                        <ChevronLeft size={18} className="text-ink-300 group-hover:text-brass-600 transition-colors" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : firmRows.length ? (
            <p className="px-5 py-12 text-center text-[13px] text-ink-400">لا توجد مكاتب تطابق البحث</p>
          ) : (
            <EmptyState
              icon={Building2}
              message="لا توجد مكاتب مسجّلة حتى الآن"
              actionLabel="إنشاء مكتب جديد"
              onAction={() => setShowNewFirm(true)}
            />
          )
        )}
      </div>

      {selectedFirm && (
        <FirmDrawer
          firm={selectedFirm}
          members={usersByFirm[selectedFirm.id] ?? []}
          busy={busy}
          onClose={() => setSelectedId(null)}
          onToggleWorkspace={() => toggleWorkspace(selectedFirm)}
          onActivateSub={() => runAction(() => subscriptionsApi.activate(selectedFirm.id), 'تعذر تفعيل الاشتراك')}
          onDeactivateSub={() => deactivateSub(selectedFirm)}
          onChangePlan={() => setChangingPlanForId(selectedFirm.id)}
        />
      )}

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

      {/* `key` forces a fresh FormModal per firm so form state doesn't leak
          between two different firms. */}
      <FormModal
        key={changingPlanForId ?? 'none'}
        open={Boolean(changingPlanFirm)}
        onClose={() => setChangingPlanForId(null)}
        title={changingPlanFirm ? `تغيير خطة اشتراك «${changingPlanFirm.name}»` : 'تغيير الخطة'}
        fields={[
          { name: 'planId', label: 'خطة الاشتراك', type: 'select', required: true, options: planOptions(plans) },
          { name: 'billingCycle', label: 'دورة الفوترة', type: 'select', required: true, options: CYCLE_OPTIONS },
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
