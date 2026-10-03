import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Mail, Building2, User, Landmark, Star } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import SearchInput from '../../components/ui/SearchInput'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import EmptyState from '../../components/ui/EmptyState'
import EnumBadge from '../../components/ui/EnumBadge'
import { LoadingBlock, ErrorBlock } from '../../components/ui/AsyncState'
import { PARTY_TYPE, CASE_STATUS } from '../../data/enums'
import { casesApi } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'

const PARTY_ICON ={ INDIVIDUAL: User, COMPANY: Building2, GOVERNMENT_ENTITY: Landmark }

// Clients are case-local records (PRD §6.1, BR-013): there is no firm-wide
// client registry, and the same real-world person may appear on several
// cases as separate rows. This page lists every client row from every case
// the user can see (GET /cases joins `clients` only for accounts allowed to
// view them) — one card per case-client.
export default function Clients() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const { data: cases, loading, error, reload } = useFetch(() => casesApi.list(), [])

  const rows = useMemo(() => {
    const list = Array.isArray(cases) ? cases : cases?.items ?? []
    return list.flatMap((c) =>
      (c.clients ?? []).map((client) => ({ caseId: c.id, caseNumber: c.caseNumber, caseTitle: c.title, status: c.status, client }))
    )
  }, [cases])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        (r.client.name ?? '').toLowerCase().includes(q) ||
        (r.client.phone ?? '').includes(q) ||
        (r.client.nationalId ?? '').includes(q) ||
        (r.caseNumber ?? '').toLowerCase().includes(q)
    )
  }, [rows, query])

  return (
    <div>
      <PageHeader title="الموكلين" />

      <SearchInput
        placeholder="بحث بالاسم أو الهاتف أو الرقم القومي أو رقم القضية..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm mb-6"
      />

      {loading && <LoadingBlock label="جاري تحميل الموكلين..." />}
      {error && <ErrorBlock error={error} onRetry={reload} />}

      {!loading && !error && (filtered.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((row) => {
            const { client } = row
            const Icon = PARTY_ICON[client.clientType] ?? User
            return (
              <div key={client.id} className="bg-white rounded-xl p-5 shadow-card border border-paper-line flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar name={client.name} size="lg" />
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-800 truncate flex items-center gap-1.5">
                      {client.name}
                      {client.isPrimary && <Star size={12} className="text-brass-500 shrink-0" aria-label="الموكل الرئيسي" />}
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs text-ink-400 mt-0.5">
                      <Icon size={11} />
                      {PARTY_TYPE[client.clientType] ?? client.clientType}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm text-ink-500 mb-4">
                  <p className="flex items-center gap-2 font-mono text-xs" dir="ltr" style={{ justifyContent: 'flex-end' }}>
                    {client.phone ?? '—'} <Phone size={12} />
                  </p>
                  <p className="flex items-center gap-2 truncate">
                    <Mail size={12} /> {client.email ?? '—'}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-paper-line pt-3 mt-auto text-sm gap-2">
                  <span className="min-w-0">
                    <span className="block font-mono text-xs text-ink-400">{row.caseNumber}</span>
                    {row.caseTitle && <span className="block text-xs text-ink-500 truncate">{row.caseTitle}</span>}
                  </span>
                  <EnumBadge code={row.status} map={CASE_STATUS} />
                </div>

                <Button
                  variant="secondary"
                  className="w-full justify-center mt-3"
                  onClick={() => navigate(`/clients/${row.caseId}?client=${client.id}`)}
                >
                  عرض التفاصيل
                </Button>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState message={query ? 'لا توجد نتائج مطابقة للبحث' : 'لا يوجد موكلين حتى الآن — يُضاف الموكل ضمن بيانات القضية'} />
      ))}
    </div>
  )
}
