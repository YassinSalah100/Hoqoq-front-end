import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Download, Briefcase, Landmark, User, X, UserPlus, FileText, UserX as UserXIcon, UserCog } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Tabs from '../../components/ui/Tabs'
import SearchInput from '../../components/ui/SearchInput'
import EnumBadge from '../../components/ui/EnumBadge'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
// A custom modal (not the generic FormModal) — the court picker cascades
// governorate → court → circuit and the opponents list is a staged array,
// neither of which a flat field-list form can express. See NewCaseModal.
import Modal from '../../components/ui/Modal'
import { LoadingBlock, ErrorBlock } from '../../components/ui/AsyncState'
import { CASE_STATUS, CASE_PRIORITY, PARTY_TYPE } from '../../data/enums'
import { casesApi, referenceApi, employeesApi, reportsApi, downloadAuthedFile } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { hasPermission } from '../../data/auth'

const STATUS_TABS = Object.keys(CASE_STATUS)
const inputClass =
  'w-full px-3 py-2 rounded-lg border border-paper-line bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brass-500/30 focus:border-brass-500'
const labelClass = 'block text-xs text-ink-400 mb-1'

function SectionHeader({ icon: Icon, title, aside }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-ink-800 text-white shrink-0">
          <Icon size={13} />
        </div>
        <p className="text-sm font-semibold text-ink-800">{title}</p>
      </div>
      {aside}
    </div>
  )
}

// A lawyer is any employee with at least one configured specialization —
// EmployeeResponseDto doesn't expose jobClassification at all, but the
// backend only ever lets a LAWYER account have specializations (enforced at
// onboarding: a Lawyer must have >=1, anyone else must have none), so this
// is a reliable stand-in. Matches the same rule the backend enforces when a
// primaryLawyerId is submitted (CasesService.validatePrimaryLawyer).
function isLawyer(employee) {
  return Boolean(employee?.specializations?.length)
}

