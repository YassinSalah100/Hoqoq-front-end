import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import EnumBadge from '../../components/ui/EnumBadge'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import { LoadingBlock, ErrorBlock } from '../../components/ui/AsyncState'
import FormModal from '../../components/ui/FormModal'
import { TASK_STATUS, TASK_STATUS_COLUMNS, TASK_PRIORITY } from '../../data/enums'
import { tasksApi, casesApi, employeesApi } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { hasPermission } from '../../data/auth'

function assigneeName(task) {
  return task.assignedTo?.fullName ?? '—'
}

export default function Tasks() {
  const { currentUser } = useAuth()
  const [showCreate, setShowCreate] = useState(false)
  const { data, loading, error, reload } = useFetch(() => tasksApi.list(), [])
  const { data: casesAll } = useFetch(() => casesApi.list(), [])
  const { data: employeesAll } = useFetch(() => employeesApi.list(), [])
  const rows = useMemo(() => (Array.isArray(data) ? data : data?.items ?? []), [data])
  // Real backend permission code is 'task.create' (singular, dotted — see
  // permissions.constant.ts); 'tasks.create' never matches anything in a
  // real account's permissions array, which hid this button for everyone.
  const canCreateTask = hasPermission(currentUser, 'task.create')

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

      {loading && <LoadingBlock label="جاري تحميل المهام..." />}
      {error && <ErrorBlock error={error} onRetry={reload} />}

      {!loading && !error && (rows.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TASK_STATUS_COLUMNS.map((column) => {
            const items = rows.filter((t) => t.status === column)
            return (
              <div key={column} className="bg-paper-soft rounded-xl p-3">
                <div className="flex items-center justify-between px-2 mb-3">
                  <h3 className="text-sm font-semibold text-ink-700">{TASK_STATUS[column].label}</h3>
                  <span className="text-xs text-ink-400 bg-white px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((task) => (
                    <div key={task.id} className="bg-white rounded-lg p-3 shadow-card border border-paper-line">
                      <p className="text-sm text-ink-800 font-medium mb-2">{task.title}</p>
                      <p className="font-mono text-xs text-ink-400 mb-2">{task.case?.caseNumber ?? ''}</p>
                      <div className="flex items-center justify-between">
                        <EnumBadge code={task.priority} map={TASK_PRIORITY} dot />
                        <span className="text-xs text-ink-400 font-mono">{(task.dueDate ?? '').toString().slice(0, 10)}</span>
                      </div>
                      <p className="text-xs text-ink-500 mt-2">{assigneeName(task)}</p>
                    </div>
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
