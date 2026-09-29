import { useMemo, useState } from 'react'
import { Calendar as CalendarIcon, Plus, Pencil, UserPlus, CheckCircle2, XCircle } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import DataTable from '../../components/ui/DataTable'
import EnumBadge from '../../components/ui/EnumBadge'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import { LoadingBlock, ErrorBlock } from '../../components/ui/AsyncState'
import FormModal from '../../components/ui/FormModal'
import { HEARING_STATUS } from '../../data/enums'
import { hearingsApi, casesApi, referenceApi, lookupsApi, employeesApi } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { hasPermission } from '../../data/auth'

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-paper-line bg-paper text-sm focus:outline-none focus:ring-2 focus:ring-brass-500/30 focus:border-brass-500'
const labelClass = 'text-sm font-medium text-ink-700'

// GET /hearings and GET /hearings/:id join the `court` relation server-side
// (HearingsService.findAll/findOne — see leftJoinAndSelect/relations) even
// though HearingResponseDto only documents courtId as a scalar. Freshly
// created/assigned/completed hearings (returned straight from a save(), no
// join) won't have it, but this page always reload()s the list afterward, so
// that gap never shows up in the UI.
function courtLabel(hearing) {
  return hearing.court?.nameAr || hearing.court?.nameEn || null
}

