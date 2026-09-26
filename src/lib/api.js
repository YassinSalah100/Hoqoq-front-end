// Base URL is configurable via VITE_API_BASE_URL (see .env / .env.example).
// Default matches docker-compose.yml's `api` service (PORT=3006, mapped
// 3006:3006) — that's the port the backend actually listens on when you run
// `docker compose up`. Local non-docker `npm run start:dev` uses the
// backend's .env PORT=3000 instead; override VITE_API_BASE_URL if you're
// running that way.
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3006/api'
export const SERVER_ORIGIN = API_BASE.replace(/\/api\/?$/, '')

// Uploaded files (firm logos, etc.) are served as plain static assets under
// the bare server origin, not under /api — logoUrl comes back as a relative
// path like "/uploads/tenants/logo-xxx.png".
export function resolveAssetUrl(path) {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path
  return `${SERVER_ORIGIN}${path}`
}

const STORAGE_KEY = 'hoqooq_session'

// Tokens must survive a page refresh — without this, every reload wipes the
// in-memory session and bounces the user back to /login even though their
// refresh token (and the backend session) is still perfectly valid.
function readStoredTokens() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
}

let { accessToken = null, refreshToken = null } = readStoredTokens()
let onUnauthorized = null

export function setTokens(tokens) {
  accessToken = tokens?.accessToken ?? null
  refreshToken = tokens?.refreshToken ?? null
  if (accessToken && refreshToken) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken, refreshToken }))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function getAccessToken() {
  return accessToken
}

export function hasStoredSession() {
  return Boolean(accessToken && refreshToken)
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message)
    this.status = status
    this.payload = payload
  }
}

// /auth/refresh rotates the refresh token server-side — it deletes the old
// session row and issues a brand new refresh token, single-use (see
// IdentityService.refresh). A page like the cases list fires half a dozen
// useFetch calls in parallel on mount; if the access token happens to be
// expired at that moment, every one of them independently hits this 401
// branch. Without sharing one in-flight refresh, each of the 6 would fire
// its own POST /auth/refresh with the SAME (soon-to-be-invalidated) refresh
// token — the first one to land wins and rotates it, and the other 5 then
// get a genuine 401 from /auth/refresh itself, each triggering
// onUnauthorized() and logging the user out even though the session was
// perfectly fine a moment earlier. Deduping to a single shared promise means
// only one real refresh call ever goes out no matter how many requests hit
// the 401 at once; everyone else just awaits that same result.
let refreshPromise = null

