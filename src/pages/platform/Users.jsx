import { useMemo, useState } from 'react'
import { Ban, CheckCircle2, Mail, Users as UsersIcon } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import DataTable from '../../components/ui/DataTable'
import Avatar from '../../components/ui/Avatar'
import EnumBadge from '../../components/ui/EnumBadge'
import SearchInput from '../../components/ui/SearchInput'
import EmptyState from '../../components/ui/EmptyState'
import { LoadingBlock, ErrorBlock } from '../../components/ui/AsyncState'
import { usersApi, tenantsApi } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { USER_STATUS, ACCOUNT_TYPE, JOB_CLASSIFICATION } from '../../data/enums'

// Super Admin roster of every account on the platform — read-only apart from
// status management. Account CREATION lives with whoever owns that account's
// scope: firm owners are created on the Firms page as part of provisioning a
// firm, and firm staff are created by that firm's own owner from الموظفين.
// There is no account deletion anymore — usersApi.updateStatus is the only
// per-account admin action left (ACTIVE/INACTIVE).
export default function Users() {
  const { currentUser } = useAuth()
  const [query, setQuery] = useState('')
  const [firmFilter, setFirmFilter] = useState('ALL')

  const { data, loading, error, reload } = useFetch(() => usersApi.list(), [])
  const { data: firms } = useFetch(() => tenantsApi.list(), [])
  const [resendingId, setResendingId] = useState(null)

  const rows = useMemo(() => (Array.isArray(data) ? data : data?.items ?? []), [data])
  const firmRows = useMemo(() => (Array.isArray(firms) ? firms : firms?.items ?? []), [firms])

  const filtered = rows.filter((u) => {
    const name = u.fullName ?? ''
    const matchesQuery = !query || name.includes(query) || (u.email ?? '').toLowerCase().includes(query.toLowerCase())
    const matchesFirm =
      firmFilter === 'ALL' || (firmFilter === 'NONE' ? !u.tenant : u.tenant?.id === firmFilter)
    return matchesQuery && matchesFirm
  })

  async function handleToggleStatus(user) {
    const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const question =
      nextStatus === 'INACTIVE'
        ? `هل أنت متأكد من إيقاف حساب ${user.email}؟`
        : `هل أنت متأكد من تفعيل حساب ${user.email}؟`
    if (!confirm(question)) return
    try {
      await usersApi.updateStatus(user.id, nextStatus)
      reload()
    } catch (err) {
      alert(err.message ?? 'تعذر تحديث حالة الحساب')
    }
  }

  // An INVITED account has no usable password yet — it's still waiting on
  // the owner to open their activation email and set one. There's no
  // "activate" action for that state; resending the invitation is the only
  // thing an admin can actually do for it.
  async function handleResendActivation(user) {
    setResendingId(user.id)
    try {
      await usersApi.resendActivation(user.id)
      alert(`تم إرسال رابط تفعيل جديد إلى ${user.email}`)
    } catch (err) {
      alert(err.message ?? 'تعذر إرسال رابط التفعيل')
    } finally {
      setResendingId(null)
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'الاسم',
      sortable: false,
      render: (r) => {
        const name = r.fullName ?? ''
        return (
          <span className="flex items-center gap-2">
            <Avatar name={name || r.email} size="sm" />
            {name || '—'}
          </span>
        )
      },
    },
    {
      key: 'email',
      header: 'البريد الإلكتروني',
      sortable: false,
      render: (r) => (
        <span className="font-mono text-xs" dir="ltr">
          {r.email}
        </span>
      ),
    },
    {
      key: 'tenant',
      header: 'المكتب',
      sortable: false,
      render: (r) => (r.tenant?.name ? r.tenant.name : <span className="text-ink-300">بلا مكتب</span>),
    },
    {
      key: 'accountType',
      header: 'نوع الحساب',
      sortable: false,
      render: (r) => (
        <span className="inline-flex flex-col gap-0.5">
          <span className="text-[10px] bg-paper-soft text-ink-600 px-2 py-0.5 rounded-full w-fit">
            {ACCOUNT_TYPE[r.accountType] ?? r.accountType}
          </span>
          {r.accountType === 'EMPLOYEE' && r.jobClassification && (
            <span className="text-[10px] text-ink-400">{JOB_CLASSIFICATION[r.jobClassification] ?? r.jobClassification}</span>
          )}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      sortable: false,
      render: (r) => <EnumBadge code={r.status} map={USER_STATUS} />,
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      // Deactivating your own account locks you out of the platform, so it's blocked.
      render: (r) =>
        r.id === currentUser?.id ? (
          <span className="text-[10px] text-ink-300">حسابك</span>
        ) : r.status === 'INVITED' ? (
          <button
            onClick={() => handleResendActivation(r)}
            disabled={resendingId === r.id}
            title="إعادة إرسال رابط التفعيل"
            className="text-ink-300 hover:text-brass-700 p-1 rounded-lg hover:bg-brass-100 disabled:opacity-50"
          >
            <Mail size={14} />
          </button>
        ) : r.status === 'ACTIVE' ? (
          <button
            onClick={() => handleToggleStatus(r)}
            title="إيقاف الحساب"
            className="text-ink-300 hover:text-rust-600 p-1 rounded-lg hover:bg-rust-100"
          >
            <Ban size={14} />
          </button>
        ) : (
          <button
            onClick={() => handleToggleStatus(r)}
            title="تفعيل الحساب"
            className="text-ink-300 hover:text-emerald-600 p-1 rounded-lg hover:bg-emerald-100"
          >
            <CheckCircle2 size={14} />
          </button>
        ),
    },
  ]

  return (
    <div>
      <PageHeader title="حسابات المنصة" breadcrumb={[{ label: 'إدارة المنصة' }]} />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchInput
          placeholder="بحث بالاسم أو البريد..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={firmFilter}
          onChange={(e) => setFirmFilter(e.target.value)}
          className="rounded-lg border border-paper-line bg-white px-3 py-2 text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-brass-500/30 focus:border-brass-500"
        >
          <option value="ALL">كل المكاتب</option>
          <option value="NONE">بلا مكتب</option>
          {firmRows.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-ink-400 mr-auto">{filtered.length} حساب</span>
      </div>

      {loading && <LoadingBlock label="جاري تحميل الحسابات..." />}
      {error && <ErrorBlock error={error} onRetry={reload} />}
      {!loading && !error && (filtered.length ? (
        <DataTable columns={columns} data={filtered} />
      ) : (
        <EmptyState icon={UsersIcon} message="لا توجد حسابات مطابقة" />
      ))}
    </div>
  )
}
