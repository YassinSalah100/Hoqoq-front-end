import { useParams, useNavigate } from 'react-router-dom'
import { Phone, Mail, Building2, User } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Avatar from '../../components/ui/Avatar'
import EnumBadge from '../../components/ui/EnumBadge'
import EmptyState from '../../components/ui/EmptyState'
import { LoadingBlock, ErrorBlock } from '../../components/ui/AsyncState'
import { CASE_STATUS, PARTY_TYPE } from '../../data/enums'
import { casesApi } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'

// There's no separate client ID space anymore — a client is an immutable
// snapshot embedded 1:1 on a case (see Clients.jsx). The `:id` route param
// here is really a case id; this page fetches that case and reads its
// `clientSnapshot`.
export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: caseItem, loading, error, reload } = useFetch(() => casesApi.get(id), [id])

  if (loading) return <LoadingBlock label="جاري تحميل بيانات الموكل..." />
  if (error) return <ErrorBlock error={error} onRetry={reload} />
  if (!caseItem || !caseItem.clientSnapshot) return <EmptyState message="لم يتم العثور على بيانات الموكل" />

  const client = caseItem.clientSnapshot
  const isCompany = client.clientType === 'COMPANY'

  return (
    <div>
      <PageHeader title={client.name} breadcrumb={[{ label: 'الموكلين', to: '/clients' }, { label: client.name }]} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-card border border-paper-line">
          <div className="flex items-center gap-3 mb-4">
            <Avatar name={client.name} size="lg" />
            <div>
              <p className="font-semibold text-ink-800">{client.name}</p>
              <span className="inline-flex items-center gap-1 text-xs text-ink-400">
                {isCompany ? <Building2 size={11} /> : <User size={11} />}
                {PARTY_TYPE[client.clientType] ?? client.clientType}
              </span>
            </div>
          </div>
          <div className="space-y-2 text-sm text-ink-600">
            <p className="flex items-center gap-2 font-mono text-xs">
              <Phone size={12} /> {client.phone ?? '—'}
            </p>
            <p className="flex items-center gap-2">
              <Mail size={12} /> {client.email ?? '—'}
            </p>
            {client.address && <p className="text-xs text-ink-400">{client.address}</p>}
            {client.nationalId && <p className="text-xs text-ink-400 font-mono">الهوية / السجل: {client.nationalId}</p>}
            {client.registrationNo && <p className="text-xs text-ink-400 font-mono">رقم السجل: {client.registrationNo}</p>}
            {client.notes && <p className="text-xs text-ink-400 mt-2">{client.notes}</p>}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-card border border-paper-line overflow-hidden">
          <div className="px-6 py-4 border-b border-paper-line">
            <h3 className="text-lg font-semibold text-ink-800">القضية</h3>
          </div>
          <div
            onClick={() => navigate(`/cases/${caseItem.id}`)}
            className="px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-paper-soft transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm text-ink-800 truncate">{caseItem.caseType?.nameAr ?? caseItem.title ?? caseItem.caseNumber}</p>
              <p className="font-mono text-xs text-ink-400">{caseItem.caseNumber}</p>
            </div>
            <EnumBadge code={caseItem.status} map={CASE_STATUS} />
          </div>
        </div>
      </div>
    </div>
  )
}
