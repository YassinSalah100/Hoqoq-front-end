import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Mail, Building2, User } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import SearchInput from '../../components/ui/SearchInput'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import EmptyState from '../../components/ui/EmptyState'
import { LoadingBlock, ErrorBlock } from '../../components/ui/AsyncState'
import { PARTY_TYPE, CASE_STATUS } from '../../data/enums'
import { casesApi } from '../../lib/api'
import EnumBadge from '../../components/ui/EnumBadge'

// There is no standalone Clients resource anymore — a client is an
// immutable snapshot (clientSnapshot) embedded 1:1 on a case, entered only
// at case-creation time. GET /cases now joins clientSnapshot directly (fixed
// backend-side — it didn't used to), so this is a single request; each row
// still maps to exactly one case, not a deduplicated client identity — the
// backend has no concept of the same real-world person spanning multiple
// cases.
export default function Clients() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    casesApi
      .list()
      .then((cases) => {
        if (cancelled) return
        const list = Array.isArray(cases) ? cases : cases?.items ?? []
        setRows(
          list
            .filter((c) => c.clientSnapshot)
            .map((c) => ({ caseId: c.id, caseNumber: c.caseNumber, status: c.status, client: c.clientSnapshot }))
        )
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => load(), [load])

  const filtered = useMemo(() => rows.filter((r) => !query || (r.client.name ?? '').includes(query)), [rows, query])

  return (
    <div>
      <PageHeader title="الموكلين" />

      <SearchInput
        placeholder="بحث عن موكل..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-xs mb-6"
      />

      {loading && <LoadingBlock label="جاري تحميل الموكلين..." />}
      {error && <ErrorBlock error={error} onRetry={load} />}

      {!loading && !error && (filtered.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((row) => {
            const client = row.client
            return (
              <div key={row.caseId} className="bg-white rounded-xl p-5 shadow-card border border-paper-line flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar name={client.name} size="lg" />
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-800 truncate">{client.name}</p>
                    <span className="inline-flex items-center gap-1 text-xs text-ink-400 mt-0.5">
                      {client.clientType === 'COMPANY' ? <Building2 size={11} /> : <User size={11} />}
                      {PARTY_TYPE[client.clientType] ?? client.clientType}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm text-ink-500 mb-4">
                  <p className="flex items-center gap-2 font-mono text-xs">
                    <Phone size={12} /> {client.phone ?? '—'}
                  </p>
                  <p className="flex items-center gap-2 truncate">
                    <Mail size={12} /> {client.email ?? '—'}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-paper-line pt-3 mt-auto text-sm">
                  <span className="font-mono text-xs text-ink-400">{row.caseNumber}</span>
                  <EnumBadge code={row.status} map={CASE_STATUS} />
                </div>

                <Button
                  variant="secondary"
                  className="w-full justify-center mt-3"
                  onClick={() => navigate(`/clients/${row.caseId}`)}
                >
                  عرض التفاصيل
                </Button>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState message="لا يوجد موكلين حتى الآن — يُضاف الموكل تلقائياً عند إنشاء قضية جديدة" />
      ))}
    </div>
  )
}