function toDatetimeLocal(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Court/circuit are picked through a المحافظة → المحكمة → الدائرة cascade —
// the new /reference module has no flat "list all courts" endpoint, courts
// only ever come back scoped to one governorate at a time. The governorate
// itself isn't stored on the hearing (or the court) as far as the form is
// concerned; it only exists here to narrow the court dropdown, and defaults
// to the selected case's own governorateId (when the case has one — cases
// with a governorate always require their hearings' courts to belong to it,
// see HearingsService.validateReferences) so the user isn't re-picking it
// for every hearing on the same case.
function CreateHearingModal({ open, onClose, cases, hearingTypes, hearingTypesError, onRetryHearingTypes, employees, onCreated }) {
  const casesList = cases ?? []
  const [caseId, setCaseId] = useState('')
  const [governorateId, setGovernorateId] = useState('')
  const [courtId, setCourtId] = useState('')
  const [circuitId, setCircuitId] = useState('')
  const [hearingTypeId, setHearingTypeId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [judgeName, setJudgeName] = useState('')
  const [assignedLawyerId, setAssignedLawyerId] = useState('')
  const [conflictJustification, setConflictJustification] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const { data: governorates } = useFetch(() => referenceApi.governorates(), [])
  const { data: courts } = useFetch(
    () => (governorateId ? referenceApi.courtsByGovernorate(governorateId) : Promise.resolve([])),
    [governorateId]
  )
  const { data: circuits } = useFetch(
    () => (courtId ? referenceApi.circuitsByCourt(courtId) : Promise.resolve([])),
    [courtId]
  )

  function resetAll() {
    setCaseId('')
    setGovernorateId('')
    setCourtId('')
    setCircuitId('')
    setHearingTypeId('')
    setScheduledAt('')
    setJudgeName('')
    setAssignedLawyerId('')
    setConflictJustification('')
    setError(null)
  }

  function handleClose() {
    resetAll()
    onClose()
  }

  function handleCaseChange(id) {
    setCaseId(id)
    const selected = casesList.find((c) => c.id === id)
    setGovernorateId(selected?.governorateId ?? '')
    setCourtId('')
    setCircuitId('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload = {
        caseId,
        courtId,
        hearingTypeId,
        scheduledAt: new Date(scheduledAt).toISOString(),
      }
      if (circuitId) payload.circuitId = circuitId
      if (judgeName.trim()) payload.judgeName = judgeName.trim()
      if (assignedLawyerId) {
        payload.assignedLawyerId = assignedLawyerId
        if (conflictJustification.trim()) payload.conflictJustification = conflictJustification.trim()
      }
      await hearingsApi.create(payload)
      resetAll()
      onClose()
      onCreated()
    } catch (err) {
      // Surfaced as-is — including the backend's scheduling-conflict message
      // ("assigned Lawyer has a scheduling conflict; conflictJustification is
      // required"), which the مبرر تعارض field right below exists to resolve
      // on resubmit.
      setError(err.message ?? 'تعذر جدولة الجلسة')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="جدولة جلسة" size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>القضية</label>
            <select required value={caseId} onChange={(e) => handleCaseChange(e.target.value)} className={inputClass}>
              <option value="" disabled>اختر القضية...</option>
              {casesList.map((c) => (
                <option key={c.id} value={c.id}>{c.caseNumber}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>نوع الجلسة</label>
            {hearingTypesError || (Array.isArray(hearingTypes) && hearingTypes.length === 0) ? (
              <ErrorBlock
                error={hearingTypesError ?? { message: 'تعذر تحميل أنواع الجلسات' }}
                onRetry={onRetryHearingTypes}
              />
            ) : (
              <select required value={hearingTypeId} onChange={(e) => setHearingTypeId(e.target.value)} className={inputClass}>
                <option value="" disabled>اختر...</option>
                {(hearingTypes ?? []).map((t) => (
                  <option key={t.id} value={t.id}>{t.labelAr}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>المحافظة</label>
            <select
              value={governorateId}
              onChange={(e) => { setGovernorateId(e.target.value); setCourtId(''); setCircuitId('') }}
              className={inputClass}
            >
              <option value="">اختر المحافظة...</option>
              {(governorates ?? []).map((g) => (
                <option key={g.id} value={g.id}>{g.nameAr || g.nameEn}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>المحكمة</label>
            <select
              required
              disabled={!governorateId}
              value={courtId}
              onChange={(e) => { setCourtId(e.target.value); setCircuitId('') }}
              className={inputClass}
            >
              <option value="">{governorateId ? 'اختر المحكمة...' : 'اختر المحافظة أولاً'}</option>
              {(courts ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.nameAr || c.nameEn}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>الدائرة (اختياري)</label>
            <select disabled={!courtId} value={circuitId} onChange={(e) => setCircuitId(e.target.value)} className={inputClass}>
              <option value="">{courtId ? 'بدون دائرة محددة' : 'اختر المحكمة أولاً'}</option>
              {(circuits ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.nameAr || c.nameEn}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>التاريخ والوقت</label>
            <input required type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={inputClass} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>اسم القاضي (اختياري)</label>
            <input value={judgeName} onChange={(e) => setJudgeName(e.target.value)} className={inputClass} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>المحامي المكلف (اختياري)</label>
            <select value={assignedLawyerId} onChange={(e) => setAssignedLawyerId(e.target.value)} className={inputClass}>
              <option value="">بدون تكليف</option>
              {(employees ?? []).map((emp) => (
                <option key={emp.user?.id} value={emp.user?.id}>{emp.user?.fullName ?? emp.user?.email}</option>
              ))}
            </select>
          </div>

          {assignedLawyerId && (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={labelClass}>مبرر تعارض المواعيد (إن وُجد)</label>
              <textarea
                rows={2}
                value={conflictJustification}
                onChange={(e) => setConflictJustification(e.target.value)}
                placeholder="مطلوب فقط إذا كان لدى المحامي جلسة أخرى بنفس التوقيت"
                className={inputClass}
              />
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rust-100 border border-rust-200">
            <p className="text-sm text-rust-600">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-2 justify-end pt-3 mt-1 border-t border-paper-line">
          <Button type="button" variant="secondary" onClick={handleClose}>إلغاء</Button>
          <Button type="submit" disabled={saving || !hearingTypeId}>{saving ? 'جاري الحفظ...' : 'جدولة الجلسة'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Hearings() {
  const { currentUser } = useAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [assignTarget, setAssignTarget] = useState(null)
  const [completeTarget, setCompleteTarget] = useState(null)

  const { data, loading, error, reload } = useFetch(() => hearingsApi.list(), [])
  const { data: casesAll } = useFetch(() => casesApi.list(), [])
  const { data: hearingTypes, error: hearingTypesError, reload: reloadHearingTypes } = useFetch(() => lookupsApi.list('HEARING_TYPE'), [])
  const { data: employeesAll } = useFetch(() => employeesApi.directory(), [])

  const rows = useMemo(() => (Array.isArray(data) ? data : data?.items ?? []), [data])
  const casesById = useMemo(() => Object.fromEntries((casesAll ?? []).map((c) => [c.id, c])), [casesAll])
  const hearingTypesById = useMemo(() => Object.fromEntries((hearingTypes ?? []).map((t) => [t.id, t.labelAr])), [hearingTypes])

  // Real backend permission codes (permissions.constant.ts HEARINGS group):
  // create/edit/assign are distinct codes; both "complete" and "cancel" are
  // gated by the same 'hearing.complete' code (both map to HEARINGS.DELETE
  // on the controller).
  const canCreate = hasPermission(currentUser, 'hearing.create')
  const canEdit = hasPermission(currentUser, 'hearing.edit')
  const canAssign = hasPermission(currentUser, 'hearing.assign')
  const canComplete = hasPermission(currentUser, 'hearing.complete')

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayHearings = useMemo(() => rows.filter((h) => (h.scheduledAt ?? '').startsWith(todayStr)), [rows, todayStr])
  const courtCounts = useMemo(() => {
    const counts = {}
    todayHearings.forEach((h) => {
      const court = courtLabel(h) ?? 'محكمة غير محددة'
      counts[court] = (counts[court] ?? 0) + 1
    })
    return Object.entries(counts)
  }, [todayHearings])

  async function handleCancel(hearing) {
    if (!window.confirm('هل أنت متأكد من إلغاء هذه الجلسة؟')) return
    try {
      await hearingsApi.remove(hearing.id)
      reload()
    } catch (err) {
      alert(err.message ?? 'تعذر إلغاء الجلسة')
    }
  }

  const columns = [
    { key: 'scheduledAt', header: 'التاريخ والوقت', render: (r) => <span className="font-mono text-xs">{new Date(r.scheduledAt).toLocaleString('ar')}</span> },
    { key: 'caseId', header: 'رقم القضية', sortable: false, render: (r) => <span className="font-mono text-xs">{casesById[r.caseId]?.caseNumber ?? r.caseId}</span> },
    { key: 'court', header: 'المحكمة', sortable: false, render: (r) => courtLabel(r) ?? '—' },
    { key: 'hearingTypeId', header: 'نوع الجلسة', sortable: false, render: (r) => hearingTypesById[r.hearingTypeId] ?? '—' },
    { key: 'judgeName', header: 'القاضي', sortable: false, render: (r) => r.judgeName ?? '—' },
    { key: 'status', header: 'الحالة', sortable: false, render: (r) => <EnumBadge code={r.status} map={HEARING_STATUS} /> },
    {
      key: 'actions',
      header: '',
      sortable: false,
      render: (r) => (
        <div className="flex items-center gap-1">
          {canEdit && r.status === 'SCHEDULED' && (
            <button type="button" title="تعديل" onClick={() => setEditTarget(r)} className="p-1.5 rounded-lg hover:bg-paper-soft text-ink-500">
              <Pencil size={14} />
            </button>
          )}
          {canAssign && r.status === 'SCHEDULED' && (
            <button type="button" title="إسناد" onClick={() => setAssignTarget(r)} className="p-1.5 rounded-lg hover:bg-paper-soft text-ink-500">
              <UserPlus size={14} />
            </button>
          )}
          {canComplete && r.status === 'SCHEDULED' && (
            <button type="button" title="إنهاء" onClick={() => setCompleteTarget(r)} className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={14} />
            </button>
          )}
          {canComplete && r.status === 'SCHEDULED' && (
            <button type="button" title="إلغاء" onClick={() => handleCancel(r)} className="p-1.5 rounded-lg hover:bg-rust-100 text-rust-600">
              <XCircle size={14} />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="الجلسات"
        actions={
          canCreate && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={14} />
              جدولة جلسة
            </Button>
          )
        }
      />

      {canCreate && (
        <CreateHearingModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          cases={casesAll}
          hearingTypes={hearingTypes}
          hearingTypesError={hearingTypesError}
          onRetryHearingTypes={reloadHearingTypes}
          employees={employeesAll}
          onCreated={reload}
        />
      )}

      {canEdit && (
        <FormModal
          key={editTarget?.id ?? 'edit-none'}
          open={Boolean(editTarget)}
          onClose={() => setEditTarget(null)}
          title="تعديل الجلسة"
          fields={[
            {
              name: 'hearingTypeId',
              label: 'نوع الجلسة',
              type: 'select',
              required: true,
              options: (hearingTypes ?? []).map((t) => ({ value: t.id, label: t.labelAr })),
            },
            { name: 'scheduledAt', label: 'التاريخ والوقت', type: 'datetime-local', required: true },
            { name: 'judgeName', label: 'اسم القاضي (اختياري)' },
          ]}
          initialValues={
            editTarget
              ? {
                  hearingTypeId: editTarget.hearingTypeId,
                  scheduledAt: toDatetimeLocal(editTarget.scheduledAt),
                  judgeName: editTarget.judgeName ?? '',
                }
              : {}
          }
          onSubmit={async (values) => {
            // UpdateHearingDto excludes caseId/status/outcomeText/nextHearingAt/
            // assignedLawyerId — those go through the dedicated assign/complete
            // actions. Court/circuit reassignment isn't offered here; cancel and
            // reschedule if the court itself was wrong.
            await hearingsApi.update(editTarget.id, {
              hearingTypeId: values.hearingTypeId,
              scheduledAt: new Date(values.scheduledAt).toISOString(),
              ...(values.judgeName ? { judgeName: values.judgeName } : {}),
            })
            reload()
          }}
        />
      )}

      {canAssign && (
        <FormModal
          key={assignTarget?.id ?? 'assign-none'}
          open={Boolean(assignTarget)}
          onClose={() => setAssignTarget(null)}
          title="إسناد الجلسة لمحامٍ"
          fields={[
            {
              name: 'assignedLawyerId',
              label: 'المحامي',
              type: 'select',
              required: true,
              options: (employeesAll ?? []).map((e) => ({ value: e.user?.id, label: e.user?.fullName ?? e.user?.email })),
            },
          ]}
          initialValues={{ assignedLawyerId: assignTarget?.assignedLawyerId ?? '' }}
          onSubmit={async (values) => {
            await hearingsApi.assign(assignTarget.id, values.assignedLawyerId)
            reload()
          }}
        />
      )}

      {canComplete && (
        <FormModal
          key={completeTarget?.id ?? 'complete-none'}
          open={Boolean(completeTarget)}
          onClose={() => setCompleteTarget(null)}
          title="إنهاء الجلسة"
          fields={[
            { name: 'outcomeText', label: 'ملخص النتيجة (٥٠ حرفًا على الأقل)', type: 'textarea', required: true },
            { name: 'nextHearingAt', label: 'موعد الجلسة القادمة (اختياري)', type: 'datetime-local' },
          ]}
          onSubmit={async (values) => {
            await hearingsApi.complete(completeTarget.id, {
              outcomeText: values.outcomeText,
              ...(values.nextHearingAt ? { nextHearingAt: new Date(values.nextHearingAt).toISOString() } : {}),
            })
            reload()
          }}
        />
      )}

      {loading && <LoadingBlock label="جاري تحميل الجلسات..." />}
      {error && <ErrorBlock error={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          <div className="bg-brass-100 border border-brass-500/20 rounded-xl p-4 mb-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-brass-800 font-medium">
              <CalendarIcon size={15} />
              جلسات اليوم
              <span className="bg-white/60 px-2 py-0.5 rounded-full text-xs">{todayHearings.length} جلسات</span>
            </div>
            <div className="flex flex-wrap gap-2 mr-auto">
              {courtCounts.map(([court, count]) => (
                <span key={court} className="bg-white/70 text-brass-800 text-xs px-2.5 py-1 rounded-full">
                  {court} × {count}
                </span>
              ))}
            </div>
          </div>

          {rows.length ? (
            <DataTable columns={columns} data={rows} />
          ) : (
            <EmptyState
              message="لا توجد جلسات مجدولة حتى الآن"
              actionLabel={canCreate ? 'جدولة جلسة' : undefined}
              onAction={canCreate ? () => setShowCreate(true) : undefined}
            />
          )}
        </>
      )}
    </div>
  )
}
