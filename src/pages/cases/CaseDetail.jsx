import { useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Send, Plus, FileText, Download, Trash2, Upload, UserX, UserCog, ShieldCheck, Pencil, Building2, Phone, Info } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Tabs from '../../components/ui/Tabs'
import EnumBadge from '../../components/ui/EnumBadge'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import FormModal from '../../components/ui/FormModal'
import Modal from '../../components/ui/Modal'
import { LoadingBlock, ErrorBlock } from '../../components/ui/AsyncState'
import { CASE_STATUS, HEARING_STATUS, TASK_STATUS, TASK_PRIORITY, PARTY_TYPE, groupCaseCapabilities, summarizeGrantedCapabilities, PAYMENT_METHOD } from '../../data/enums'
import { casesApi, hearingsApi, documentsApi, tasksApi, financeApi, referenceApi, employeesApi, lookupsApi, downloadAuthedFile } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { hasPermission } from '../../data/auth'

const TABS = [
  { value: 'overview', label: 'نظرة عامة' },
  { value: 'team', label: 'الفريق' },
  { value: 'documents', label: 'المستندات' },
  { value: 'hearings', label: 'الجلسات' },
  { value: 'opponents', label: 'الخصوم' },
  { value: 'notes', label: 'الملاحظات' },
  { value: 'tasks', label: 'المهام' },
  { value: 'finance', label: 'المالية' },
]

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-paper-line bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brass-500/30 focus:border-brass-500'
const labelClass = 'block text-xs text-ink-400 mb-1'

// GET /cases/:id doesn't join `primaryLawyer` (only caseType/defaultCourt),
// so the lawyer's name has to be cross-referenced against the employees list
// by primaryLawyerId instead of coming back embedded on the case itself.
function leadLawyer(caseItem, employees) {
  const match = (employees ?? []).find((e) => e.user?.id === caseItem.primaryLawyerId)
  return match?.user?.fullName ?? '—'
}

function docStyle(fileType = '') {
  if (fileType.includes('pdf')) return { bg: 'bg-rust-100', text: 'text-rust-600' }
  if (fileType.includes('image')) return { bg: 'bg-brass-100', text: 'text-brass-700' }
  if (fileType.includes('word') || fileType.includes('document')) return { bg: 'bg-ink-100', text: 'text-ink-600' }
  return { bg: 'bg-paper-soft', text: 'text-ink-500' }
}

function formatSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function sar(n) {
  return `${Number(n ?? 0).toLocaleString('ar')} ج.م`
}

