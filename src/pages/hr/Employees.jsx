import { useMemo, useState } from 'react'
import { Plus, UserX, KeyRound } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import DataTable from '../../components/ui/DataTable'
import Avatar from '../../components/ui/Avatar'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import { LoadingBlock, ErrorBlock } from '../../components/ui/AsyncState'
import FormModal from '../../components/ui/FormModal'
import { EMPLOYEE_POSITION, EMPLOYEE_DEPARTMENT, JOB_CLASSIFICATION } from '../../data/enums'
import { employeesApi, referenceApi } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { isFirmAdmin, hasPermission } from '../../data/auth'
import { isStrongPassword, PASSWORD_RULE_HINT, WEAK_PASSWORD_MESSAGE } from '../../lib/passwordPolicy'

export default function Employees() {
  const { currentUser } = useAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [credentialsFor, setCredentialsFor] = useState(null)
  const canCreate = hasPermission(currentUser, 'employee.create')
  // BR-011 / BR-033: deactivation and credential resets are Firm-Admin-only.
  const firmAdmin = isFirmAdmin(currentUser)
  const { data, loading, error, reload } = useFetch(() => employeesApi.list(), [])
  const { data: caseTypes } = useFetch(() => referenceApi.caseTypes(), [])
  const rows = useMemo(() => (Array.isArray(data) ? data : data?.items ?? []), [data])
  const caseTypeLabel = useMemo(() => Object.fromEntries((caseTypes ?? []).map((t) => [t.id, t.labelAr])), [caseTypes])

  // Employees are never deleted (BR-012) — DELETE /employees/:id deactivates
  // the account and revokes its sessions, and is blocked while the employee
  // still owns cases or open tasks (BR-011).
  async function handleDeactivate(employee) {
    const name = employee.user?.fullName || employee.user?.email
    if (!confirm(`هل تريد إيقاف حساب ${name}؟ لن يتمكن من الدخول إلى النظام، مع الاحتفاظ بكل سجلاته.`)) return
    try {
      await employeesApi.remove(employee.id)
      reload()
    } catch (err) {
      const open = /open assignments: (\d+) primary Case\(s\), (\d+) Task\(s\)/.exec(err.message ?? '')
      alert(
        open
          ? `لا يمكن إيقاف الموظف قبل نقل مسؤولياته: ${open[1]} قضية يتولاها و${open[2]} مهمة مفتوحة.`
          : err.message ?? 'تعذر إيقاف الموظف'
      )
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
    { name: 'password', label: `كلمة المرور (${PASSWORD_RULE_HINT})`, type: 'password', required: true },
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
            {firmAdmin && (
              <button
                onClick={() => setCredentialsFor(r)}
                title="تعيين كلمة مرور جديدة"
                className="text-ink-300 hover:text-brass-600 p-1 rounded-lg hover:bg-brass-100"
              >
                <KeyRound size={14} />
              </button>
            )}
            {firmAdmin && (
              <button
                onClick={() => handleDeactivate(r)}
                title="إيقاف الحساب"
                className="text-ink-300 hover:text-rust-600 p-1 rounded-lg hover:bg-rust-100"
              >
                <UserX size={14} />
              </button>
            )}
          </span>
        ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="الموظفين"
        actions={
          canCreate && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={14} />
              إضافة موظف
            </Button>
          )
        }
      />

      {/* `key` gives each employee a fresh form so a typed password never
          carries over to the next one. */}
      <FormModal
        key={credentialsFor?.id ?? 'none'}
        open={Boolean(credentialsFor)}
        onClose={() => setCredentialsFor(null)}
        title={`كلمة مرور جديدة — ${credentialsFor?.user?.fullName ?? credentialsFor?.user?.email ?? ''}`}
        submitLabel="حفظ كلمة المرور"
        fields={[{ name: 'password', label: `كلمة المرور الجديدة (${PASSWORD_RULE_HINT})`, type: 'password', required: true }]}
        onSubmit={async (values) => {
          if (!isStrongPassword(values.password)) throw new Error(WEAK_PASSWORD_MESSAGE)
          await employeesApi.setCredentials(credentialsFor.id, values.password)
          alert('تم تعيين كلمة المرور الجديدة وتم تسجيل خروج الموظف من جميع الأجهزة. أبلغه بها بشكل آمن.')
        }}
      />

      <FormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="إضافة موظف"
        fields={createFields}
        onSubmit={async (values) => {
          if (!isStrongPassword(values.password)) throw new Error(WEAK_PASSWORD_MESSAGE)
          const payload = {
            email: values.email,
            password: values.password,
            fullName: values.fullName,
            jobClassification: values.jobClassification,
            hireDate: values.hireDate,
            // Account permissions are managed only on the الأدوار page.
            permissionKeys: [],
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


      {loading && <LoadingBlock label="جاري تحميل الموظفين..." />}
      {error && <ErrorBlock error={error} onRetry={reload} />}
      {!loading && !error && (rows.length ? (
        <DataTable columns={columns} data={rows} />
      ) : (
        <EmptyState
          message="لا يوجد موظفون حتى الآن"
          actionLabel={canCreate ? 'إضافة موظف' : undefined}
          onAction={canCreate ? () => setShowCreate(true) : undefined}
        />
      ))}
    </div>
  )
}
