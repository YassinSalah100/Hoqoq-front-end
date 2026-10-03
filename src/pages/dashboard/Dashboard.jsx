import { Link } from 'react-router-dom'
import { FileText, Receipt } from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import StatCard from '../../components/ui/StatCard'
import EnumBadge from '../../components/ui/EnumBadge'
import PageHeader from '../../components/ui/PageHeader'
import { LoadingBlock, ErrorBlock } from '../../components/ui/AsyncState'
import EmptyState from '../../components/ui/EmptyState'
import { HEARING_STATUS } from '../../data/enums'
import { dashboardApi, hearingsApi, financeApi } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { hasPermission } from '../../data/auth'

const DONUT_COLORS = ['#B98B33', '#5E4D34']

export default function Dashboard() {
  const { currentUser } = useAuth()
  const { data, loading, error, reload } = useFetch(() => dashboardApi.summary(), [])
  const canViewHearings = hasPermission(currentUser, 'hearing.view')
  const { data: hearings } = useFetch(() => (canViewHearings ? hearingsApi.list() : Promise.resolve([])), [canViewHearings])
  // The firm-wide collected/outstanding split comes from /finance/summary,
  // which needs finance.firm.view (Firm Admin always has it).
  const canViewFinance = hasPermission(currentUser, 'finance.firm.view')
  const { data: finance } = useFetch(() => (canViewFinance ? financeApi.summary() : Promise.resolve(null)), [canViewFinance])

  if (loading) return <LoadingBlock label="جاري تحميل لوحة التحكم..." />
  if (error) return <ErrorBlock error={error} onRetry={reload} />

  const summary = data ?? {}
  const kpis = [
    { label: 'إجمالي القضايا', value: summary.totalCases ?? 0, icon: 'Briefcase', accent: 'ink' },
    { label: 'القضايا النشطة', value: summary.activeCases ?? 0, icon: 'Briefcase', accent: 'gold' },
    { label: 'مهام قيد الانتظار', value: summary.pendingTasks ?? 0, icon: 'AlertCircle', accent: 'gold' },
    { label: 'الجلسات القادمة', value: summary.upcomingHearings ?? 0, icon: 'Calendar', accent: 'ink' },
  ]

  const totalCaseValue = finance?.totalCaseValue ?? 0
  const financeBreakdown = [
    { name: 'محصّلة', value: finance?.totalCollected ?? 0 },
    { name: 'مستحقة', value: finance?.totalOutstanding ?? 0 },
  ]

  const upcomingHearings = (hearings ?? [])
    .filter((h) => h.status === 'SCHEDULED')
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    .slice(0, 5)

  const activity = summary.recentActivity ?? []

  return (
    <div>
      <PageHeader title="لوحة التحكم" />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => (
          <StatCard key={kpi.label} label={kpi.label} value={kpi.value} icon={kpi.icon} accent={kpi.accent} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-6 shadow-card border border-paper-line">
          <h3 className="text-lg font-semibold text-ink-800 mb-4">الوضع المالي</h3>
          {canViewFinance && totalCaseValue > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie data={financeBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {financeBreakdown.map((entry, i) => (
                      <Cell key={entry.name} fill={DONUT_COLORS[i]} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E3DDCC', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="flex-1 space-y-2 text-sm">
                {financeBreakdown.map((entry, i) => (
                  <li key={entry.name} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-ink-600">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: DONUT_COLORS[i] }} />
                      {entry.name}
                    </span>
                    <span className="font-mono text-ink-800">{entry.value.toLocaleString('ar')}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between gap-2 pt-2 border-t border-paper-line">
                  <span className="flex items-center gap-2 text-ink-600">
                    <Receipt size={13} />
                    إجمالي أتعاب القضايا
                  </span>
                  <span className="font-mono text-ink-800">{totalCaseValue.toLocaleString('ar')}</span>
                </li>
              </ul>
            </div>
          ) : (
            <EmptyState icon={FileText} message={canViewFinance ? 'لا توجد بيانات مالية بعد' : 'لا تملك صلاحية عرض البيانات المالية'} />
          )}
        </div>

        <div className="bg-white rounded-xl shadow-card border border-paper-line overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-paper-line">
            <h3 className="text-lg font-semibold text-ink-800">الجلسات القادمة</h3>
            <Link to="/hearings" className="text-sm text-brass-600 hover:underline">
              عرض الكل
            </Link>
          </div>
          {upcomingHearings.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink-400 text-right">
                  <th className="px-6 py-2 font-medium">التاريخ</th>
                  <th className="px-2 py-2 font-medium">القضية</th>
                  <th className="px-2 py-2 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {upcomingHearings.map((h) => (
                  <tr key={h.id} className="border-t border-paper-line">
                    <td className="px-6 py-2.5 font-mono text-ink-700 text-xs">{new Date(h.scheduledAt).toLocaleString('ar')}</td>
                    <td className="px-2 py-2.5 text-ink-700 font-mono text-xs">{h.case?.caseNumber ?? h.caseId}</td>
                    <td className="px-2 py-2.5">
                      <EnumBadge code={h.status} map={HEARING_STATUS} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState message="لا توجد جلسات قادمة" />
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-paper-line overflow-hidden">
        <div className="px-6 py-4 border-b border-paper-line">
          <h3 className="text-lg font-semibold text-ink-800">النشاط الأخير</h3>
        </div>
        {activity.length ? (
          <ul className="divide-y divide-paper-line">
            {activity.map((item) => (
              <li key={item.id} className="flex items-start gap-3 px-6 py-3">
                <div className="p-2 rounded-lg bg-paper-soft text-ink-500 shrink-0">
                  <FileText size={13} />
                </div>
                <div>
                  <p className="text-sm text-ink-700">{item.description}</p>
                  <p className="text-xs text-ink-300 mt-0.5">{new Date(item.date).toLocaleString('ar')}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="لا يوجد نشاط حديث" />
        )}
      </div>
    </div>
  )
}