// Case "team" is no longer a tiered assignment (LEAD/SUPPORT) — it's a flat
// set of capability codes granted per employee per case (CaseAccessGrant).
// `casesApi.setAccess` replaces a user's whole capability set in one call;
// passing [] (via revokeAccess) clears it.
function TeamTab({ caseId, team, employees, reload }) {
  const { currentUser } = useAuth()
  const canManage = hasPermission(currentUser, 'case.access.manage')
  const [showGrant, setShowGrant] = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)

  const grantFields = [
    {
      name: 'userId',
      label: 'الموظف',
      type: 'select',
      required: true,
      options: (employees ?? []).map((e) => ({ value: e.user?.id, label: e.user?.fullName ?? e.user?.email })),
    },
    {
      name: 'capabilities',
      label: 'الصلاحيات الممنوحة على هذه القضية',
      type: 'grouped-checkboxes',
      groups: groupCaseCapabilities(),
    },
  ]

  const editingMember = team.find((t) => t.id === editingUserId)
  const initialValues = {
    userId: editingUserId ?? '',
    capabilities: editingMember?.roleOnCase ? editingMember.roleOnCase.split(',').filter(Boolean) : [],
  }

  async function handleRevoke(userId) {
    if (!confirm('هل تريد إلغاء جميع صلاحيات هذا العضو على القضية؟')) return
    try {
      await casesApi.revokeAccess(caseId, userId)
      reload()
    } catch (err) {
      alert(err.message ?? 'تعذر إلغاء الصلاحيات')
    }
  }

  return (
    <div>
      {canManage && (
        <div className="flex justify-end mb-4">
          <Button onClick={() => { setEditingUserId(null); setShowGrant(true) }}>
            <UserCog size={14} />
            منح صلاحيات
          </Button>
        </div>
      )}

      {canManage && (
        <FormModal
          key={editingUserId ?? 'new'}
          open={showGrant}
          onClose={() => { setShowGrant(false); setEditingUserId(null) }}
          title={editingUserId ? 'تعديل صلاحيات العضو' : 'منح صلاحيات لعضو جديد'}
          fields={grantFields}
          initialValues={initialValues}
          submitLabel="حفظ"
          onSubmit={async (values) => {
            if (!values.userId) throw new Error('اختر موظفاً')
            await casesApi.setAccess(caseId, values.userId, values.capabilities ?? [])
            setEditingUserId(null)
            reload()
          }}
        />
      )}

      {team.length ? (
        <div className="bg-white rounded-xl shadow-card border border-paper-line divide-y divide-paper-line">
          {team.map((t) => {
            const capabilities = (t.roleOnCase ?? '').split(',').filter(Boolean)
            const summary = summarizeGrantedCapabilities(capabilities)
            return (
              <div key={t.id} className="px-6 py-3.5 flex items-center gap-3">
                <Avatar name={t.user?.fullName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-800 truncate">{t.user?.fullName ?? '—'}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    {summary.map(({ label, count }) => (
                      <span key={label} className="inline-flex items-center gap-1 text-xs text-ink-500">
                        <ShieldCheck size={11} className="text-brass-500 shrink-0" />
                        {label}
                        <span className="text-ink-300">· {count}</span>
                      </span>
                    ))}
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setEditingUserId(t.id); setShowGrant(true) }}
                      title="تعديل الصلاحيات"
                      className="text-ink-300 hover:text-brass-700 p-1.5 rounded-lg hover:bg-brass-100"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleRevoke(t.id)}
                      title="إلغاء الصلاحيات"
                      className="text-ink-300 hover:text-rust-600 p-1.5 rounded-lg hover:bg-rust-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={UserCog}
          message="لا يوجد أعضاء لديهم صلاحيات على هذه القضية بعد"
          actionLabel={canManage ? 'منح صلاحيات' : undefined}
          onAction={canManage ? () => setShowGrant(true) : undefined}
        />
      )}
    </div>
  )
}

// Documents belong to exactly one case — upload requires a category (a
// global DOCUMENT_CATEGORY lookup id), so this can't be a fire-and-forget
// file picker anymore; category has to be chosen before the upload fires.
function DocumentsTab({ caseId }) {
  const fileInputRef = useRef(null)
  const [pendingFile, setPendingFile] = useState(null)
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const { data, loading, error, reload } = useFetch(() => documentsApi.list(caseId), [caseId])
  const { data: categories } = useFetch(() => lookupsApi.list('DOCUMENT_CATEGORY'), [])
  const documents = data ?? []

  async function handleUpload() {
    if (!pendingFile || !categoryId) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', pendingFile)
      formData.append('caseId', caseId)
      formData.append('categoryId', categoryId)
      if (description.trim()) formData.append('description', description.trim())
      await documentsApi.upload(formData)
      setPendingFile(null)
      setCategoryId('')
      setDescription('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      reload()
    } catch (err) {
      alert(err.message ?? 'تعذر رفع المستند')
    } finally {
      setUploading(false)
    }
  }

  async function handleDownload(doc) {
    try {
      await downloadAuthedFile(documentsApi.downloadUrl(doc.id), doc.title ?? 'document')
    } catch {
      alert('تعذر تحميل المستند')
    }
  }

  async function handleDelete(doc) {
    if (!confirm('هل أنت متأكد من حذف هذا المستند؟')) return
    try {
      await documentsApi.remove(doc.id)
      reload()
    } catch {
      alert('تعذر حذف المستند')
    }
  }

  if (loading) return <LoadingBlock label="جاري تحميل المستندات..." />
  if (error) return <ErrorBlock error={error} onRetry={reload} />

  return (
    <div>
      <div className="bg-white rounded-xl p-4 shadow-card border border-paper-line mb-4">
        <p className="text-xs font-medium text-ink-500 mb-2">رفع مستند جديد</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
            className="text-xs sm:col-span-1"
          />
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
            <option value="">اختر التصنيف...</option>
            {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.labelAr}</option>)}
          </select>
          <input placeholder="وصف (اختياري)" value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
        </div>
        <div className="flex justify-end mt-2">
          <Button onClick={handleUpload} disabled={!pendingFile || !categoryId || uploading}>
            <Upload size={14} />
            {uploading ? 'جاري الرفع...' : 'رفع'}
          </Button>
        </div>
      </div>

      {documents.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const style = docStyle(doc.fileType)
            return (
              <div key={doc.id} className="bg-white rounded-xl p-4 shadow-card border border-paper-line">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`p-2.5 rounded-lg ${style.bg} ${style.text} shrink-0`}>
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-800 truncate">{doc.title}</p>
                    <p className="text-xs text-ink-400 mt-0.5">{(doc.createdAt ?? '').toString().slice(0, 10)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-ink-400 mb-3">
                  <span>{formatSize(doc.sizeBytes)}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1 justify-center !py-1.5" onClick={() => handleDownload(doc)}>
                    <Download size={13} />
                    تحميل
                  </Button>
                  <Button variant="danger" className="flex-1 justify-center !py-1.5" onClick={() => handleDelete(doc)}>
                    <Trash2 size={13} />
                    حذف
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={FileText} message="لا توجد مستندات لهذه القضية" />
      )}
    </div>
  )
}

