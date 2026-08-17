import { useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie } from 'recharts'
import PageHeader from '../../components/ui/PageHeader'
import Tabs from '../../components/ui/Tabs'
import DataTable from '../../components/ui/DataTable'
import EnumBadge from '../../components/ui/EnumBadge'
import EmptyState from '../../components/ui/EmptyState'
import { LoadingBlock, ErrorBlock } from '../../components/ui/AsyncState'
import { CASE_STATUS, EMPLOYEE_POSITION, CASE_FINANCE_STATUS } from '../../data/enums'
import { casesApi, financeApi, employeesApi } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { hasPermission } from '../../data/auth'

const TABS = [
  { value: 'cases', label: 'القضايا' },
  { value: 'finance', label: 'المالية' },
  { value: 'employees', label: 'الموظفين' },
]

// Matches CASE_FINANCE_STATUS semantics (paid=emerald, partial=brass, unpaid=rust).
const STATUS_COLORS = { PAID: '#0B6E4F', PARTIAL: '#B98B34', UNPAID: '#8C2F39' }

function sar(n) {
  return `${Number(n ?? 0).toLocaleString('ar')} ر.س`
}

function CasesTab() {
  const { data, loading, error, reload } = useFetch(() => casesApi.list(), [])
  const rows = data ?? []
  if (loading) return <LoadingBlock label="جاري تحميل القضايا..." />
  if (error) return <ErrorBlock error={error} onRetry={reload} />
  return (
    <DataTable
      columns={[
        { key: 'caseNumber', header: 'رقم القضية', render: (r) => <span className="font-mono text-xs">{r.caseNumber}</span> },
        { key: 'client', header: 'الموكل', sortable: false, render: (r) => r.client?.fullName ?? '—' },
        { key: 'type', header: 'النوع', sortable: false, render: (r) => r.caseType?.labelAr ?? '—' },
        { key: 'status', header: 'الحالة', sortable: false, render: (r) => <EnumBadge code={r.status} map={CASE_STATUS} /> },
      ]}
      data={rows}
    />
  )
}

// Finance is now the Case's agreed fee plus a payment ledger against that one
// Case (see finance.service.ts) — there is no standalone Invoice model with
// due dates to age, so this tab aggregates GET /finance/summary instead:
// firm-wide totals plus a paid/partial/unpaid case-count breakdown and the
// Cases carrying the most outstanding balance.
function FinanceTab() {
  const { currentUser } = useAuth()
  const canView = hasPermission(currentUser, 'finance.firm.read')
  const { data, loading, error, reload } = useFetch(() => (canView ? financeApi.summary() : Promise.resolve(null)), [canView])

  const cases = useMemo(() => (data?.cases ?? []).filter((c) => Number(c.agreedFee) > 0), [data])

  const statusBreakdown = useMemo(
    () => [
      { key: 'PAID', name: CASE_FINANCE_STATUS.PAID.label, value: data?.paidCases ?? 0 },
      { key: 'PARTIAL', name: CASE_FINANCE_STATUS.PARTIAL.label, value: data?.partialCases ?? 0 },
      { key: 'UNPAID', name: CASE_FINANCE_STATUS.UNPAID.label, value: data?.unpaidCases ?? 0 },
    ],
    [data]
  )

  const topOutstanding = useMemo(() => [...cases].sort((a, b) => b.remaining - a.remaining).slice(0, 5), [cases])

  if (!canView) return <EmptyState message="لا تملك صلاحية عرض البيانات المالية" />
  if (loading) return <LoadingBlock label="جاري تحميل البيانات المالية..." />
  if (error) return <ErrorBlock error={error} onRetry={reload} />
  if (!cases.length) return <EmptyState message="لا توجد بيانات مالية بعد" />

  const hasStatusData = statusBreakdown.some((s) => s.value > 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          ['إجمالي قيمة القضايا', data.totalCaseValue],
          ['إجمالي المحصّل', data.totalCollected],
          ['إجمالي المستحق', data.totalOutstanding],
        ].map(([label, value]) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-card border border-paper-line">
            <p className="text-xs text-ink-400 mb-1">{label}</p>
            <p className="font-mono text-lg font-semibold text-ink-800">{sar(value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-card border border-paper-line">
          <h3 className="text-lg font-semibold text-ink-800 mb-4">توزيع حالة سداد القضايا</h3>
          {hasStatusData ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {statusBreakdown.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E2D9', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="flex-1 space-y-2 text-sm">
                {statusBreakdown.map((entry) => (
                  <li key={entry.key} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-ink-600">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[entry.key] }} />
                      {entry.name}
                    </span>
                    <span className="font-mono text-ink-800">{entry.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState message="لا توجد بيانات كافية" />
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-card border border-paper-line">
          <h3 className="text-lg font-semibold text-ink-800 mb-4">أعلى القضايا مبالغ مستحقة</h3>
          {topOutstanding.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topOutstanding} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E2D9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#8B9EB7' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="caseNumber" width={100} tick={{ fontSize: 11, fill: '#374F73' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => sar(v)} contentStyle={{ borderRadius: 8, border: '1px solid #E5E2D9', fontSize: 11 }} />
                <Bar dataKey="remaining" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {topOutstanding.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#10233F' : '#B98B34'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="لا توجد بيانات كافية" />
          )}
        </div>
      </div>
    </div>
  )
}

function EmployeesTab() {
  const { data, loading, error, reload } = useFetch(() => employeesApi.list(), [])
  const rows = data ?? []
  if (loading) return <LoadingBlock label="جاري تحميل الموظفين..." />
  if (error) return <ErrorBlock error={error} onRetry={reload} />
  return (
    <DataTable
      columns={[
        { key: 'name', header: 'الاسم', sortable: false, render: (r) => r.user?.fullName ?? '' },
        { key: 'position', header: 'الوظيفة', sortable: false, render: (r) => EMPLOYEE_POSITION[r.position] ?? r.position },
      ]}
      data={rows}
    />
  )
}

export default function FinanceReports() {
  const [tab, setTab] = useState('finance')

  return (
    <div>
      <PageHeader title="التقارير" />

      <div className="mb-6">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {tab === 'cases' && <CasesTab />}
      {tab === 'finance' && <FinanceTab />}
      {tab === 'employees' && <EmployeesTab />}
    </div>
  )
}
