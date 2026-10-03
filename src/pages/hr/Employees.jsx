import { useMemo, useState } from 'react'
import { Plus, Trash2, ShieldCheck } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import DataTable from '../../components/ui/DataTable'
import Avatar from '../../components/ui/Avatar'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import { LoadingBlock, ErrorBlock } from '../../components/ui/AsyncState'
import FormModal from '../../components/ui/FormModal'
import PermissionsEditor from '../../components/hr/PermissionsEditor'
import { EMPLOYEE_POSITION, EMPLOYEE_DEPARTMENT, JOB_CLASSIFICATION } from '../../data/enums'
import { groupPermissionCodes } from '../../data/permissionCatalog'
import { employeesApi, permissionsApi, referenceApi } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'

// Wraps the shared permission editor (also used as the dedicated page at
// /roles) in a modal for the quick per-row "edit permissions" action here —
// keeps the catalog-fetch-and-render logic in one place instead of
// duplicating it between the two entry points.
function PermissionsModal({ employee, onClose }) {
  if (!employee) return null
  const name = employee.user?.fullName || employee.user?.email
  return (
    <Modal open={Boolean(employee)} onClose={onClose} title={`صلاحيات ${name}`} size="lg">
      <PermissionsEditor employee={employee} onSaved={onClose} onCancel={onClose} />
    </Modal>
  )
}