function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = request('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      skipAuthRetry: true,
    })
      .then((refreshed) => {
        setTokens({
          accessToken: refreshed.accessToken ?? refreshed.data?.accessToken,
          refreshToken: refreshed.refreshToken ?? refreshed.data?.refreshToken ?? refreshToken,
        })
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

async function request(path, { method = 'GET', body, headers, isForm, skipAuthRetry } = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`

  const finalHeaders = { ...headers }
  if (!isForm && body !== undefined) finalHeaders['Content-Type'] = 'application/json'
  if (accessToken) finalHeaders.Authorization = `Bearer ${accessToken}`

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  })

  let payload = null
  const text = await res.text()
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (res.status === 401 && !skipAuthRetry && refreshToken && path !== '/auth/refresh') {
    try {
      await refreshAccessToken()
      return request(path, { method, body, headers, isForm, skipAuthRetry: true })
    } catch {
      onUnauthorized?.()
      throw new ApiError('انتهت صلاحية الجلسة، الرجاء تسجيل الدخول مجدداً', 401, payload)
    }
  }

  if (!res.ok || payload?.success === false) {
    if (res.status === 401) onUnauthorized?.()
    let message = payload?.message || `تعذر الاتصال بالخادم (${res.status})`
    if (Array.isArray(message)) message = message.join(' - ')
    if (res.status === 402) message = 'اشتراك المكتب غير مفعّل أو منتهي.'
    if (res.status === 403) message = 'غير مصرح لك بالوصول إلى هذا القسم.'
    if (res.status >= 500) message = 'حدث خطأ في الخادم، الرجاء المحاولة لاحقاً'
    throw new ApiError(message, res.status, payload)
  }

  return payload?.data ?? payload
}

const get = (path) => request(path)
const post = (path, body) => request(path, { method: 'POST', body })
const patch = (path, body) => request(path, { method: 'PATCH', body })
const put = (path, body) => request(path, { method: 'PUT', body })
const del = (path) => request(path, { method: 'DELETE' })

// ---- Auth ----
// Field names verified against the live backend (src/modules/identity):
// reset-password wants `newPassword`, change-password wants `oldPassword`/`newPassword`.
export const authApi = {
  // mfaCode is omitted (not sent as '') when blank — the backend's own
  // @IsOptional() only skips validation when the property is absent, and an
  // empty string fails its 6-digit @Matches() pattern.
  login: (email, password, mfaCode) => post('/auth/login', { email, password, ...(mfaCode ? { mfaCode } : {}) }),
  refresh: (token) => post('/auth/refresh', { refreshToken: token }),
  logout: () => post('/auth/logout'),
  forgotPassword: (email) => post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => post('/auth/reset-password', { token, newPassword }),
  changePassword: (oldPassword, newPassword) => post('/auth/change-password', { oldPassword, newPassword }),
  // One-time account activation (firm owners provisioned by the Super Admin,
  // employees onboarded by their firm) — replaces the old "set a password at
  // creation time" flow. `setup` returns an MFA secret + QR provisioning URI
  // whenever the account being activated is a Firm Admin (mfaRequired: true);
  // employees activate without it.
  activationSetup: (token) => post('/auth/activation/setup', { token }),
  activate: (token, newPassword, mfaCode) => post('/auth/activate', { token, newPassword, ...(mfaCode ? { mfaCode } : {}) }),
}

// ---- Users ----
// There is no generic user CRUD anymore — `POST /users` / `PATCH /users/:id`
// / `DELETE /users/:id` don't exist on this backend. Accounts are created
// through tenantsApi.provisionFirm (firm admins) or employeesApi.onboard
// (employees); the only per-account admin action left is status management.
export const usersApi = {
  list: () => get('/users'), // Super Admin only
  get: (id) => get(`/users/${id}`), // Super Admin only
  me: () => get('/users/me'),
  updateMe: (data) => patch('/users/me', data), // UpdateProfileDto: fullName, avatarUrl, phone, preferredLanguage, themePreference, showRevenueWidget
  updateStatus: (id, status) => patch(`/users/${id}/status`, { status }), // 'ACTIVE' | 'INACTIVE' — Super Admin only
  // Issues a fresh 24h activation link and re-sends it — only valid while
  // the account is still INVITED (400 otherwise). Super Admin only.
  resendActivation: (id) => post(`/users/${id}/resend-activation`),
}

// ---- Permissions (the atomic codes an admin can grant — there is no Roles module) ----
export const permissionsApi = {
  // Super Admin gets every active permission code; a Firm Admin gets exactly
  // the codes granted to their own account. Returns { codes: string[] }.
  catalog: () => get('/permissions'),
}

// ---- Tenants (firms) ----
// list/get/remove/status/firm-admin-permissions are System Admin scoped;
// my-firm is the firm's own view. There is no generic PATCH /tenants/:id —
// only PATCH /tenants/my-firm (self-service) and PATCH /tenants/:id/status.
export const tenantsApi = {
  // Atomic "create a named firm + its owner + a PENDING subscription" flow.
  // The owner is emailed a one-time activation link instead of a bootstrap
  // password. permissionKeys grants the owner's account its permission set
  // at creation time.
  provisionFirm: (data) => post('/tenants/provision', data),
  list: () => get('/tenants'),
  get: (id) => get(`/tenants/${id}`),
  remove: (id) => del(`/tenants/${id}`),
  updateStatus: (id, status) => patch(`/tenants/${id}/status`, { status }), // 'ACTIVE' | 'INACTIVE'
  setFirmAdminPermissions: (id, permissionKeys) => patch(`/tenants/${id}/firm-admin/permissions`, { permissionKeys }),
  getMyFirm: () => get('/tenants/my-firm'),
  updateMyFirm: (data) => patch('/tenants/my-firm', data), // UpdateTenantDto: name, address, contactEmail — nothing else
  uploadLogo: (formData) => request('/tenants/my-firm/logo', { method: 'POST', body: formData, isForm: true }),
  // `tenant.logoUrl` is an opaque internal storage key now (e.g.
  // "branding/tenants/<id>/logo-<hex>"), not a servable path — the only way
  // to actually get the image is these authenticated download endpoints.
  // Feed the returned URL through fetchAuthedImageUrl() (below), not
  // resolveAssetUrl() or a plain <img src>, since both require a Bearer
  // token an <img> tag can't send.
  myFirmLogoUrl: () => `${API_BASE}/tenants/my-firm/logo`,
  firmLogoUrl: (id) => `${API_BASE}/tenants/${id}/logo`, // Super Admin only
}

// ---- Subscriptions ----
export const subscriptionsApi = {
  listPlans: () => get('/subscriptions/plans'),
  activate: (tenantId) => post(`/subscriptions/${tenantId}/activate`),
  deactivate: (tenantId) => post(`/subscriptions/${tenantId}/deactivate`),
  change: (tenantId, { planId, billingCycle }) => patch(`/subscriptions/${tenantId}`, { planId, billingCycle }),
}

// ---- Judicial reference data (read-only; replaces the old Courts CRUD module) ----
export const referenceApi = {
  governorates: () => get('/reference/governorates'),
  courtsByGovernorate: (governorateId) => get(`/reference/governorates/${governorateId}/courts`),
  circuitsByCourt: (courtId) => get(`/reference/courts/${courtId}/circuits`),
  // Global, platform-wide case types — used both to pick a case's type and a
  // lawyer's specializations.
  caseTypes: (language) => get(`/reference/case-types${language ? `?language=${language}` : ''}`),
}

// ---- Lookups (tenant-scoped reference data: hearing types, document categories, service methods) ----
export const lookupsApi = {
  list: (kind) => get(`/lookups${kind ? `?kind=${kind}` : ''}`),
  enums: () => get('/lookups/enums'),
}

// ---- Notifications ----
export const notificationsApi = {
  me: () => get('/notifications/me'),
  daily: () => get('/notifications/daily'),
  markRead: (id) => patch(`/notifications/${id}/read`),
}

// ---- Employees ----
export const employeesApi = {
  // OnboardEmployeeDto: email, fullName, jobClassification, hireDate,
  // permissionKeys (required); phone, department, specializations (optional).
  onboard: (data) => post('/employees/onboard', data),
  list: (filters) => get(`/employees${filters ? `?${new URLSearchParams(filters)}` : ''}`),
  get: (id) => get(`/employees/${id}`),
  update: (id, data) => patch(`/employees/${id}`, data), // position, department, hireDate, specializations
  remove: (id) => del(`/employees/${id}`),
  getPermissions: (id) => get(`/employees/${id}/permissions`),
  setPermissions: (id, permissionKeys) => patch(`/employees/${id}/permissions`, { permissionKeys }),
}

// ---- Cases ----
// Clients and opponents are NOT separate resources anymore — they're
// immutable snapshots embedded at case-creation time (CreateCaseDto.client /
// .opponents). There's no clientsApi/opponentsApi and no way to edit them
// after creation. "Assignments" are gone too, replaced by a per-user
// capability grant on the case (access-grants).
export const casesApi = {
  create: (data) => post('/cases', data),
  list: () => get('/cases'),
  get: (id) => get(`/cases/${id}`),
  update: (id, data) => patch(`/cases/${id}`, data),
  remove: (id) => del(`/cases/${id}`), // archives the case (soft delete)
  changeStatus: (id, status) => patch(`/cases/${id}/status`, { status }),
  addNote: (id, content) => post(`/cases/${id}/notes`, { content }),
  // capabilities: string[] of CaseCapability codes (see data/enums.js CASE_CAPABILITIES).
  // Passing [] revokes everything for that user (mirrors the backend's own revoke route).
  setAccess: (id, userId, capabilities) => put(`/cases/${id}/access-grants/${userId}`, { capabilities }),
  revokeAccess: (id, userId) => del(`/cases/${id}/access-grants/${userId}`),
}

// ---- Tasks ----
export const tasksApi = {
  create: (data) => post('/tasks', data), // caseId, assignedToId, title required
  list: () => get('/tasks'),
  get: (id) => get(`/tasks/${id}`),
  update: (id, data) => patch(`/tasks/${id}`, data), // status only
  complete: (id, completionNote) => patch(`/tasks/${id}/complete`, { completionNote }),
  remove: (id) => del(`/tasks/${id}`),
}

// ---- Documents ----
export const documentsApi = {
  // multipart fields: file, caseId, categoryId (required); description,
  // linkedEntityType, linkedEntityId (optional).
  upload: (formData) => request('/documents', { method: 'POST', body: formData, isForm: true }),
  uploadVersion: (id, formData) => request(`/documents/${id}/versions`, { method: 'POST', body: formData, isForm: true }),
  downloadUrl: (id) => `${API_BASE}/documents/${id}/download`,
  list: (caseId) => get(`/documents${caseId ? `?caseId=${caseId}` : ''}`),
  remove: (id) => del(`/documents/${id}`),
}

// ---- Hearings ----
export const hearingsApi = {
  create: (data) => post('/hearings', data), // caseId, courtId, hearingTypeId, scheduledAt required
  list: () => get('/hearings'),
  get: (id) => get(`/hearings/${id}`),
  update: (id, data) => patch(`/hearings/${id}`, data),
  assign: (id, assignedLawyerId) => patch(`/hearings/${id}/assignment`, { assignedLawyerId }),
  complete: (id, data) => patch(`/hearings/${id}/complete`, data), // { outcomeText, nextHearingAt?, minutesDocumentId? }
  remove: (id) => del(`/hearings/${id}`),
}

// ---- Finance ----
// Replaces the old free-standing Invoices/Payments model — finance is now
// the Case's agreed fee plus a payment ledger against that one case.
export const financeApi = {
  summary: () => get('/finance/summary'), // firm-wide totals + per-case rows
  getCaseFinance: (caseId) => get(`/finance/cases/${caseId}`), // { caseId, agreedFee, paid, remaining, payments }
  recordPayment: (caseId, data) => post(`/finance/cases/${caseId}/payments`, data), // { amount, paidAt, method, reference?, note? }
  reversePayment: (paymentId, reason) => patch(`/finance/payments/${paymentId}/reverse`, { reason }),
}

// ---- Calendar ----
export const calendarApi = {
  create: (data) => post('/calendar', data), // { title, startsAt, description?, endsAt?, location?, isAllDay? }
  list: () => get('/calendar'),
  timeline: () => get('/calendar/timeline'),
  get: (id) => get(`/calendar/${id}`),
  update: (id, data) => patch(`/calendar/${id}`, data),
  remove: (id) => del(`/calendar/${id}`),
}

// ---- Reports & Dashboard ----
export const reportsApi = {
  dashboard: () => get('/reports/dashboard'),
  exportCasesUrl: () => `${API_BASE}/reports/export/cases`,
  // No /reports/export/clients anymore — clients aren't a standalone resource.
}

export const dashboardApi = {
  summary: () => get('/dashboard'),
}

// ---- Settings (generic key/value app settings — NOT firm info, see tenantsApi) ----
export const settingsApi = {
  public: () => get('/settings/public'),
  create: (data) => post('/settings', data),
  list: () => get('/settings'),
  update: (key, data) => patch(`/settings/${key}`, data),
  remove: (key) => del(`/settings/${key}`),
}

// ---- Helper: load an authenticated image as a displayable blob: URL ----
// Plain <img src="..."> can't send an Authorization header, and these logo
// endpoints require one — fetch the bytes ourselves and hand back an object
// URL the caller can drop straight into <img src>. Returns null on any
// failure (no logo uploaded yet, 403, network error, ...) so callers can
// fall back to a placeholder instead of showing a broken image icon.
export async function fetchAuthedImageUrl(url) {
  try {
    const res = await fetch(url, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
    if (!res.ok) return null
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

// ---- Helper: download a file behind auth to the browser ----
export async function downloadAuthedFile(url, filename) {
  const res = await fetch(url, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })
  if (!res.ok) throw new ApiError('تعذر تحميل الملف', res.status)
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(objectUrl)
}
