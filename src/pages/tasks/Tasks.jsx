import { useMemo, useState } from 'react'
import { Plus, Calendar, FolderKanban, CheckCircle2, XCircle, Clock } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import EnumBadge from '../../components/ui/EnumBadge'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import { LoadingBlock, ErrorBlock } from '../../components/ui/AsyncState'
import FormModal from '../../components/ui/FormModal'
import { TASK_STATUS, TASK_STATUS_COLUMNS, TASK_PRIORITY } from '../../data/enums'
import { tasksApi, casesApi, employeesApi } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { hasPermission } from '../../data/auth'

const PRIORITY_BORDER = {
  LOW: 'border-r-ink-300',
  NORMAL: 'border-r-brass-400',
  HIGH: 'border-r-rust-400',
  URGENT: 'border-r-rust-600',
}

const COLUMN_ACCENT = {
  NEW: 'bg-ink-400',
  IN_PROGRESS: 'bg-brass-500',
  WAITING: 'bg-ink-300',
  COMPLETED: 'bg-emerald-500',
  CANCELLED: 'bg-rust-500',
}

function assigneeInitials(task) {
  const name = task.assignedTo?.fullName ?? ''
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '؟'
  return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0][0]
}

function formatDueDate(dueDate) {
  if (!dueDate) return null
  const d = new Date(dueDate)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })
}

function isOverdue(task) {
  if (!task.dueDate || task.status === 'COMPLETED' || task.status === 'CANCELLED') return false
  return new Date(task.dueDate) < new Date(new Date().toDateString())
}

