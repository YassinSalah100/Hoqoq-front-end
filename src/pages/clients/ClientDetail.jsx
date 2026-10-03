import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Phone, Mail, Building2, User, Landmark, Star } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Avatar from '../../components/ui/Avatar'
import EnumBadge from '../../components/ui/EnumBadge'
import EmptyState from '../../components/ui/EmptyState'
import { LoadingBlock, ErrorBlock } from '../../components/ui/AsyncState'
import { CASE_STATUS, PARTY_TYPE, primaryClientOf } from '../../data/enums'
import { casesApi } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'

const PARTY_ICON = { INDIVIDUAL: User, COMPANY: Building2, GOVERNMENT_ENTITY: Landmark }

function Field({ label, value, mono }) {
  if (!value) return null
  return (
    <p className="text-xs text-ink-400">
      {label}: <span className={`text-ink-600 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </p>
  )
}

// Clients are case-local (PRD §6.1): the `:id` route param is the case id,
// and `?client=` picks which of that case's clients to show (defaults to
// the primary one).
export default function ClientDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { data: caseItem, loading, error, reload } = useFetch(() => casesApi.get(id), [id])

  if (loading) return <LoadingBlock label="جاري تحميل بيانات الموكل..." />
  if (error) return <ErrorBlock error={error} onRetry={reload} />

  const clientId = searchParams.get('client')
  const client = (caseItem?.clients ?? []).find((c) => c.id === clientId) ?? primaryClientOf(caseItem)
  if (!client) return <EmptyState message="لم يتم العثور على بيانات الموكل" />

  const Icon = PARTY_ICON[client.clientType] ?? User
  const isIndividual = client.clientType === 'INDIVIDUAL'

  return (
    <div>
      <PageHeader title={client.name} breadcrumb={[{ label: 'الموكلين', to: '/clients' }, { label: client.name }]} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-card border border-paper-line">
          <div className="flex items-center gap-3 mb-4">
            <Avatar name={client.name} size="lg" />
            <div>
              <p className="font-semibold text-ink-800 flex items-center gap-1.5">
                {client.name}
                {client.isPrimary && <Star size={12} className="text-brass-500" aria-label="الموكل الرئيسي" />}
              </p>
              <span className="inline-flex items-center gap-1 text-xs text-ink-400">
                <Icon size={11} />
                {PARTY_TYPE[client.clientType] ?? client.clientType}
              </span>
            </div>
          </div>
          <div className="space-y-2 text-sm text-ink-600">
            <p className="flex items-center gap-2 font-mono text-xs">
              <Phone size={12} /> <span dir="ltr">{client.phone ?? '—'}</span>
            </p>
            <p className="flex items-center gap-2">
              <Mail size={12} /> {client.email ?? '—'}
            </p>
            {client.address && <p className="text-xs text-ink-400">{client.address}</p>}
            {isIndividual ? (
              <>
                <Field label="الرقم القومي" value={client.nationalId} mono />
                <Field label="الجنسية" value={client.nationality} />
                <Field label="رقم جواز السفر" value={client.passportNumber} mono />
              </>
            ) : (
              <>
                <Field label="الاسم القانوني" value={client.legalName} />
                <Field label="الاسم التجاري" value={client.tradeName} />
                <Field label="رقم السجل التجاري" value={client.registrationNo} mono />
                <Field label="الرقم الضريبي" value={client.taxNumber} mono />
                <Field label="الممثل القانوني" value={client.authorizedRepresentativeName} />
                <Field label="هاتف الممثل" value={client.representativePhone} mono />
              </>
            )}
            {client.notes && <p className="text-xs text-ink-400 mt-2">{client.notes}</p>}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-card border border-paper-line overflow-hidden self-start">
          <div className="px-6 py-4 border-b border-paper-line">
            <h3 className="text-lg font-semibold text-ink-800">القضية</h3>
          </div>
          <div
            onClick={() => navigate(`/cases/${caseItem.id}`)}
            className="px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-paper-soft transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm text-ink-800 truncate">{caseItem.title ?? caseItem.caseType?.nameAr ?? caseItem.caseNumber}</p>
              <p className="font-mono text-xs text-ink-400">{caseItem.caseNumber}</p>
            </div>
            <EnumBadge code={caseItem.status} map={CASE_STATUS} />
          </div>
        </div>
      </div>
    </div>
  )
}