// Case creation embeds the client (required) and opponents (optional) as
// immutable snapshots directly in CreateCaseDto — there is no separate
// client/opponent resource to create beforehand or pick from a list.
function NewCaseModal({ open, onClose, onCreated, caseTypes, employees }) {
  const [caseNumber, setCaseNumber] = useState('')
  const [title, setTitle] = useState('')
  const [courtCaseNumber, setCourtCaseNumber] = useState('')
  const [courtCaseYear, setCourtCaseYear] = useState('')
  const [caseTypeId, setCaseTypeId] = useState('')
  const [priority, setPriority] = useState('NORMAL')
  const [openingDate, setOpeningDate] = useState('')
  const [agreedFee, setAgreedFee] = useState('')
  const [description, setDescription] = useState('')

  // Court — cascading governorate → court → circuit from the live judicial
  // reference directory (referenceApi). All optional at creation time, but
  // governorateId/defaultCourtId are required before the case can later be
  // activated (CasesService.changeStatus).
  const [governorateId, setGovernorateId] = useState('')
  const [defaultCourtId, setDefaultCourtId] = useState('')
  const [circuitId, setCircuitId] = useState('')

  const [primaryLawyerId, setPrimaryLawyerId] = useState('')

  const [client, setClient] = useState({ clientType: 'INDIVIDUAL', name: '', nationalId: '', registrationNo: '', phone: '', email: '', address: '', notes: '' })

  const [opponents, setOpponents] = useState([]) // staged: { key, opponentType, name, contact, representative, notes }
  const [showOpponentForm, setShowOpponentForm] = useState(false)
  const [opponentDraft, setOpponentDraft] = useState({ opponentType: 'INDIVIDUAL', name: '', contact: '', representative: '', notes: '' })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const { data: governorates } = useFetch(() => referenceApi.governorates(), [])
  const { data: courts } = useFetch(
    () => (governorateId ? referenceApi.courtsByGovernorate(governorateId) : Promise.resolve([])),
    [governorateId]
  )
  const { data: circuits } = useFetch(
    () => (defaultCourtId ? referenceApi.circuitsByCourt(defaultCourtId) : Promise.resolve([])),
    [defaultCourtId]
  )

  // Only lawyers, filtered by the currently selected case type against each
  // employee's configured specializations — same rule the backend enforces
  // (CasesService.validatePrimaryLawyer) — so a mismatched specialization is
  // never even offered here, instead of being picked and then rejected on
  // submit. No case type chosen yet means no lawyer can legally be picked
  // either (the backend requires caseTypeId first).
  const selectableLawyers = useMemo(
    () => (employees ?? []).filter((e) => isLawyer(e) && (!caseTypeId || e.specializations.includes(caseTypeId))),
    [employees, caseTypeId]
  )

  // A picked lawyer was valid against whatever case type was selected at the
  // moment — prune it the instant that goes stale instead of only surfacing
  // a rejection at submit time.
  useEffect(() => {
    if (!primaryLawyerId) return
    if (!selectableLawyers.some((e) => e.user?.id === primaryLawyerId)) setPrimaryLawyerId('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseTypeId])

  function resetAndClose() {
    setCaseNumber(''); setTitle(''); setCourtCaseNumber(''); setCourtCaseYear(''); setCaseTypeId('')
    setPriority('NORMAL'); setOpeningDate(''); setAgreedFee(''); setDescription('')
    setGovernorateId(''); setDefaultCourtId(''); setCircuitId(''); setPrimaryLawyerId('')
    setClient({ clientType: 'INDIVIDUAL', name: '', nationalId: '', registrationNo: '', phone: '', email: '', address: '', notes: '' })
    setOpponents([]); setShowOpponentForm(false); setOpponentDraft({ opponentType: 'INDIVIDUAL', name: '', contact: '', representative: '', notes: '' })
    setError(null)
    onClose()
  }

  function addOpponentToStage() {
    if (!opponentDraft.name.trim()) return
    setOpponents((prev) => [...prev, { ...opponentDraft, key: `${Date.now()}-${Math.random()}` }])
    setOpponentDraft({ opponentType: 'INDIVIDUAL', name: '', contact: '', representative: '', notes: '' })
    setShowOpponentForm(false)
  }

  function removeStagedOpponent(key) {
    setOpponents((prev) => prev.filter((o) => o.key !== key))
  }

  // Filling the خصم sub-form and then hitting "إنشاء القضية" directly —
  // without first clicking "إضافة" — is the obvious thing to do; treat a
  // filled-in draft as intended input rather than silently dropping it.
  function pendingOpponentDraft() {
    return opponentDraft.name.trim() ? [opponentDraft] : []
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!client.name.trim()) { setError('اسم الموكل مطلوب'); return }
    setSaving(true)
    try {
      const allOpponents = [...opponents, ...pendingOpponentDraft()]
      const payload = {
        ...(caseNumber.trim() && { caseNumber: caseNumber.trim() }),
        ...(title.trim() && { title: title.trim() }),
        ...(courtCaseNumber.trim() && { courtCaseNumber: courtCaseNumber.trim() }),
        ...(courtCaseYear && { courtCaseYear: Number(courtCaseYear) }),
        ...(caseTypeId && { caseTypeId }),
        ...(primaryLawyerId && { primaryLawyerId }),
        ...(governorateId && { governorateId }),
        ...(defaultCourtId && { defaultCourtId }),
        ...(circuitId && { circuitId }),
        ...(openingDate && { openingDate }),
        ...(description.trim() && { description: description.trim() }),
        ...(agreedFee && { agreedFee: Number(agreedFee) }),
        priority,
        client: {
          clientType: client.clientType,
          name: client.name.trim(),
          ...(client.nationalId.trim() && { nationalId: client.nationalId.trim() }),
          ...(client.registrationNo.trim() && { registrationNo: client.registrationNo.trim() }),
          ...(client.phone.trim() && { phone: client.phone.trim() }),
          ...(client.email.trim() && { email: client.email.trim() }),
          ...(client.address.trim() && { address: client.address.trim() }),
          ...(client.notes.trim() && { notes: client.notes.trim() }),
        },
        ...(allOpponents.length && {
          opponents: allOpponents.map((o) => ({
            opponentType: o.opponentType,
            name: o.name.trim(),
            ...(o.contact?.trim() && { contact: o.contact.trim() }),
            ...(o.representative?.trim() && { representative: o.representative.trim() }),
            ...(o.notes?.trim() && { notes: o.notes.trim() }),
          })),
        }),
      }

      const created = await casesApi.create(payload)
      resetAndClose()
      onCreated(created)
    } catch (err) {
      setError(err.message ?? 'تعذر إنشاء القضية')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={resetAndClose} title="قضية جديدة" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Case info */}
        <div className="bg-paper-soft/60 rounded-xl border border-paper-line p-4">
          <SectionHeader icon={FileText} title="بيانات القضية" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>رقم القضية (اختياري — يُولَّد تلقائياً)</label>
              <input value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>عنوان القضية</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>نوع القضية</label>
              <select value={caseTypeId} onChange={(e) => setCaseTypeId(e.target.value)} className={inputClass}>
                <option value="">اختر...</option>
                {(caseTypes ?? []).map((t) => <option key={t.id} value={t.id}>{t.labelAr}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>الأولوية</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass}>
                {Object.entries(CASE_PRIORITY).map(([value, v]) => <option key={value} value={value}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>تاريخ الفتح</label>
              <input type="date" value={openingDate} onChange={(e) => setOpeningDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>الأتعاب المتفق عليها (ج.م)</label>
              <input type="number" min="0" step="0.01" value={agreedFee} onChange={(e) => setAgreedFee(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>رقم القضية لدى المحكمة</label>
              <input value={courtCaseNumber} onChange={(e) => setCourtCaseNumber(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>سنة القضية</label>
              <input type="number" min="1900" value={courtCaseYear} onChange={(e) => setCourtCaseYear(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="mt-3">
            <label className={labelClass}>وصف القضية (اختياري)</label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
          </div>
        </div>

        {/* Court — optional, picked from the live governorate → court →
            circuit directory. There is no manual/free-text court anymore
            (the old standalone Courts CRUD module was removed). */}
        <div className="bg-paper-soft/60 rounded-xl border border-paper-line p-4">
          <SectionHeader icon={Landmark} title="المحكمة (اختياري)" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={governorateId}
              onChange={(e) => { setGovernorateId(e.target.value); setDefaultCourtId(''); setCircuitId('') }}
              className={inputClass}
            >
              <option value="">اختر المحافظة...</option>
              {(governorates ?? []).map((g) => <option key={g.id} value={g.id}>{g.nameAr}</option>)}
            </select>
            <select
              value={defaultCourtId}
              onChange={(e) => { setDefaultCourtId(e.target.value); setCircuitId('') }}
              disabled={!governorateId}
              className={inputClass}
            >
              <option value="">{governorateId ? 'اختر المحكمة...' : 'اختر المحافظة أولاً'}</option>
              {(courts ?? []).map((c) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
            </select>
            <select value={circuitId} onChange={(e) => setCircuitId(e.target.value)} disabled={!defaultCourtId} className={inputClass}>
              <option value="">{defaultCourtId ? 'الدائرة (اختياري)' : 'اختر المحكمة أولاً'}</option>
              {(circuits ?? []).map((c) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
            </select>
          </div>
        </div>

        {/* Primary lawyer — a single assignment on the case itself, not a
            team; only offered once a case type is picked (required by the
            backend) and only among lawyers whose specialization matches. */}
        <div className="bg-paper-soft/60 rounded-xl border border-paper-line p-4">
          <SectionHeader icon={UserCog} title="المحامي المسؤول (اختياري)" />
          <select value={primaryLawyerId} onChange={(e) => setPrimaryLawyerId(e.target.value)} disabled={!caseTypeId} className={inputClass}>
            <option value="">{caseTypeId ? 'اختر محامياً...' : 'اختر نوع القضية أولاً'}</option>
            {selectableLawyers.map((e) => <option key={e.user.id} value={e.user.id}>{e.user.fullName ?? e.user.email}</option>)}
          </select>
          {caseTypeId && selectableLawyers.length === 0 && (
            <p className="text-xs text-brass-700 bg-brass-100 rounded-lg px-3 py-2 mt-2">
              لا يوجد محامون بتخصص مطابق لنوع القضية المختار.
            </p>
          )}
        </div>

        {/* Client — required, entered fresh every time; there is no client
            picker/search anymore, only an immutable snapshot embedded in
            the case at creation. */}
        <div className="bg-paper-soft/60 rounded-xl border border-paper-line p-4">
          <SectionHeader icon={User} title="الموكل" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={client.clientType} onChange={(e) => setClient((v) => ({ ...v, clientType: e.target.value }))} className={inputClass}>
              {Object.entries(PARTY_TYPE).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <input required placeholder="اسم الموكل" value={client.name} onChange={(e) => setClient((v) => ({ ...v, name: e.target.value }))} className={inputClass} />
            <input placeholder="رقم الهوية / السجل التجاري" value={client.nationalId} onChange={(e) => setClient((v) => ({ ...v, nationalId: e.target.value }))} className={inputClass} />
            <input placeholder="رقم السجل (للشركات)" value={client.registrationNo} onChange={(e) => setClient((v) => ({ ...v, registrationNo: e.target.value }))} className={inputClass} />
            <input placeholder="البريد الإلكتروني" type="email" value={client.email} onChange={(e) => setClient((v) => ({ ...v, email: e.target.value }))} className={inputClass} />
            <input placeholder="الهاتف" value={client.phone} onChange={(e) => setClient((v) => ({ ...v, phone: e.target.value }))} className={inputClass} />
            <input placeholder="العنوان" value={client.address} onChange={(e) => setClient((v) => ({ ...v, address: e.target.value }))} className={`${inputClass} sm:col-span-2`} />
            <textarea rows={2} placeholder="ملاحظات" value={client.notes} onChange={(e) => setClient((v) => ({ ...v, notes: e.target.value }))} className={`${inputClass} sm:col-span-2`} />
          </div>
        </div>

        {/* Opponents — opt-in on purpose: many cases have none. */}
        <div className="bg-paper-soft/60 rounded-xl border border-paper-line p-4">
          <SectionHeader icon={UserXIcon} title="الخصوم" />

          {opponents.length > 0 && (
            <ul className="space-y-1.5 mb-3">
              {opponents.map((o) => (
                <li key={o.key} className="flex items-center justify-between gap-2 bg-white rounded-lg border border-paper-line px-3 py-2 text-sm">
                  <span className="text-ink-700 truncate flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brass-500 shrink-0" />
                    {o.name}
                    {o.representative && <span className="text-ink-400 text-xs">— {o.representative}</span>}
                  </span>
                  <button type="button" onClick={() => removeStagedOpponent(o.key)} className="text-ink-300 hover:text-rust-600 shrink-0 p-1 rounded-lg hover:bg-rust-100">
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {showOpponentForm ? (
            <div className="bg-white rounded-lg border border-paper-line p-3">
              <div className="flex items-center justify-end mb-2">
                <button type="button" onClick={() => setShowOpponentForm(false)} className="text-ink-300 hover:text-ink-600 p-1 rounded-lg hover:bg-paper-soft">
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select value={opponentDraft.opponentType} onChange={(e) => setOpponentDraft((v) => ({ ...v, opponentType: e.target.value }))} className={inputClass}>
                  {Object.entries(PARTY_TYPE).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <input placeholder="اسم الخصم" value={opponentDraft.name} onChange={(e) => setOpponentDraft((v) => ({ ...v, name: e.target.value }))} className={inputClass} />
                <input placeholder="بيانات التواصل" value={opponentDraft.contact} onChange={(e) => setOpponentDraft((v) => ({ ...v, contact: e.target.value }))} className={inputClass} />
                <input placeholder="صفة الخصم / ممثله (مثال: المدعى عليه)" value={opponentDraft.representative} onChange={(e) => setOpponentDraft((v) => ({ ...v, representative: e.target.value }))} className={inputClass} />
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Button type="button" variant="secondary" className="!py-1.5 text-xs" onClick={addOpponentToStage}>
                  <UserPlus size={13} />
                  إضافة خصم آخر
                </Button>
                <span className="text-[11px] text-ink-400">أو اتركه كما هو — سيُضاف تلقائياً عند إنشاء القضية</span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowOpponentForm(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-paper-line text-ink-400 text-xs hover:border-brass-400 hover:text-brass-700 hover:bg-white transition-colors"
            >
              <Plus size={13} />
              {opponents.length ? 'إضافة خصم آخر' : 'إضافة خصم'}
            </button>
          )}
        </div>

        {error && <p className="text-sm text-rust-600 bg-rust-100 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex items-center gap-3 justify-end pt-1">
          <Button type="button" variant="secondary" onClick={resetAndClose}>إلغاء</Button>
          <Button type="submit" disabled={saving}>{saving ? 'جاري الإنشاء...' : 'إنشاء القضية'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Cases() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [status, setStatus] = useState('ALL')
  const [query, setQuery] = useState('')
  const [exporting, setExporting] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  const { data: cases, loading, error, reload } = useFetch(() => casesApi.list(), [])
  const { data: caseTypes } = useFetch(() => referenceApi.caseTypes(), [])
  const { data: employees } = useFetch(() => employeesApi.list(), [])
  const rows = useMemo(() => (Array.isArray(cases) ? cases : cases?.items ?? []), [cases])
  const canCreateCase = hasPermission(currentUser, 'case.create')

  const tabs = useMemo(
    () => [
      { value: 'ALL', label: 'الكل', count: rows.length },
      ...STATUS_TABS.map((s) => ({ value: s, label: CASE_STATUS[s].label, count: rows.filter((c) => c.status === s).length })),
    ],
    [rows]
  )

  // GET /cases doesn't join clientSnapshot (only caseType/defaultCourt) — the
  // client name simply isn't available on the list, so search is limited to
  // what actually comes back here: case number and title.
  const filtered = rows.filter((c) => {
    const matchesStatus = status === 'ALL' || c.status === status
    const q = query.toLowerCase()
    const matchesQuery = !query || c.caseNumber?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q)
    return matchesStatus && matchesQuery
  })

  async function handleExport() {
    setExporting(true)
    try {
      await downloadAuthedFile(reportsApi.exportCasesUrl(), 'cases.csv')
    } catch {
      alert('تعذر تصدير القضايا حالياً')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="القضايا"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleExport} disabled={exporting}>
              <Download size={14} />
              {exporting ? 'جاري التصدير...' : 'تصدير'}
            </Button>
            {canCreateCase && (
              <Button onClick={() => setShowCreate(true)}>
                <Plus size={14} />
                قضية جديدة
              </Button>
            )}
          </div>
        }
      />

      <NewCaseModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        caseTypes={caseTypes}
        employees={employees}
        onCreated={(created) => {
          reload()
          if (created?.id) navigate(`/cases/${created.id}`)
        }}
      />

      {!loading && !error && (
        <div className="mb-4">
          <Tabs tabs={tabs} active={status} onChange={setStatus} />
        </div>
      )}

      <SearchInput
        placeholder="بحث بالرقم أو العنوان..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-xs mb-6"
      />

      {loading && <LoadingBlock label="جاري تحميل القضايا..." />}
      {error && <ErrorBlock error={error} onRetry={reload} />}

      {!loading && !error && (filtered.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/cases/${c.id}`)}
              className="bg-white rounded-xl p-5 shadow-card border border-paper-line flex flex-col cursor-pointer hover:border-brass-500/40 hover:shadow-pop transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-ink-800 text-white shrink-0">
                    <Briefcase size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-800 truncate font-mono">{c.caseNumber}</p>
                    {c.title && <p className="text-xs text-ink-400 truncate">{c.title}</p>}
                  </div>
                </div>
                <EnumBadge code={c.status} map={CASE_STATUS} />
              </div>

              <div className="space-y-1.5 text-sm text-ink-500 mb-4">
                <p className="flex items-center gap-2 truncate">
                  <FileText size={12} className="shrink-0" /> {c.caseType?.nameAr ?? '—'}
                </p>
                <p className="flex items-center gap-2 truncate">
                  <Landmark size={12} className="shrink-0" /> {c.defaultCourt?.nameAr ?? '—'}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-paper-line pt-3 mt-auto text-xs">
                <EnumBadge code={c.priority} map={CASE_PRIORITY} dot />
                <span className="font-mono text-ink-400">{(c.openingDate ?? '').toString().slice(0, 10)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Briefcase}
          message="لا توجد قضايا حتى الآن"
          actionLabel={canCreateCase ? 'إنشاء قضية جديدة' : undefined}
          onAction={canCreateCase ? () => setShowCreate(true) : undefined}
        />
      ))}
    </div>
  )
}
