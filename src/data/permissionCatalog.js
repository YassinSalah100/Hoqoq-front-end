// Arabic labels/grouping for the grantable permission catalog
// (GET /permissions -> { codes: string[] }, see
// hoqoq backend/Hoqooq/src/core/constants/permissions.constant.ts). There is
// no Roles module anymore (see src/data/auth.js) — every code here is an
// atomic grant that can be attached directly to an employee's account via
// employeesApi.setPermissions. This file is display-only sugar so the
// permission editor doesn't just render bare dotted codes; it is shared by
// src/components/hr/PermissionsEditor.jsx (used from both Roles.jsx and
// Employees.jsx) and the employee-onboarding form.

const GROUP_LABELS = {
  case: 'القضايا',
  hearing: 'الجلسات',
  service: 'إعلانات التبليغ',
  meeting: 'الاجتماعات',
  document: 'المستندات',
  task: 'المهام',
  client: 'الموكلين',
  opponent: 'الخصوم',
  calendar: 'التقويم',
  finance: 'المالية',
  employee: 'الموظفين',
  notification: 'الإشعارات',
  report: 'التقارير',
  dashboard: 'لوحة التحكم',
  firm: 'إعدادات المكتب',
  reference: 'البيانات المرجعية',
  audit: 'سجل التدقيق',
  platform: 'صلاحيات المنصة',
  system: 'صلاحيات النظام',
}

// Hand-authored labels for every non-platform/non-system code currently
// defined in permissions.constant.ts. Codes that show up but aren't listed
// here (future additions, or platform./system. codes when the catalog is
// fetched by a Super Admin) fall back to fallbackLabel() below.
const CODE_LABELS = {
  'case.create': 'إضافة قضية',
  'case.view': 'عرض القضية',
  'case.edit': 'تعديل القضية',
  'case.status.manage': 'تغيير حالة القضية',
  'case.access.manage': 'إدارة صلاحيات الفريق على القضية',
  'hearing.create': 'إضافة جلسات',
  'hearing.view': 'عرض الجلسات',
  'hearing.edit': 'تعديل الجلسات',
  'hearing.complete': 'إنهاء الجلسات',
  'hearing.assign': 'إسناد الجلسات',
  'service.create': 'إضافة تبليغ',
  'service.view': 'عرض إعلانات التبليغ',
  'service.edit': 'تعديل التبليغ',
  'service.assign': 'إسناد التبليغ',
  'service.complete': 'إنهاء التبليغ',
  'meeting.create': 'إضافة اجتماع',
  'meeting.view': 'عرض الاجتماعات',
  'meeting.edit': 'تعديل الاجتماع',
  'meeting.assign': 'إسناد الاجتماع',
  'meeting.complete': 'إنهاء الاجتماع',
  'document.upload': 'رفع مستندات',
  'document.view': 'عرض المستندات',
  'document.download': 'تحميل المستندات',
  'document.edit': 'تعديل المستندات',
  'document.manage': 'إدارة المستندات',
  'task.create': 'إضافة مهام',
  'task.view': 'عرض المهام',
  'task.update': 'تحديث المهام',
  'task.complete': 'إنهاء المهام',
  'task.assign': 'إسناد المهام',
  'client.edit': 'تعديل بيانات الموكل',
  'client.view': 'عرض بيانات الموكل',
  'opponent.edit': 'تعديل بيانات الخصم',
  'opponent.view': 'عرض بيانات الخصم',
  'calendar.manage': 'إدارة التقويم',
  'calendar.read': 'عرض التقويم',
  'finance.payment.record': 'تسجيل دفعات',
  'finance.firm.read': 'عرض البيانات المالية للمكتب',
  'finance.manage': 'إدارة الشؤون المالية',
  'finance.case.view': 'عرض البيانات المالية للقضية',
  'employee.create': 'إضافة موظفين',
  'employee.read': 'عرض الموظفين',
  'employee.edit': 'تعديل بيانات الموظفين',
  'employee.status.manage': 'حذف / تعطيل الموظفين',
  'employee.permission.manage': 'إدارة صلاحيات الموظفين',
  'notification.read': 'عرض الإشعارات',
  'report.operational.read': 'عرض التقارير',
  'dashboard.read': 'عرض لوحة التحكم',
  'firm.profile.manage': 'تعديل بيانات المكتب',
  'firm.profile.read': 'عرض بيانات المكتب',
  'reference.read': 'عرض البيانات المرجعية',
  'audit.read': 'عرض سجل التدقيق',
}

function fallbackLabel(code) {
  const parts = code.split('.')
  const group = GROUP_LABELS[parts[0]] ?? parts[0]
  return `${group} — ${parts.slice(1).join(' ')}`
}

export function permissionLabel(code) {
  return CODE_LABELS[code] ?? fallbackLabel(code)
}

export function permissionGroupLabel(code) {
  return GROUP_LABELS[code.split('.')[0]] ?? code.split('.')[0]
}

// Groups + sorts a flat code list for a two-column checkbox layout, e.g.
// [{ group: 'case', groupLabel: 'القضايا', items: [{ code, label }] }, ...]
export function groupPermissionCodes(codes) {
  const map = {}
  ;(codes ?? []).forEach((code) => {
    const group = code.split('.')[0]
    map[group] = map[group] ?? []
    map[group].push({ code, label: permissionLabel(code) })
  })
  return Object.entries(map)
    .map(([group, items]) => ({
      group,
      groupLabel: GROUP_LABELS[group] ?? group,
      items: items.sort((a, b) => a.label.localeCompare(b.label, 'ar')),
    }))
    .sort((a, b) => a.groupLabel.localeCompare(b.groupLabel, 'ar'))
}