function TaskCard({ task, onClick }) {
  const dueLabel = formatDueDate(task.dueDate)
  const overdue = isOverdue(task)
  return (
    <button
      onClick={onClick}
      className={`w-full text-right bg-white rounded-lg p-3 shadow-card border border-paper-line border-r-4 ${
        PRIORITY_BORDER[task.priority] ?? 'border-r-ink-300'
      } hover:shadow-pop hover:border-brass-300 transition-all`}
    >
      <p className="text-sm text-ink-800 font-medium mb-2 leading-snug">{task.title}</p>

      {task.case?.caseNumber && (
        <div className="flex items-center gap-1 text-xs text-ink-400 mb-2 font-mono">
          <FolderKanban size={11} className="shrink-0" />
          <span className="truncate">{task.case.caseNumber}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <EnumBadge code={task.priority} map={TASK_PRIORITY} dot />
        {dueLabel && (
          <span className={`inline-flex items-center gap-1 text-xs font-mono ${overdue ? 'text-rust-600 font-semibold' : 'text-ink-400'}`}>
            <Calendar size={11} />
            {dueLabel}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-paper-line">
        <span className="w-5 h-5 rounded-full bg-brass-100 text-brass-700 text-[10px] font-semibold flex items-center justify-center shrink-0">
          {assigneeInitials(task)}
        </span>
        <span className="text-xs text-ink-500 truncate">{task.assignedTo?.fullName ?? 'غير مسند'}</span>
      </div>
    </button>
  )
}

function TaskDetailModal({ task, onClose, canUpdate, canComplete, onChanged }) {
  const [completing, setCompleting] = useState(false)
  const [completionNote, setCompletionNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  if (!task) return null
  const isFinal = task.status === 'COMPLETED' || task.status === 'CANCELLED'

  async function changeStatus(status) {
    setSaving(true)
    setError(null)
    try {
      await tasksApi.update(task.id, { status })
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function submitCompletion(e) {
    e.preventDefault()
    if (!completionNote.trim()) return
    setSaving(true)
    setError(null)
    try {
      await tasksApi.complete(task.id, completionNote.trim())
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function cancelTask() {
    if (!window.confirm('هل تريد إلغاء هذه المهمة؟')) return
    setSaving(true)
    setError(null)
    try {
      await tasksApi.remove(task.id)
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={Boolean(task)} onClose={onClose} title={task.title}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <EnumBadge code={task.status} map={TASK_STATUS} />
          <EnumBadge code={task.priority} map={TASK_PRIORITY} dot />
        </div>

        {task.description && <p className="text-sm text-ink-600 whitespace-pre-wrap">{task.description}</p>}

        <div className="grid grid-cols-2 gap-3 text-sm">
          {task.case?.caseNumber && (
            <div>
              <p className="text-xs text-ink-400 mb-0.5">القضية</p>
              <p className="font-mono text-ink-700">{task.case.caseNumber}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-ink-400 mb-0.5">الموظف المسؤول</p>
            <p className="text-ink-700">{task.assignedTo?.fullName ?? '—'}</p>
          </div>
          {task.dueDate && (
            <div>
              <p className="text-xs text-ink-400 mb-0.5">تاريخ الاستحقاق</p>
              <p className={`font-mono ${isOverdue(task) ? 'text-rust-600 font-semibold' : 'text-ink-700'}`}>{formatDueDate(task.dueDate)}</p>
            </div>
          )}
          {task.completionNote && (
            <div className="col-span-2">
              <p className="text-xs text-ink-400 mb-0.5">ملاحظة الإنهاء</p>
              <p className="text-ink-700">{task.completionNote}</p>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-rust-600">{error}</p>}

        {!isFinal && (canUpdate || canComplete) && (
          <div className="border-t border-paper-line pt-4 space-y-3">
            {canUpdate && !completing && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-ink-400">تغيير الحالة:</span>
                {['NEW', 'IN_PROGRESS', 'WAITING'].filter((s) => s !== task.status).map((s) => (
                  <button
                    key={s}
                    disabled={saving}
                    onClick={() => changeStatus(s)}
                    className="text-xs px-2.5 py-1 rounded-full border border-paper-line hover:border-brass-400 hover:bg-brass-50 text-ink-600 disabled:opacity-50"
                  >
                    {TASK_STATUS[s].label}
                  </button>
                ))}
              </div>
            )}

            {canComplete && !completing && (
              <div className="flex items-center gap-2">
                <Button onClick={() => setCompleting(true)} className="!py-1.5 !px-3 text-xs" disabled={saving}>
                  <CheckCircle2 size={13} />
                  إنهاء المهمة
                </Button>
                <Button variant="danger" onClick={cancelTask} className="!py-1.5 !px-3 text-xs" disabled={saving}>
                  <XCircle size={13} />
                  إلغاء المهمة
                </Button>
              </div>
            )}

            {canComplete && completing && (
              <form onSubmit={submitCompletion} className="space-y-2">
                <label className="text-sm font-medium text-ink-700">ملاحظة الإنهاء *</label>
                <textarea
                  autoFocus
                  required
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-paper-line bg-paper text-sm focus:outline-none focus:ring-2 focus:ring-brass-500/30 focus:border-brass-500"
                  placeholder="اكتب ملاحظة قصيرة عن إنجاز المهمة..."
                />
                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={saving || !completionNote.trim()} className="!py-1.5 !px-3 text-xs">
                    تأكيد الإنهاء
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setCompleting(false)} className="!py-1.5 !px-3 text-xs" disabled={saving}>
                    تراجع
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function Tasks() {
  const { currentUser } = useAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const { data, loading, error, reload } = useFetch(() => tasksApi.list(), [])
  const { data: casesAll } = useFetch(() => casesApi.list(), [])
  const { data: employeesAll } = useFetch(() => employeesApi.directory(), [])
  const rows = useMemo(() => (Array.isArray(data) ? data : data?.items ?? []), [data])
  // Real backend permission code is 'task.create' (singular, dotted — see
  // permissions.constant.ts); 'tasks.create' never matches anything in a
  // real account's permissions array, which hid this button for everyone.
  const canCreateTask = hasPermission(currentUser, 'task.create')
  const canUpdateTask = hasPermission(currentUser, 'task.update')
  // TASKS.DELETE maps to 'task.complete' in permissions.constant.ts and
  // gates both the complete-task and cancel/remove endpoints.
  const canCompleteTask = hasPermission(currentUser, 'task.complete')

  const overdueCount = rows.filter(isOverdue).length

  const createFields = [
    { name: 'title', label: 'عنوان المهمة', required: true },
    { name: 'description', label: 'الوصف', type: 'textarea' },
    { name: 'priority', label: 'الأولوية', type: 'select', options: Object.entries(TASK_PRIORITY).map(([value, v]) => ({ value, label: v.label })) },
    { name: 'dueDate', label: 'تاريخ الاستحقاق', type: 'date' },
    { name: 'caseId', label: 'القضية', type: 'select', options: (casesAll ?? []).map((c) => ({ value: c.id, label: c.caseNumber })) },
    {
      name: 'assignedToId',
      label: 'الموظف المسؤول',
      type: 'select',
      required: true,
      options: (employeesAll ?? []).map((e) => ({ value: e.user?.id, label: e.user?.fullName ?? e.user?.email })),
    },
  ]

  function handleChanged() {
    setSelectedTask(null)
    reload()
  }

  return (
    <div>
      <PageHeader
        title="المهام"
        actions={
          canCreateTask && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={14} />
              إضافة مهمة
            </Button>
          )
        }
      />

      {!loading && !error && rows.length > 0 && (
        <div className="flex items-center gap-4 mb-5 text-sm text-ink-500">
          <span>{rows.length} مهمة إجمالاً</span>
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 text-rust-600 font-medium">
              <Clock size={13} />
              {overdueCount} متأخرة
            </span>
          )}
        </div>
      )}

      {canCreateTask && (
        <FormModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title="إضافة مهمة"
          fields={createFields}
          initialValues={{ priority: 'NORMAL' }}
          onSubmit={async (values) => {
            // CreateTaskDto has no `assignedById` field — the backend derives
            // the assigner from the authenticated user, and the global
            // ValidationPipe (whitelist + forbidNonWhitelisted) 400s on any
            // extra property.
            await tasksApi.create(values)
            reload()
          }}
        />
      )}

      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        canUpdate={canUpdateTask}
        canComplete={canCompleteTask}
        onChanged={handleChanged}
      />

      {loading && <LoadingBlock label="جاري تحميل المهام..." />}
      {error && <ErrorBlock error={error} onRetry={reload} />}

      {!loading && !error && (rows.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-5 gap-4">
          {TASK_STATUS_COLUMNS.map((column) => {
            const items = rows.filter((t) => t.status === column)
            return (
              <div key={column} className="bg-paper-soft rounded-xl p-3">
                <div className="flex items-center gap-2 px-1 mb-3">
                  <span className={`w-2 h-2 rounded-full ${COLUMN_ACCENT[column]}`} />
                  <h3 className="text-sm font-semibold text-ink-700 flex-1">{TASK_STATUS[column].label}</h3>
                  <span className="text-xs text-ink-400 bg-white px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                <div className="space-y-2 min-h-[40px]">
                  {items.map((task) => (
                    <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          message="لا توجد مهام حتى الآن"
          actionLabel={canCreateTask ? 'إضافة مهمة' : undefined}
          onAction={canCreateTask ? () => setShowCreate(true) : undefined}
        />
      ))}
    </div>
  )
}
