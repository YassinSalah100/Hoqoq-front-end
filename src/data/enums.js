// Arabic labels + badge styles for every enum the real backend returns.
// Source of truth: `swagger.json` / live `/api/docs-json` plus the backend
// source under `hoqoq backend/Hoqooq/src` (several DTOs are richer than what
// Swagger documents — see BACKEND_API_CONTRACT.md for why). Re-verify this
// file against the backend any time these enums might have moved again.

export const CASE_STATUS = {
  DRAFT: { label: 'مسودة', bg: 'bg-paper-soft', text: 'text-ink-400' },
  ACTIVE: { label: 'نشطة', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  ON_HOLD: { label: 'معلّقة', bg: 'bg-brass-100', text: 'text-brass-700' },
  CLOSED: { label: 'مغلقة', bg: 'bg-ink-100', text: 'text-ink-600' },
  ARCHIVED: { label: 'مؤرشفة', bg: 'bg-paper-soft', text: 'text-ink-400' },
}

// Case no longer has a priority field at all (backend dropped cases.priority
// as dead MVP weight — see RemoveDuplicateMvpFields migration). Only Task
// keeps its own, with a different value set (MEDIUM, not NORMAL) — see
// TASK_PRIORITY below.

// Case type is not a static enum — it's global reference data fetched via
// referenceApi.caseTypes(); see Cases.jsx.

export const HEARING_STATUS = {
  SCHEDULED: { label: 'مجدولة', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  COMPLETED: { label: 'منتهية', bg: 'bg-ink-100', text: 'text-ink-600' },
  POSTPONED: { label: 'مؤجلة', bg: 'bg-brass-100', text: 'text-brass-700' },
  CANCELLED: { label: 'ملغاة', bg: 'bg-rust-100', text: 'text-rust-600' },
  MISSED: { label: 'فائتة', bg: 'bg-rust-100', text: 'text-rust-700' },
}

// Task.status (backend TaskStatus enum) — 4 values: TODO/IN_PROGRESS/
// COMPLETED/CANCELLED. "TODO" replaces the old "NEW", and "WAITING" was
// dropped entirely.
export const TASK_STATUS = {
  TODO: { label: 'قيد الانتظار', bg: 'bg-ink-100', text: 'text-ink-600' },
  IN_PROGRESS: { label: 'قيد التنفيذ', bg: 'bg-brass-100', text: 'text-brass-700' },
  COMPLETED: { label: 'مكتملة', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  CANCELLED: { label: 'ملغاة', bg: 'bg-rust-100', text: 'text-rust-600' },
}
export const TASK_STATUS_COLUMNS = ['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

// Task.priority (backend TaskPriority enum) — LOW/MEDIUM/HIGH/URGENT.
// "MEDIUM" replaces the old "NORMAL".
export const TASK_PRIORITY = {
  LOW: { label: 'منخفضة', bg: 'bg-ink-50', text: 'text-ink-500', dot: 'bg-ink-300' },
  MEDIUM: { label: 'متوسطة', bg: 'bg-brass-100', text: 'text-brass-700', dot: 'bg-brass-500' },
  HIGH: { label: 'عالية', bg: 'bg-rust-100', text: 'text-rust-600', dot: 'bg-rust-500' },
  URGENT: { label: 'عاجلة', bg: 'bg-rust-100', text: 'text-rust-700', dot: 'bg-rust-600' },
}

// Case finance status — derived client-side by financeApi.summary() per case
// row (paid <= 0 ? 'UNPAID' : remaining > 0 ? 'PARTIAL' : 'PAID'). There is
// no standalone Invoice model anymore; this replaces the old INVOICE_STATUS.
export const CASE_FINANCE_STATUS = {
  UNPAID: { label: 'غير مسددة', bg: 'bg-rust-100', text: 'text-rust-600' },
  PARTIAL: { label: 'مسددة جزئياً', bg: 'bg-brass-100', text: 'text-brass-700' },
  PAID: { label: 'مسددة بالكامل', bg: 'bg-emerald-100', text: 'text-emerald-700' },
}

// CasePayment.method (backend PaymentMethod enum, PRD §7.12) — manual
// labels for payments made outside HOQOOQ.
export const PAYMENT_METHOD = {
  CASH: 'نقداً',
  BANK_TRANSFER: 'تحويل بنكي',
  CARD: 'بطاقة',
  WALLET: 'محفظة إلكترونية',
  CHEQUE: 'شيك',
  OTHER: 'أخرى',
}

// CaseClient.clientType / CaseOpponentSnapshot.opponentType (both use the
// backend CasePartyType enum).
export const PARTY_TYPE = {
  INDIVIDUAL: 'فرد',
  COMPANY: 'شركة',
  GOVERNMENT_ENTITY: 'جهة حكومية',
}

// A Case can carry several Clients (CaseClient rows); exactly one is
// PRIMARY_CLIENT (PRD §6.1). Falls back to the first if none is flagged.
export function primaryClientOf(caseItem) {
  const clients = caseItem?.clients ?? []
  return clients.find((c) => c.isPrimary) ?? clients[0] ?? null
}

// CaseCapability (backend enum) — the atomic grants a Case's access-grant
// can carry. Replaces the old 4-value CaseAccessLevel/ACCESS_LEVEL_LABELS
// model: access is now a set of these codes per user per case, not a single
// tier. Grouped here for checkbox UI; keys match `capabilities[]` sent to
// casesApi.setAccess() exactly.
export const CASE_CAPABILITIES = {
  'case.view': 'عرض القضية',
  'case.edit': 'تعديل القضية',
  'case.status.manage': 'تغيير حالة القضية',
  'case.access.manage': 'إدارة صلاحيات الفريق',
  'client.view': 'عرض بيانات الموكل',
  'client.edit': 'تعديل بيانات الموكل',
  'opponent.view': 'عرض بيانات الخصم',
  'opponent.edit': 'تعديل بيانات الخصم',
  'document.view': 'عرض المستندات',
  'document.download': 'تحميل المستندات',
  'document.upload': 'رفع مستندات',
  'document.edit': 'تعديل المستندات',
  'document.manage': 'إدارة المستندات',
  'hearing.view': 'عرض الجلسات',
  'hearing.create': 'إضافة جلسات',
  'hearing.edit': 'تعديل الجلسات',
  'hearing.assign': 'إسناد الجلسات',
  'hearing.complete': 'إنهاء الجلسات',
  'service.view': 'عرض إعلانات التبليغ',
  'service.create': 'إضافة تبليغ',
  'service.edit': 'تعديل التبليغ',
  'service.assign': 'إسناد التبليغ',
  'service.complete': 'إنهاء التبليغ',
  'task.view': 'عرض المهام',
  'task.create': 'إضافة مهام',
  'task.assign': 'إسناد المهام',
  'task.update': 'تحديث المهام',
  'task.complete': 'إنهاء المهام',
  'finance.view': 'عرض البيانات المالية',
  'finance.payment.record': 'تسجيل دفعات',
  'finance.manage': 'إدارة الشؤون المالية',
}

const CAPABILITY_GROUP_LABELS = {
  case: 'القضية',
  client: 'الموكل',
  opponent: 'الخصم',
  document: 'المستندات',
  hearing: 'الجلسات',
  service: 'إعلانات التبليغ',
  task: 'المهام',
  finance: 'المالية',
}

// Groups CASE_CAPABILITIES by its dot-prefix for a scannable checkbox grid —
// same shape as permissionCatalog.js's groupPermissionCodes, used by
// FormModal's 'grouped-checkboxes' field type. A flat 33-item wall of pills
// (the previous rendering) was hard to scan when granting per-case access.
// Account permission that backs each case capability (mirrors the backend's
// CAPABILITY_BASE_PERMISSION) — document.edit is covered by document.manage.
export function basePermissionForCapability(code) {
  return code === 'document.edit' ? 'document.manage' : code
}

// `accountPermissions` (optional): only offer capabilities the employee holds
// on their account — a case grant can't add access (PRD BR-002).
export function groupCaseCapabilities(accountPermissions) {
  const allowed = accountPermissions ? new Set(accountPermissions) : null
  const map = {}
  Object.entries(CASE_CAPABILITIES).forEach(([code, label]) => {
    if (code.startsWith('finance.')) return // managed from the Finance module
    if (allowed && !allowed.has(basePermissionForCapability(code))) return
    const group = code.split('.')[0]
    map[group] = map[group] ?? []
    map[group].push({ value: code, label })
  })
  return Object.entries(map)
    .map(([group, options]) => ({ label: CAPABILITY_GROUP_LABELS[group] ?? group, options }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ar'))
}

// Summarizes a *granted* set of capability codes (a case team member's
// `roleOnCase`, split on commas) into one badge per category with a count —
// e.g. "الجلسات · 3" — instead of one pill per raw code. A member with
// access across 6+ categories previously rendered as a wall of a dozen-plus
// tiny badges; this reads as a handful of clean, scannable ones instead.
export function summarizeGrantedCapabilities(codes) {
  const counts = {}
  ;(codes ?? []).forEach((code) => {
    const group = code.split('.')[0]
    counts[group] = (counts[group] ?? 0) + 1
  })
  return Object.entries(counts)
    .map(([group, count]) => ({ label: CAPABILITY_GROUP_LABELS[group] ?? group, count }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ar'))
}

export const EMPLOYEE_POSITION = {
  MANAGING_PARTNER: 'شريك مدير',
  PARTNER: 'شريك',
  SENIOR_ASSOCIATE: 'محامي أول',
  ASSOCIATE: 'محامي',
  JUNIOR_LAWYER: 'محامي مبتدئ',
  PARALEGAL: 'مساعد قانوني',
  LEGAL_ASSISTANT: 'مساعد قانوني',
  LEGAL_RESEARCHER: 'باحث قانوني',
  SECRETARY: 'سكرتير',
  ACCOUNTANT: 'محاسب',
  HR_MANAGER: 'مدير موارد بشرية',
  IT_SUPPORT: 'دعم تقني',
  GENERAL_MANAGER: 'مدير عام',
}

export const EMPLOYEE_DEPARTMENT = {
  LITIGATION: 'التقاضي',
  CORPORATE: 'الشركات',
  REAL_ESTATE: 'العقارات',
  INTELLECTUAL_PROPERTY: 'الملكية الفكرية',
  FAMILY_LAW: 'الأحوال الشخصية',
  CRIMINAL_LAW: 'الجنائي',
  FINANCE: 'المالية',
  HR: 'الموارد البشرية',
  ADMINISTRATION: 'الإدارة',
  GENERAL: 'عام',
}

// User.jobClassification (backend JobClassification enum) — profile data
// only, grants no permissions on its own. Required on OnboardEmployeeDto /
// ProvisionTenantDto.adminJobClassification.
export const JOB_CLASSIFICATION = {
  LAWYER: 'محامي',
  TRAINEE_LAWYER: 'محامي متدرب',
  SECRETARY: 'سكرتير',
  ACCOUNTANT: 'محاسب',
  ASSISTANT: 'مساعد',
  LEGAL_RESEARCHER: 'باحث قانوني',
  OFFICE_MANAGER: 'مدير المكتب',
  OTHER: 'أخرى',
}

// User.status (backend UserStatus enum). INVITED accounts haven't completed
// activation yet; usersApi.updateStatus only allows toggling ACTIVE/INACTIVE.
export const USER_STATUS = {
  INVITED: { label: 'في انتظار التفعيل', bg: 'bg-paper-soft', text: 'text-ink-400' },
  ACTIVE: { label: 'نشط', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  INACTIVE: { label: 'موقوف', bg: 'bg-rust-100', text: 'text-rust-600' },
}

// User.accountType (backend AccountType enum).
export const ACCOUNT_TYPE = {
  SUPER_ADMIN: 'مشرف المنصة',
  FIRM_ADMIN: 'مدير المكتب',
  EMPLOYEE: 'موظف',
}

// Tenant.status (backend TenantStatus enum) — also ChangeTenantStatusDto /
// ChangeUserStatusDto's `status` value set.
export const TENANT_STATUS = {
  ACTIVE: { label: 'نشط', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  INACTIVE: { label: 'موقوف', bg: 'bg-rust-100', text: 'text-rust-600' },
}

// GET /calendar/timeline item `type` (see CalendarService.getTimeline —
// hand-built, not a documented DTO). Distinct from CalendarEvent.eventType
// below, which only covers the `/calendar` CRUD resource itself.
export const TIMELINE_ITEM_TYPE = {
  CUSTOM: 'bg-brass-500',
  HEARING: 'bg-emerald-500',
  SERVICE: 'bg-ink-500',
  MEETING: 'bg-rust-500',
  TASK: 'bg-ink-400',
}

// CalendarEvent.eventType (backend CalendarEventType enum) — the frontend
// only ever creates CUSTOM events (see CalendarService.create/update, which
// hardcode it); HEARING/TASK_DEADLINE are system-generated markers.
export const EVENT_TYPE = {
  HEARING: 'جلسة',
  TASK_DEADLINE: 'موعد نهائي لمهمة',
  CUSTOM: 'أخرى',
}

export const NOTIFICATION_TYPE = {
  HEARING_REMINDER: 'تذكير بجلسة',
  TASK_ASSIGNED: 'مهمة مسندة',
  INVOICE_DUE: 'دفعة مستحقة',
  SYSTEM_ALERT: 'تنبيه من النظام',
}

export function labelOf(map, key, fallback = key) {
  return map[key] ?? fallback
}