// A hearing's court is picked live from the governorate → court → circuit
// directory (referenceApi) — pre-seeded from the case's own governorate/
// court when it has one, but independently changeable since a hearing can
// in principle sit at a different court than the case's default.
function ScheduleHearingModal({ open, onClose, caseId, caseItem, onScheduled }) {
  const [governorateId, setGovernorateId] = useState(caseItem.governorateId ?? '')
  const [courtId, setCourtId] = useState(caseItem.defaultCourtId ?? '')
  const [circuitId, setCircuitId] = useState('')
  const [hearingTypeId, setHearingTypeId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [judgeName, setJudgeName] = useState('')
  const [outcomeText, setOutcomeText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const { data: governorates } = useFetch(() => referenceApi.governorates(), [])
  const { data: courts } = useFetch(() => (governorateId ? referenceApi.courtsByGovernorate(governorateId) : Promise.resolve([])), [governorateId])
  const { data: circuits } = useFetch(() => (courtId ? referenceApi.circuitsByCourt(courtId) : Promise.resolve([])), [courtId])
  const { data: hearingTypes } = useFetch(() => lookupsApi.list('HEARING_TYPE'), [])

  function reset() {
    setGovernorateId(caseItem.governorateId ?? '')
    setCourtId(caseItem.defaultCourtId ?? '')
    setCircuitId(''); setHearingTypeId(''); setScheduledAt(''); setJudgeName(''); setOutcomeText(''); setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!courtId) { setError('يجب اختيار المحكمة'); return }
    if (!hearingTypeId) { setError('يجب اختيار نوع الجلسة'); return }
    if (!scheduledAt) { setError('يجب تحديد التاريخ والوقت'); return }
    setSaving(true)
    try {
      await hearingsApi.create({
        caseId,
        courtId,
        ...(circuitId && { circuitId }),
        hearingTypeId,
        scheduledAt: new Date(scheduledAt).toISOString(),
        ...(judgeName.trim() && { judgeName: judgeName.trim() }),
        ...(outcomeText.trim() && { outcomeText: outcomeText.trim() }),
      })
      reset()
      onClose()
      onScheduled()
    } catch (err) {
      setError(err.message ?? 'تعذر جدولة الجلسة')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="جدولة جلسة">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>المحافظة</label>
            <select value={governorateId} onChange={(e) => { setGovernorateId(e.target.value); setCourtId(''); setCircuitId('') }} className={inputClass}>
              <option value="">اختر...</option>
              {(governorates ?? []).map((g) => <option key={g.id} value={g.id}>{g.nameAr}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>المحكمة</label>
            <select value={courtId} onChange={(e) => { setCourtId(e.target.value); setCircuitId('') }} disabled={!governorateId} className={inputClass}>
              <option value="">{governorateId ? 'اختر...' : 'اختر المحافظة أولاً'}</option>
              {(courts ?? []).map((c) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>الدائرة (اختياري)</label>
            <select value={circuitId} onChange={(e) => setCircuitId(e.target.value)} disabled={!courtId} className={inputClass}>
              <option value="">بدون تحديد</option>
              {(circuits ?? []).map((c) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>نوع الجلسة</label>
            <select value={hearingTypeId} onChange={(e) => setHearingTypeId(e.target.value)} className={inputClass}>
              <option value="">اختر...</option>
              {(hearingTypes ?? []).map((t) => <option key={t.id} value={t.id}>{t.labelAr}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>التاريخ والوقت</label>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>اسم القاضي (اختياري)</label>
            <input value={judgeName} onChange={(e) => setJudgeName(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>ملاحظات (اختياري)</label>
          <textarea rows={2} value={outcomeText} onChange={(e) => setOutcomeText(e.target.value)} className={inputClass} />
        </div>
        {error && <p className="text-sm text-rust-600 bg-rust-100 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex items-center gap-3 justify-end pt-1">
          <Button type="button" variant="secondary" onClick={() => { reset(); onClose() }}>إلغاء</Button>
          <Button type="submit" disabled={saving}>{saving ? 'جاري الجدولة...' : 'جدولة'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function HearingsTab({ caseId, caseItem }) {
  const [showCreate, setShowCreate] = useState(false)
  const { data, loading, error, reload } = useFetch(() => hearingsApi.list(), [])
  const hearings = useMemo(() => (data ?? []).filter((h) => h.caseId === caseId), [data, caseId])

  if (loading) return <LoadingBlock label="جاري تحميل الجلسات..." />
  if (error) return <ErrorBlock error={error} onRetry={reload} />

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={14} />
          جدولة جلسة
        </Button>
      </div>

      <ScheduleHearingModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        caseId={caseId}
        caseItem={caseItem}
        onScheduled={reload}
      />

      {hearings.length ? (
        <div className="bg-white rounded-xl shadow-card border border-paper-line divide-y divide-paper-line">
          {hearings.map((h) => (
            <div key={h.id} className="px-6 py-3 flex items-center justify-between gap-3">
              <span className="font-mono text-sm text-ink-700">{new Date(h.scheduledAt).toLocaleString('ar')}</span>
              <span className="text-sm text-ink-500 truncate">{h.outcomeText ?? '—'}</span>
              <EnumBadge code={h.status} map={HEARING_STATUS} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="لا توجد جلسات لهذه القضية" actionLabel="جدولة جلسة" onAction={() => setShowCreate(true)} />
      )}
    </div>
  )
}

// Opponents are immutable snapshots entered only at case-creation time (see
// NewCaseModal in Cases.jsx) — there's no attach/detach endpoint anymore, so
// this tab is purely a read-only view of `case.opponentSnapshots`.
function OpponentsTab({ opponents }) {
  return (
    <div>
      {opponents.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {opponents.map((o) => (
            <div key={o.id} className="bg-white rounded-xl p-5 shadow-card border border-paper-line flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-rust-100 text-rust-600 flex items-center justify-center shrink-0">
                  {o.opponentType === 'COMPANY' ? <Building2 size={18} /> : <UserX size={18} />}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-ink-800 truncate">{o.name}</p>
                  <span className="text-xs text-ink-400">{PARTY_TYPE[o.opponentType] ?? o.opponentType}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-ink-500">
                {o.representative && (
                  <p className="flex items-center gap-2 truncate">
                    <Info size={12} className="shrink-0 text-ink-300" />
                    {o.representative}
                  </p>
                )}
                {o.contact && (
                  <p className="flex items-center gap-2 font-mono text-xs" dir="ltr">
                    <Phone size={12} className="shrink-0 text-ink-300" />
                    {o.contact}
                  </p>
                )}
              </div>

              {o.notes && (
                <p className="text-xs text-ink-400 mt-3 pt-3 border-t border-paper-line leading-relaxed">{o.notes}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={UserX} message="لا يوجد خصوم مرتبطون بهذه القضية" />
      )}
    </div>
  )
}

function NotesTab({ caseItem, reload, canEdit }) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!note.trim()) return
    setSaving(true)
    try {
      await casesApi.addNote(caseItem.id, note.trim())
      setNote('')
      reload()
    } catch (err) {
      alert(err.message ?? 'تعذر إضافة الملاحظة')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-card border border-paper-line">
      {canEdit && (
        <div className="flex gap-2 mb-4">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="اكتب ملاحظة حول القضية..."
            className="flex-1 rounded-lg border border-paper-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500/30 focus:border-brass-500"
          />
          <Button onClick={handleAdd} disabled={saving}>
            <Send size={13} />
            إضافة
          </Button>
        </div>
      )}

      {(caseItem.notes ?? []).length ? (
        <ul className="space-y-2">
          {caseItem.notes.map((n) => (
            <li key={n.id} className="text-sm text-ink-600 bg-paper-soft rounded-lg px-3 py-2">
              {n.content}
              <span className="block text-xs text-ink-400 mt-1 font-mono">{(n.createdAt ?? '').toString().slice(0, 10)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-300 text-center py-6">لا توجد ملاحظات لهذه القضية بعد</p>
      )}
    </div>
  )
}

function TasksTab({ caseId, employees }) {
  const [showCreate, setShowCreate] = useState(false)
  const { data, loading, error, reload } = useFetch(() => tasksApi.list(), [])
  const tasks = useMemo(() => (data ?? []).filter((t) => t.caseId === caseId), [data, caseId])

  const createFields = [
    { name: 'title', label: 'عنوان المهمة', required: true },
    { name: 'description', label: 'الوصف', type: 'textarea' },
    { name: 'priority', label: 'الأولوية', type: 'select', options: Object.entries(TASK_PRIORITY).map(([value, v]) => ({ value, label: v.label })) },
    { name: 'dueDate', label: 'تاريخ الاستحقاق', type: 'date' },
    {
      name: 'assignedToId',
      label: 'الموظف المسؤول',
      type: 'select',
      required: true,
      options: (employees ?? []).map((e) => ({ value: e.user?.id, label: e.user?.fullName ?? e.user?.email })),
    },
  ]

  if (loading) return <LoadingBlock label="جاري تحميل المهام..." />
  if (error) return <ErrorBlock error={error} onRetry={reload} />

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={14} />
          إضافة مهمة
        </Button>
      </div>

      <FormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="إضافة مهمة"
        fields={createFields}
        initialValues={{ priority: 'MEDIUM' }}
        onSubmit={async (values) => {
          await tasksApi.create({
            ...values,
            caseId,
            dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : undefined,
          })
          reload()
        }}
      />

      {tasks.length ? (
        <div className="bg-white rounded-xl shadow-card border border-paper-line divide-y divide-paper-line">
          {tasks.map((t) => (
            <div key={t.id} className="px-6 py-3 flex items-center justify-between gap-3">
              <span className="text-sm text-ink-700">{t.title}</span>
              <EnumBadge code={t.priority} map={TASK_PRIORITY} dot />
              <span className="text-xs text-ink-400">{TASK_STATUS[t.status]?.label ?? t.status}</span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="لا توجد مهام لهذه القضية" actionLabel="إضافة مهمة" onAction={() => setShowCreate(true)} />
      )}
    </div>
  )
}

// Replaces the old free-standing Invoices model — finance is now the case's
// single agreed fee plus a payment ledger against it (financeApi.getCaseFinance).
function FinanceTab({ caseId }) {
  const { currentUser } = useAuth()
  const canRecord = hasPermission(currentUser, 'finance.payment.record')
  const canReverse = hasPermission(currentUser, 'finance.manage')
  const [showCreate, setShowCreate] = useState(false)
  const { data, loading, error, reload } = useFetch(() => financeApi.getCaseFinance(caseId), [caseId])

  const createFields = [
    { name: 'amount', label: 'المبلغ (ج.م)', type: 'number', required: true },
    { name: 'paidAt', label: 'تاريخ الدفع', type: 'date', required: true },
    { name: 'method', label: 'طريقة الدفع', type: 'select', required: true, options: Object.entries(PAYMENT_METHOD).map(([value, label]) => ({ value, label })) },
    { name: 'reference', label: 'المرجع' },
    { name: 'note', label: 'ملاحظات', type: 'textarea' },
  ]

  async function handleReverse(paymentId) {
    const reason = prompt('سبب إلغاء الدفعة (٣ أحرف على الأقل):')
    if (!reason || reason.trim().length < 3) return
    try {
      await financeApi.reversePayment(paymentId, reason.trim())
      reload()
    } catch (err) {
      alert(err.message ?? 'تعذر إلغاء الدفعة')
    }
  }

  if (loading) return <LoadingBlock label="جاري تحميل البيانات المالية..." />
  if (error) return <ErrorBlock error={error} onRetry={reload} />

  const finance = data ?? { agreedFee: 0, paid: 0, remaining: 0, payments: [] }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          ['الأتعاب المتفق عليها', finance.agreedFee],
          ['المدفوع', finance.paid],
          ['المتبقي', finance.remaining],
        ].map(([label, value]) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-card border border-paper-line">
            <p className="text-xs text-ink-400 mb-1">{label}</p>
            <p className="font-mono text-lg font-semibold text-ink-800">{sar(value)}</p>
          </div>
        ))}
      </div>

      {canRecord && (
        <div className="flex justify-end mb-4">
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={14} />
            تسجيل دفعة
          </Button>
        </div>
      )}

      {canRecord && (
        <FormModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title="تسجيل دفعة"
          fields={createFields}
          initialValues={{ method: 'CASH' }}
          onSubmit={async (values) => {
            await financeApi.recordPayment(caseId, {
              amount: Number(values.amount),
              paidAt: values.paidAt,
              method: values.method,
              reference: values.reference || undefined,
              note: values.note || undefined,
            })
            reload()
          }}
        />
      )}

      {finance.payments?.length ? (
        <div className="bg-white rounded-xl shadow-card border border-paper-line divide-y divide-paper-line">
          {finance.payments.map((p) => (
            <div key={p.id} className="px-6 py-3 flex items-center justify-between gap-3">
              <span className={`font-mono text-sm text-ink-700 ${p.reversedAt ? 'line-through text-ink-300' : ''}`}>{sar(p.amount)}</span>
              <span className="text-xs text-ink-400">{PAYMENT_METHOD[p.method] ?? p.method}</span>
              <span className="text-xs text-ink-400 font-mono">{(p.paidAt ?? '').toString().slice(0, 10)}</span>
              {p.reversedAt ? (
                <span className="inline-flex items-center gap-1 text-xs bg-rust-100 text-rust-600 px-2.5 py-1 rounded-full shrink-0">ملغاة</span>
              ) : canReverse ? (
                <button onClick={() => handleReverse(p.id)} className="text-xs text-rust-600 hover:underline shrink-0">إلغاء</button>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="لا توجد دفعات مسجلة لهذه القضية" actionLabel={canRecord ? 'تسجيل دفعة' : undefined} onAction={canRecord ? () => setShowCreate(true) : undefined} />
      )}
    </div>
  )
}

// A lawyer is any employee with a configured specialization (one specific
// Case Type) or marked general — mirrors the same rule NewCaseModal
// (Cases.jsx) uses and the backend enforces server-side
// (CasesService.validatePrimaryLawyer).
function isLawyer(employee) {
  return Boolean(employee?.specializationId) || Boolean(employee?.isGeneralSpecialization)
}

function matchesCaseType(employee, caseTypeId) {
  return Boolean(employee?.isGeneralSpecialization) || employee?.specializationId === caseTypeId
}

// Every field UpdateCaseDto accepts — including caseTypeId/primaryLawyerId/
// governorateId/defaultCourtId/circuitId, which the old version of this
// form left out entirely. Activating a case (CasesService.changeStatus)
// requires all of governorateId, defaultCourtId, caseTypeId,
// primaryLawyerId, and openingDate — leaving them out here meant a case
// created without one of them (they're all optional at creation time) could
// never be completed and activated afterward, only ever failing with
// "Cannot activate Case; missing: ..." with no way to fix it. `status`
// itself is still not in UpdateCaseDto — use casesApi.changeStatus via the
// status selector next to the page header instead. closingDate/
// outcomeSummary are Case columns but aren't exposed on Create/UpdateCaseDto
// by the backend at all, so there is still no way to set them from this UI.
function EditCaseModal({ open, onClose, caseItem, employees, onSaved }) {
  const [caseNumber, setCaseNumber] = useState(caseItem.caseNumber ?? '')
  const [title, setTitle] = useState(caseItem.title ?? '')
  const [courtCaseNumber, setCourtCaseNumber] = useState(caseItem.courtCaseNumber ?? '')
  const [courtCaseYear, setCourtCaseYear] = useState(caseItem.courtCaseYear ?? '')
  const [caseTypeId, setCaseTypeId] = useState(caseItem.caseTypeId ?? '')
  const [openingDate, setOpeningDate] = useState((caseItem.openingDate ?? '').toString().slice(0, 10))
  const [agreedFee, setAgreedFee] = useState(caseItem.agreedFee ?? '')
  const [description, setDescription] = useState(caseItem.description ?? '')

  const [governorateId, setGovernorateId] = useState(caseItem.governorateId ?? '')
  const [defaultCourtId, setDefaultCourtId] = useState(caseItem.defaultCourtId ?? '')
  const [circuitId, setCircuitId] = useState(caseItem.circuitId ?? '')
  const [primaryLawyerId, setPrimaryLawyerId] = useState(caseItem.primaryLawyerId ?? '')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const { data: caseTypes } = useFetch(() => referenceApi.caseTypes(), [])
  const { data: governorates } = useFetch(() => referenceApi.governorates(), [])
  const { data: courts } = useFetch(
    () => (governorateId ? referenceApi.courtsByGovernorate(governorateId) : Promise.resolve([])),
    [governorateId]
  )
  const { data: circuits } = useFetch(
    () => (defaultCourtId ? referenceApi.circuitsByCourt(defaultCourtId) : Promise.resolve([])),
    [defaultCourtId]
  )

  const selectableLawyers = useMemo(
    () => (employees ?? []).filter((e) => isLawyer(e) && (!caseTypeId || matchesCaseType(e, caseTypeId))),
    [employees, caseTypeId]
  )

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await casesApi.update(caseItem.id, {
        caseNumber,
        title: title || undefined,
        courtCaseNumber: courtCaseNumber || undefined,
        courtCaseYear: courtCaseYear ? Number(courtCaseYear) : undefined,
        caseTypeId: caseTypeId || undefined,
        governorateId: governorateId || undefined,
        defaultCourtId: defaultCourtId || undefined,
        circuitId: circuitId || undefined,
        primaryLawyerId: primaryLawyerId || undefined,
        openingDate: openingDate || undefined,
        agreedFee: agreedFee ? Number(agreedFee) : undefined,
        description: description || undefined,
      })
      onSaved()
    } catch (err) {
      setError(err.message ?? 'تعذر حفظ التعديلات')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="تعديل القضية" size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>رقم القضية</label>
            <input required value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>عنوان القضية</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>نوع القضية</label>
            <select
              value={caseTypeId}
              onChange={(e) => { setCaseTypeId(e.target.value); setPrimaryLawyerId('') }}
              className={inputClass}
            >
              <option value="">اختر...</option>
              {(caseTypes ?? []).map((t) => <option key={t.id} value={t.id}>{t.labelAr}</option>)}
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

        <div>
          <label className={labelClass}>وصف القضية</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
        </div>

        <div className="rounded-xl border border-paper-line p-3 bg-paper-soft/60">
          <p className="text-xs font-semibold text-ink-600 mb-2">المحكمة — مطلوبة قبل تفعيل القضية</p>
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

        <div className="rounded-xl border border-paper-line p-3 bg-paper-soft/60">
          <p className="text-xs font-semibold text-ink-600 mb-2">المحامي المسؤول — مطلوب قبل تفعيل القضية</p>
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

        {error && <p className="text-sm text-rust-600 bg-rust-100 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex items-center gap-3 justify-end pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function StatusChanger({ caseItem, reload }) {
  const { currentUser } = useAuth()
  const canChangeStatus = hasPermission(currentUser, 'case.status.manage')
  const [saving, setSaving] = useState(false)
  if (!canChangeStatus) return null

  async function handleChange(e) {
    const status = e.target.value
    if (status === caseItem.status) return
    setSaving(true)
    try {
      await casesApi.changeStatus(caseItem.id, status)
      reload()
    } catch (err) {
      alert(err.message ?? 'تعذر تغيير حالة القضية')
    } finally {
      setSaving(false)
    }
  }

  return (
    <select
      value={caseItem.status}
      onChange={handleChange}
      disabled={saving}
      className="text-xs rounded-lg border border-paper-line px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brass-500/30"
    >
      {Object.entries(CASE_STATUS).map(([value, v]) => <option key={value} value={value}>{v.label}</option>)}
    </select>
  )
}

export default function CaseDetail() {
  const { id } = useParams()
  const { currentUser } = useAuth()
  const [tab, setTab] = useState('overview')
  const [showEdit, setShowEdit] = useState(false)

  const { data: caseItem, loading, error, reload } = useFetch(() => casesApi.get(id), [id])
  const { data: employees } = useFetch(() => employeesApi.directory(), [])

  const visibleTabs = useMemo(
    () => TABS.filter((t) => t.value !== 'finance' || hasPermission(currentUser, 'finance.case.view')),
    [currentUser]
  )
  const canEdit = hasPermission(currentUser, 'case.edit')

  if (loading) return <LoadingBlock label="جاري تحميل بيانات القضية..." />
  if (error) return <ErrorBlock error={error} onRetry={reload} />
  if (!caseItem) return <EmptyState message="لم يتم العثور على القضية" />

  return (
    <div>
      <PageHeader
        title={caseItem.caseNumber}
        breadcrumb={[{ label: 'القضايا', to: '/cases' }, { label: caseItem.caseNumber ?? caseItem.id }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusChanger caseItem={caseItem} reload={reload} />
            {canEdit && <Button variant="secondary" onClick={() => setShowEdit(true)}>تعديل</Button>}
          </div>
        }
      />

      {canEdit && (
        <EditCaseModal
          open={showEdit}
          onClose={() => setShowEdit(false)}
          caseItem={caseItem}
          employees={employees}
          onSaved={() => {
            setShowEdit(false)
            reload()
          }}
        />
      )}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="font-mono text-sm text-ink-500">{caseItem.caseNumber}</span>
        <EnumBadge code={caseItem.status} map={CASE_STATUS} />
      </div>

      <div className="mb-4">
        <Tabs tabs={visibleTabs} active={tab} onChange={setTab} />
      </div>

      {tab === 'overview' && (
        <div className="bg-white rounded-xl p-6 shadow-card border border-paper-line grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            ['الموكل', caseItem.clientSnapshot?.name],
            ['نوع القضية', caseItem.caseType?.nameAr],
            ['المحكمة', caseItem.defaultCourt?.nameAr],
            ['المحامي المسؤول', leadLawyer(caseItem, employees)],
            ['رقم القضية لدى المحكمة', caseItem.courtCaseNumber],
            ['سنة القضية', caseItem.courtCaseYear],
            ['تاريخ الفتح', (caseItem.openingDate ?? '').toString().slice(0, 10)],
            ['الأتعاب المتفق عليها', caseItem.agreedFee != null ? sar(caseItem.agreedFee) : null],
            ['وصف القضية', caseItem.description],
            ['ملخص النتيجة', caseItem.outcomeSummary],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-ink-400 mb-1">{label}</p>
              <p className="text-sm text-ink-800">{value ?? '—'}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'team' && <TeamTab caseId={id} team={caseItem.team ?? []} employees={employees} reload={reload} />}
      {tab === 'documents' && <DocumentsTab caseId={id} />}
      {tab === 'hearings' && <HearingsTab caseId={id} caseItem={caseItem} />}
      {tab === 'opponents' && <OpponentsTab opponents={caseItem.opponentSnapshots ?? []} />}
      {tab === 'notes' && <NotesTab caseItem={caseItem} reload={reload} canEdit={canEdit} />}
      {tab === 'tasks' && <TasksTab caseId={id} employees={employees} />}
      {tab === 'finance' && <FinanceTab caseId={id} />}
    </div>
  )
}
