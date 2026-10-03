import { useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie } from 'recharts'
import { ChevronLeft } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Tabs from '../../components/ui/Tabs'
import DataTable from '../../components/ui/DataTable'
import EnumBadge from '../../components/ui/EnumBadge'
import EmptyState from '../../components/ui/EmptyState'
import { LoadingBlock, ErrorBlock } from '../../components/ui/AsyncState'
import { CASE_STATUS, EMPLOYEE_POSITION, CASE_FINANCE_STATUS, primaryClientOf } from '../../data/enums'
import { casesApi, financeApi, employeesApi } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { hasPermission, isFirmAdmin } from '../../data/auth'

// The finance dashboard is open to finance.firm.view; the case/employee
// reports are Firm-Admin-only in v1 (PRD BR-039).
const TABS = [
  { value: 'finance', label: 'المالية' },
  { value: 'clients', label: 'حسب الموكل' },
  { value: 'cases', label: 'القضايا', firmAdminOnly: true },
  { value: 'employees', label: 'الموظفين', firmAdminOnly: true },
]

// Matches CASE_FINANCE_STATUS semantics (paid=emerald, partial=brass, unpaid=rust).
const STATUS_COLORS = { PAID: '#727F30', PARTIAL: '#B98B33', UNPAID: '#8C2F39' }

function sar(n) {
  return `${Number(n ?? 0).toLocaleString('ar')} ج.م`
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
        { key: 'client', header: 'الموكل', sortable: false, render: (r) => primaryClientOf(r)?.name ?? '—' },
        { key: 'type', header: 'النوع', sortable: false, render: (r) => r.caseType?.nameAr ?? '—' },
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
  const canView = hasPermission(currentUser, 'finance.firm.view')
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
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E3DDCC', fontSize: 11 }} />
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
                <CartesianGrid strokeDasharray="3 3" stroke="#E3DDCC" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#A3947C' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="caseNumber" width={100} tick={{ fontSize: 11, fill: '#5E4D34' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => sar(v)} contentStyle={{ borderRadius: 8, border: '1px solid #E3DDCC', fontSize: 11 }} />
                <Bar dataKey="remaining" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {topOutstanding.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#2B2010' : '#B98B33'} />
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

// Everything about each client in one place: every case he's on, what each
// case costs, what's been paid and what's still owed. Rows are grouped by
// identity (national ID / passport / name + phone) and sorted by balance due.
function ClientsFinanceTab() {
  const { data, loading, error, reload } = useFetch(() => financeApi.clients(), [])
  const [open, setOpen] = useState(null)
  const rows = data ?? []
  if (loading) return <LoadingBlock label="جاري تحميل بيانات الموكلين..." />
  if (error) return <ErrorBlock error={error} onRetry={reload} />
  if (!rows.length) return <EmptyState message="لا يوجد موكلون في القضايا بعد" />
  const totals = rows.reduce((t, r) => ({ fee: t.fee + r.totalAgreedFee, paid: t.paid + r.totalPaid, due: t.due + r.totalRemaining }), { fee: 0, paid: 0, due: 0 })
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-paper-line p-4"><p className="text-xs text-ink-400">إجمالي الأتعاب</p><p className="text-lg font-semibold text-ink-800">{sar(totals.fee)}</p></div>
        <div className="bg-white rounded-xl border border-paper-line p-4"><p className="text-xs text-ink-400">إجمالي المحصّل</p><p className="text-lg font-semibold text-emerald-700">{sar(totals.paid)}</p></div>
        <div className="bg-white rounded-xl border border-paper-line p-4"><p className="text-xs text-ink-400">المستحق</p><p className="text-lg font-semibold text-rust-600">{sar(totals.due)}</p></div>
      </div>
      <div className="bg-white rounded-xl border border-paper-line shadow-card overflow-hidden divide-y divide-paper-line">
        {rows.map((r) => {
          const isOpen = open === r.key
          return (
            <div key={r.key}>
              <button type="button" onClick={() => setOpen(isOpen ? null : r.key)} className="w-full text-right grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_28px] items-center gap-3 px-5 py-3.5 hover:bg-paper-soft">
                <span className="min-w-0">
                  <span className="block font-semibold text-ink-800 truncate">{r.name}</span>
                  <span className="block text-[11px] text-ink-400 font-mono truncate" dir="ltr" style={{ textAlign: "right" }}>
                    {r.nationalId || r.passportNumber || r.phone || "—"} · {r.cases.length} قضية
                  </span>
                </span>
                <span className="text-sm text-ink-700">{sar(r.totalAgreedFee)}</span>
                <span className="text-sm text-emerald-700">{sar(r.totalPaid)}</span>
                <span className="text-sm font-semibold text-rust-600">{sar(r.totalRemaining)}</span>
                <ChevronLeft size={16} className={"text-ink-300 transition-transform " + (isOpen ? "-rotate-90" : "")} />
              </button>
              {isOpen && (
                <div className="bg-paper-soft/50 px-5 py-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-ink-500">
                    <span>الهاتف: <span dir="ltr">{r.phone || "—"}</span></span>
                    <span>البريد: <span dir="ltr">{r.email || "—"}</span></span>
                  </div>
                  <table className="w-full text-sm bg-white rounded-lg border border-paper-line overflow-hidden">
                    <thead>
                      <tr className="bg-paper text-[12px] text-ink-400 text-right">
                        <th className="font-medium px-3 py-2">القضية</th>
                        <th className="font-medium px-3 py-2">الحالة</th>
                        <th className="font-medium px-3 py-2">الأتعاب</th>
                        <th className="font-medium px-3 py-2">المدفوع</th>
                        <th className="font-medium px-3 py-2">المتبقي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.cases.map((c) => (
                        <tr key={c.caseId} className="border-t border-paper-line">
                          <td className="px-3 py-2"><span className="font-mono text-xs text-ink-500">{c.caseNumber}</span> <span className="text-ink-700">{c.title}</span>{c.isPrimary && <span className="text-[10px] text-brass-700 mr-1">(رئيسي)</span>}</td>
                          <td className="px-3 py-2"><EnumBadge code={c.status} map={CASE_STATUS} /></td>
                          <td className="px-3 py-2">{sar(c.agreedFee)}</td>
                          <td className="px-3 py-2 text-emerald-700">{sar(c.paid)}</td>
                          <td className="px-3 py-2 text-rust-600">{sar(c.remaining)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
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
  const { currentUser } = useAuth()
  const [tab, setTab] = useState('finance')
  const tabs = TABS.filter((t) => !t.firmAdminOnly || isFirmAdmin(currentUser))

  return (
    <div>
      <PageHeader title="التقارير" />

      <div className="mb-6">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      {tab === 'cases' && <CasesTab />}
      {tab === 'finance' && <FinanceTab />}
      {tab === 'clients' && <ClientsFinanceTab />}
      {tab === 'employees' && <EmployeesTab />}
    </div>
  )
}
