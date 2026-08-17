import { useMemo, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Avatar from '../../components/ui/Avatar'
import EmptyState from '../../components/ui/EmptyState'
import { LoadingBlock, ErrorBlock } from '../../components/ui/AsyncState'
import PermissionsEditor from '../../components/hr/PermissionsEditor'
import { employeesApi } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'

// There is no Roles module on the backend anymore (see src/data/auth.js) —
// an account's access is exactly the flat list of permission codes granted
// directly to it. This page used to list roles; it's now the
// permission-catalog / per-employee permission editor: pick an employee on
// the left, edit their granted codes on the right via the shared
// PermissionsEditor (also used from Employees.jsx as a quick per-row modal).
export default function Roles() {
  const { currentUser } = useAuth()
  const { data, loading, error, reload } = useFetch(() => employeesApi.list(), [])
  const rows = useMemo(() => {
    const list = Array.isArray(data) ? data : data?.items ?? []
    // Editing your own permissions here would be rejected by the backend
    // (a Firm Admin can't change their own grants via this endpoint), and a
    // Firm Admin isn't listed as an "employee" to begin with — filtered
    // defensively in case the roster ever includes the caller's own account.
    return list.filter((r) => r.user?.id !== currentUser?.id)
  }, [data, currentUser])

  const [selectedId, setSelectedId] = useState(null)
  const [savedMessage, setSavedMessage] = useState(null)

  const selectedEmployee = rows.find((r) => r.id === selectedId) ?? null

  function handleSelect(employee) {
    setSavedMessage(null)
    setSelectedId(employee.id)
  }

  return (
    <div>
      <PageHeader title="الصلاحيات" breadcrumb={[{ label: 'الموظفين', to: '/employees' }, { label: 'الصلاحيات' }]} />

      {loading && <LoadingBlock label="جاري تحميل الموظفين..." />}
      {error && <ErrorBlock error={error} onRetry={reload} />}

      {!loading &&
        !error &&
        (rows.length ? (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
            <div className="bg-white rounded-xl border border-paper-line shadow-card overflow-hidden">
              {rows.map((r) => {
                const name = r.user?.fullName || r.user?.email
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelect(r)}
                    className={`w-full flex items-center gap-2 px-4 py-3 text-sm text-right border-b border-paper-line last:border-0 transition-colors ${
                      selectedId === r.id ? 'bg-brass-100/60 text-brass-800' : 'hover:bg-paper-soft text-ink-700'
                    }`}
                  >
                    <Avatar name={name} size="sm" />
                    <span className="flex-1 truncate">{name}</span>
                  </button>
                )
              })}
            </div>

            <div className="bg-white rounded-xl border border-paper-line shadow-card p-5">
              {!selectedEmployee ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-ink-400">
                  <ShieldCheck size={36} className="text-ink-300 mb-3" />
                  <p>اختر موظفاً من القائمة لعرض وتعديل صلاحياته</p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <h3 className="text-base font-semibold text-ink-800">
                      صلاحيات {selectedEmployee.user?.fullName || selectedEmployee.user?.email}
                    </h3>
                    <p className="text-xs text-ink-400 mt-0.5">حدد ما يمكن لهذا الحساب فعله داخل مكتبك</p>
                  </div>
                  {savedMessage && <p className="text-sm text-emerald-600 mb-4">{savedMessage}</p>}
                  <PermissionsEditor
                    key={selectedEmployee.id}
                    employee={selectedEmployee}
                    onSaved={() => setSavedMessage('تم حفظ الصلاحيات بنجاح')}
                  />
                </>
              )}
            </div>
          </div>
        ) : (
          <EmptyState message="لا يوجد موظفون لعرض صلاحياتهم" />
        ))}
    </div>
  )
}