export default function Employees() {
  const { currentUser } = useAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [permissionsFor, setPermissionsFor] = useState(null)
  const { data, loading, error, reload } = useFetch(() => employeesApi.list(), [])
  const { data: catalog } = useFetch(() => permissionsApi.catalog(), [])
  const { data: caseTypes } = useFetch(() => referenceApi.caseTypes(), [])
  const rows = useMemo(() => (Array.isArray(data) ? data : data?.items ?? []), [data])
  const caseTypeLabel = useMemo(() => Object.fromEntries((caseTypes ?? []).map((t) => [t.id, t.labelAr])), [caseTypes])
  const permissionGroups = useMemo(
    () => groupPermissionCodes(catalog?.codes ?? []).map((g) => ({ label: g.groupLabel, options: g.items.map((i) => ({ value: i.code, label: i.label })) })),
    [catalog],
  )

  async function handleDelete(employee) {
    const name = employee.user?.fullName || employee.user?.email
    if (!confirm(`هل أنت متأكد من حذف حساب ${name}؟ لن يتمكن من الدخول إلى النظام بعد الحذف.`)) return
    try {
      await employeesApi.remove(employee.id)
      reload()
    } catch (err) {
      alert(err.message ?? 'تعذر حذف الموظف')
    }
  }

  // OnboardEmployeeDto: email, password (set by the Firm Admin and shared
  // out of band — there's no invitation email for employees anymore),
  // fullName, jobClassification, hireDate, permissionKeys (required, may be
  // empty); phone, department (optional). A Lawyer or Trainee Lawyer gets
  // exactly ONE Case Type specialization, or GENERAL (every type) — never
  // several, unlike the old multi-select — so it only appears once one of
  // those classifications is picked instead of always showing with a
  // footnote explaining it might not apply.
  const GENERAL_SPECIALIZATION = 'GENERAL'
  const requiresSpecialization = (values) => values.jobClassification === 'LAWYER' || values.jobClassification === 'TRAINEE_LAWYER'
  const createFields = [
    { name: 'fullName', label: 'الاسم الكامل', required: true },
    { name: 'email', label: 'البريد الإلكتروني', type: 'email', required: true },
    { name: 'password', label: 'كلمة المرور المؤقتة (8+ حروف، تحتوي حرف كبير وصغير ورقم ورمز)', type: 'password', required: true },
    { name: 'phone', label: 'رقم الجوال' },
    {
      name: 'jobClassification',
      label: 'التصنيف الوظيفي',
      type: 'select',
      required: true,
      options: Object.entries(JOB_CLASSIFICATION).map(([value, label]) => ({ value, label })),
    },
    { name: 'department', label: 'القسم', type: 'select', options: Object.entries(EMPLOYEE_DEPARTMENT).map(([value, label]) => ({ value, label })) },
    { name: 'hireDate', label: 'تاريخ الانضمام', type: 'date', required: true },
    {
      name: 'specializationId',
      label: 'التخصص',
      type: 'select',
      required: true,
      options: [{ value: GENERAL_SPECIALIZATION, label: 'عام (جميع أنواع القضايا)' }, ...(caseTypes ?? []).map((t) => ({ value: t.id, label: t.labelAr }))],
      visibleWhen: requiresSpecialization,
    },
    {
      name: 'permissionKeys',
      label: 'الصلاحيات الممنوحة لهذا الحساب',
      type: 'grouped-checkboxes',
      groups: permissionGroups,
    },
  ]

  const columns = [
    {
      key: 'name',
      header: 'الاسم',
      sortable: false,
      render: (r) => {
        const name = r.user?.fullName ?? ''
        return (
          <span className="flex items-center gap-2">
            <Avatar name={name} size="sm" />
            {name}
          </span>
        )
      },
    },
    { key: 'position', header: 'الوظيفة', sortable: false, render: (r) => EMPLOYEE_POSITION[r.position] ?? r.position },
    { key: 'department', header: 'القسم', sortable: false, render: (r) => EMPLOYEE_DEPARTMENT[r.department] ?? r.department ?? '—' },
    {
      key: 'specialization',
      header: 'التخصص',
      sortable: false,
      render: (r) =>
        r.isGeneralSpecialization ? (
          <span className="text-[10px] bg-brass-100 text-brass-700 px-2 py-0.5 rounded-full">عام</span>
        ) : r.specializationId ? (
          <span className="text-[10px] bg-brass-100 text-brass-700 px-2 py-0.5 rounded-full">
            {caseTypeLabel[r.specializationId] ?? r.specializationId}
          </span>
        ) : (
          <span className="text-ink-300">بدون تخصص</span>
        ),
    },
    { key: 'email', header: 'البريد الإلكتروني', sortable: false, render: (r) => <span className="font-mono text-xs">{r.user?.email}</span> },
    {
      key: 'hireDate',
      header: 'تاريخ الانضمام',
      sortable: false,
      render: (r) => <span className="font-mono text-xs">{(r.hireDate ?? '').toString().slice(0, 10)}</span>,
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      // Deleting/editing your own account here would lock you out of your own firm.
      render: (r) =>
        r.user?.id === currentUser?.id ? (
          <span className="text-[10px] text-ink-300">حسابك</span>
        ) : (
          <span className="flex items-center gap-1">
            <button
              onClick={() => setPermissionsFor(r)}
              title="الصلاحيات"
              className="text-ink-300 hover:text-brass-600 p-1 rounded-lg hover:bg-brass-100"
            >
              <ShieldCheck size={14} />
            </button>
            <button
              onClick={() => handleDelete(r)}
              title="حذف"
              className="text-ink-300 hover:text-rust-600 p-1 rounded-lg hover:bg-rust-100"
            >
              <Trash2 size={14} />
            </button>
          </span>
        ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="الموظفين"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={14} />
            إضافة موظف
          </Button>
        }
      />

      <FormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="إضافة موظف"
        fields={createFields}
        onSubmit={async (values) => {
          const payload = {
            email: values.email,
            password: values.password,
            fullName: values.fullName,
            jobClassification: values.jobClassification,
            hireDate: values.hireDate,
            permissionKeys: values.permissionKeys ?? [],
          }
          if (values.phone) payload.phone = values.phone
          if (values.department) payload.department = values.department
          if (requiresSpecialization(values)) {
            if (values.specializationId === GENERAL_SPECIALIZATION) payload.generalSpecialization = true
            else if (values.specializationId) payload.specializationId = values.specializationId
          }
          await employeesApi.onboard(payload)
          reload()
        }}
      />

      {permissionsFor && <PermissionsModal employee={permissionsFor} onClose={() => setPermissionsFor(null)} />}

      {loading && <LoadingBlock label="جاري تحميل الموظفين..." />}
      {error && <ErrorBlock error={error} onRetry={reload} />}
      {!loading && !error && (rows.length ? (
        <DataTable columns={columns} data={rows} />
      ) : (
        <EmptyState message="لا يوجد موظفون حتى الآن" actionLabel="إضافة موظف" onAction={() => setShowCreate(true)} />
      ))}
    </div>
  )
}
