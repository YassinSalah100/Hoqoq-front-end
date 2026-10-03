import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Building2, Upload, Plus, Archive } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import AuthedImage from '../../components/ui/AuthedImage'
import FormModal from '../../components/ui/FormModal'
import { LoadingBlock, ErrorBlock } from '../../components/ui/AsyncState'
import { tenantsApi, authApi, referenceApi, lookupsApi } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { hasPermission, isFirmAdmin } from '../../data/auth'
import { isStrongPassword, WEAK_PASSWORD_MESSAGE } from '../../lib/passwordPolicy'

// Only what the PRD defines (PRD §4.1 firm profile, §5 roles, §6.5 reference
// lists). Subscription has its own page; notification settings are separate.
const SECTIONS = [
  {
    title: 'المكتب',
    items: ['معلومات المكتب'],
  },
  {
    title: 'القوائم المرجعية',
    items: ['أنواع القضايا', 'أنواع الجلسات', 'تصنيفات المستندات', 'المحاكم والدوائر'],
  },
  {
    title: 'الأعضاء',
    items: ['الأدوار والصلاحيات'],
  },
  {
    title: 'الأمان',
    items: ['تغيير كلمة المرور'],
    // BR-033: Employee credentials are administered by the Firm Admin.
    firmAdminOnly: true,
  },
]

// Firm profile text fields accepted by UpdateTenantDto. Anything not listed
// here is rejected by the backend (whitelist + forbidNonWhitelisted).
const FIRM_INFO_FIELDS = [
  ['name', 'اسم المكتب'],
  ['contactEmail', 'البريد الإلكتروني'],
  ['phone', 'رقم الهاتف'],
  ['website', 'الموقع الإلكتروني'],
  ['address', 'العنوان'],
  ['registrationNumber', 'رقم السجل التجاري'],
  ['taxNumber', 'الرقم الضريبي'],
]
const LTR_FIELDS = new Set(['contactEmail', 'website', 'phone'])

const TIMEZONES = ['Africa/Cairo', 'Asia/Riyadh', 'Asia/Dubai', 'Asia/Kuwait', 'Europe/London', 'America/New_York', 'UTC']
const CURRENCIES = ['EGP', 'SAR', 'AED', 'KWD', 'USD', 'EUR']
const WEEKDAYS = [
  { value: 0, label: 'الأحد' },
  { value: 1, label: 'الاثنين' },
  { value: 2, label: 'الثلاثاء' },
  { value: 3, label: 'الأربعاء' },
  { value: 4, label: 'الخميس' },
  { value: 5, label: 'الجمعة' },
  { value: 6, label: 'السبت' },
]
const COURT_TYPE_OPTIONS = [
  { value: 'FIRST_INSTANCE', label: 'ابتدائية' },
  { value: 'APPEAL', label: 'استئناف' },
  { value: 'ECONOMIC', label: 'اقتصادية' },
  { value: 'SUPREME', label: 'النقض' },
]
const MAX_REMINDERS = 10

const INPUT_CLASS =
  'w-full rounded-lg border border-paper-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500/30 focus:border-brass-500 disabled:bg-paper-soft disabled:text-ink-500'
const LABEL_CLASS = 'block text-xs text-ink-400 mb-1'

// Form state mirrors the saved firm. Working hours and reminders are edited as
// plain values and converted back in firmProfilePayload.
function toFormState(firm) {
  return {
    ...firm,
    workingDays: firm.workingHours?.daysOfWeek ?? [],
    workingStart: firm.workingHours?.startTime ?? '09:00',
    workingEnd: firm.workingHours?.endTime ?? '17:00',
    reminderText: (firm.reminderOffsetsHours ?? []).join(', '),
  }
}

// Throws an Arabic Error so the save handler can show it directly.
function parseReminderOffsets(text) {
  const hours = [...new Set(text.split(/[\s,،]+/).filter(Boolean).map(Number))]
  if (hours.some((h) => !Number.isInteger(h) || h < 0 || h > 720))
    throw new Error('مواعيد التذكير يجب أن تكون ساعات صحيحة بين 0 و 720')
  if (hours.length > MAX_REMINDERS) throw new Error(`يمكن تحديد ${MAX_REMINDERS} مواعيد تذكير كحد أقصى`)
  return hours.sort((a, b) => b - a)
}

// Blank optional fields are sent as null (clears them; the validators skip
// null) — an empty string would fail e.g. the website URL check.
function firmProfilePayload(values) {
  const payload = {}
  for (const [key] of FIRM_INFO_FIELDS) {
    const value = (values[key] ?? '').toString().trim()
    if (key === 'name') {
      if (value) payload.name = value
    } else if (key === 'website' && value && !/^https?:\/\//i.test(value)) {
      payload.website = 'https://' + value
    } else {
      payload[key] = value || null
    }
  }
  payload.description = (values.description ?? '').trim() || null
  payload.governorateId = values.governorateId || null
  if (values.defaultLanguage) payload.defaultLanguage = values.defaultLanguage
  if (values.timezone) payload.timezone = values.timezone
  if (values.currency) payload.currency = values.currency
  payload.reminderOffsetsHours = parseReminderOffsets(values.reminderText ?? '')

  if (values.workingDays?.length) {
    if ((values.workingEnd ?? '') <= (values.workingStart ?? ''))
      throw new Error('وقت نهاية الدوام يجب أن يكون بعد وقت البداية')
    payload.workingHours = {
      daysOfWeek: [...values.workingDays].sort((a, b) => a - b),
      startTime: values.workingStart,
      endTime: values.workingEnd,
    }
  } else {
    payload.workingHours = null
  }
  return payload
}

function FirmLogoUploader({ logoUrl, onUploaded }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [logoError, setLogoError] = useState(null)

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoError(null)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('logo', file)
      await tenantsApi.uploadLogo(formData)
      onUploaded()
    } catch (err) {
      setLogoError(err.message || 'تعذر رفع الشعار')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-paper-line">
      <div className="w-20 h-20 rounded-xl border border-paper-line bg-paper-soft flex items-center justify-center overflow-hidden shrink-0">
        <AuthedImage
          hasSource={Boolean(logoUrl)}
          // logoUrl is an opaque storage key, not a path — the endpoint
          // itself never changes, so it's appended as a cache-busting query
          // param to force a re-fetch whenever a new logo is uploaded.
          src={logoUrl ? `${tenantsApi.myFirmLogoUrl()}?v=${encodeURIComponent(logoUrl)}` : null}
          alt="شعار المكتب"
          className="w-full h-full object-contain"
          fallback={<Building2 size={28} className="text-ink-300" />}
        />
      </div>
      <div>
        <p className="text-sm font-medium text-ink-700 mb-1">شعار المكتب</p>
        <p className="text-xs text-ink-400 mb-2">اختياري — سيظهر في لوحة المكتب وفي قائمة المكاتب لدى المشرف العام</p>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <Button
          type="button"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="!py-1.5 !px-3 text-xs inline-flex items-center gap-1.5"
        >
          <Upload size={14} />
          {uploading ? 'جاري الرفع...' : 'رفع شعار'}
        </Button>
        {logoError && <p className="text-xs text-rust-500 mt-1">{logoError}</p>}
      </div>
    </div>
  )
}

function FirmInfoPanel() {
  const { currentUser } = useAuth()
  const canEdit = hasPermission(currentUser, 'firm.profile.manage')
  const { data, loading, error, reload } = useFetch(() => tenantsApi.getMyFirm(), [])
  const { data: governorates } = useFetch(() => referenceApi.governorates(), [])
  const [values, setValues] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (data) setValues(toFormState(data))
  }, [data])

  function setField(key, value) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function toggleDay(day) {
    setValues((v) => {
      const days = v.workingDays ?? []
      return { ...v, workingDays: days.includes(day) ? days.filter((d) => d !== day) : [...days, day] }
    })
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const payload = firmProfilePayload(values)
      await tenantsApi.updateMyFirm(payload)
      setSaved(true)
      reload()
    } catch (err) {
      alert(err.message ?? 'تعذر حفظ إعدادات المكتب')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingBlock label="جاري تحميل الإعدادات..." />
  if (error) return <ErrorBlock error={error} onRetry={reload} />

  // Keep a saved value selectable even if it is outside the standard list.
  const timezoneOptions = [...new Set([values.timezone, ...TIMEZONES].filter(Boolean))]
  const currencyOptions = [...new Set([values.currency, ...CURRENCIES].filter(Boolean))]

  return (
    <>
      <h3 className="text-lg font-semibold text-ink-800 mb-4">معلومات المكتب</h3>
      {canEdit && <FirmLogoUploader logoUrl={values.logoUrl} onUploaded={reload} />}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {FIRM_INFO_FIELDS.map(([key, label]) => (
          <div key={key}>
            <label className={LABEL_CLASS}>{label}</label>
            <input
              value={values[key] ?? ''}
              disabled={!canEdit}
              dir={LTR_FIELDS.has(key) ? 'ltr' : undefined}
              onChange={(e) => setField(key, e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
        ))}
        <div>
          <label className={LABEL_CLASS}>المحافظة</label>
          <select
            value={values.governorateId ?? ''}
            disabled={!canEdit}
            onChange={(e) => setField('governorateId', e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">غير محدد</option>
            {(governorates ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.nameAr || g.nameEn}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL_CLASS}>لغة المكتب الافتراضية</label>
          <select
            value={values.defaultLanguage ?? 'AR'}
            disabled={!canEdit}
            onChange={(e) => setField('defaultLanguage', e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="AR">العربية</option>
            <option value="EN">English</option>
          </select>
        </div>
        <div>
          <label className={LABEL_CLASS}>المنطقة الزمنية</label>
          <select
            dir="ltr"
            value={values.timezone ?? ''}
            disabled={!canEdit}
            onChange={(e) => setField('timezone', e.target.value)}
            className={INPUT_CLASS}
          >
            {timezoneOptions.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL_CLASS}>العملة</label>
          <select
            dir="ltr"
            value={values.currency ?? ''}
            disabled={!canEdit}
            onChange={(e) => setField('currency', e.target.value)}
            className={INPUT_CLASS}
          >
            {currencyOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL_CLASS}>نبذة عن المكتب</label>
          <textarea
            rows={3}
            value={values.description ?? ''}
            disabled={!canEdit}
            onChange={(e) => setField('description', e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div className="mb-6">
        <p className="text-sm font-medium text-ink-700 mb-2">ساعات العمل الرسمية</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {WEEKDAYS.map((day) => {
            const on = (values.workingDays ?? []).includes(day.value)
            return (
              <button
                type="button"
                key={day.value}
                disabled={!canEdit}
                onClick={() => toggleDay(day.value)}
                className={`px-3 py-1.5 rounded-lg border text-xs transition-colors disabled:opacity-60 ${
                  on ? 'bg-brass-100 border-brass-300 text-brass-800' : 'bg-paper border-paper-line text-ink-500'
                }`}
              >
                {day.label}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs text-ink-400">من</label>
          <input
            type="time"
            dir="ltr"
            value={values.workingStart ?? '09:00'}
            disabled={!canEdit}
            onChange={(e) => setField('workingStart', e.target.value)}
            className="rounded-lg border border-paper-line px-3 py-2 text-sm disabled:bg-paper-soft"
          />
          <label className="text-xs text-ink-400">إلى</label>
          <input
            type="time"
            dir="ltr"
            value={values.workingEnd ?? '17:00'}
            disabled={!canEdit}
            onChange={(e) => setField('workingEnd', e.target.value)}
            className="rounded-lg border border-paper-line px-3 py-2 text-sm disabled:bg-paper-soft"
          />
        </div>
      </div>

      <div className="mb-6">
        <label className={LABEL_CLASS}>مواعيد التذكير الافتراضية (بالساعات قبل الموعد)</label>
        <input
          dir="ltr"
          value={values.reminderText ?? ''}
          disabled={!canEdit}
          placeholder="24, 1"
          onChange={(e) => setField('reminderText', e.target.value)}
          className={INPUT_CLASS}
        />
        <p className="text-xs text-ink-400 mt-1">
          تُرسل التذكيرات للجلسات وإجراءات الإعلان والاجتماعات والمهام في هذه المواعيد. افصل بين القيم بفاصلة، بحد أقصى {MAX_REMINDERS}.
        </p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-brass-100 border border-brass-200 mb-4">
          <CheckCircle2 size={14} className="text-brass-600 shrink-0" />
          <p className="text-sm text-brass-700">تم حفظ التغييرات بنجاح</p>
        </div>
      )}
      {canEdit && (
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </Button>
      )}
    </>
  )
}

// Shared shell for the flat reference lists (case types, hearing types,
// document categories). Platform rows are read-only; the Firm Admin may add
// and archive the firm's own rows (PRD §6.5). Archiving keeps history intact.
function SimpleListPanel({ title, load, create, archive }) {
  const { currentUser } = useAuth()
  const canManage = isFirmAdmin(currentUser)
  const { data, loading, error, reload } = useFetch(load, [])
  const [adding, setAdding] = useState(false)
  const rows = (data ?? []).map((row) => ({
    id: row.id,
    ar: row.labelAr ?? row.nameAr ?? '',
    en: row.labelEn ?? row.nameEn ?? '',
    firm: Boolean(row.tenantId),
  }))

  async function handleArchive(item) {
    if (!window.confirm(`أرشفة "${item.ar}"؟ لن تُحذف السجلات المرتبطة به.`)) return
    try {
      await archive(item.id)
      reload()
    } catch (err) {
      alert(err.message ?? 'تعذر الأرشفة')
    }
  }

  if (loading) return <LoadingBlock label="جاري تحميل القائمة..." />
  if (error) return <ErrorBlock error={error} onRetry={reload} />

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-ink-800">{title}</h3>
        {canManage && (
          <Button onClick={() => setAdding(true)} className="!py-1.5 !px-3 text-xs inline-flex items-center gap-1.5">
            <Plus size={14} />
            إضافة
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-ink-400">لا توجد عناصر بعد.</p>
      ) : (
        <ul className="divide-y divide-paper-line border border-paper-line rounded-xl">
          {rows.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm text-ink-800">{item.ar}</p>
                <p className="text-xs text-ink-400" dir="ltr">
                  {item.en}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    item.firm ? 'bg-brass-100 text-brass-700' : 'bg-paper-soft text-ink-500'
                  }`}
                >
                  {item.firm ? 'خاص بالمكتب' : 'شامل'}
                </span>
                {canManage && item.firm && (
                  <button
                    type="button"
                    onClick={() => handleArchive(item)}
                    className="text-ink-400 hover:text-rust-500"
                    title="أرشفة"
                  >
                    <Archive size={16} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <FormModal
        open={adding}
        onClose={() => setAdding(false)}
        title={`إضافة ${title}`}
        fields={[
          { name: 'ar', label: 'الاسم بالعربية', required: true },
          { name: 'en', label: 'الاسم بالإنجليزية', required: true },
        ]}
        onSubmit={async (values) => {
          await create({ ar: values.ar.trim(), en: values.en.trim() })
          setAdding(false)
          reload()
        }}
      />
    </>
  )
}

// Courts are chosen per Governorate; a Firm Court is added under it, and
// Circuits are added under a selected Court (PRD §6.5, §7.1).
function CourtsPanel() {
  const { currentUser } = useAuth()
  const canManage = isFirmAdmin(currentUser)
  const { data: governorates } = useFetch(() => referenceApi.governorates(), [])
  const [governorateId, setGovernorateId] = useState('')
  const [selectedCourt, setSelectedCourt] = useState(null)
  const [addingCourt, setAddingCourt] = useState(false)
  const [addingCircuit, setAddingCircuit] = useState(false)
  const courts = useFetch(
    () => (governorateId ? referenceApi.courtsByGovernorate(governorateId) : Promise.resolve([])),
    [governorateId],
  )
  const circuits = useFetch(
    () => (selectedCourt ? referenceApi.circuitsByCourt(selectedCourt.id) : Promise.resolve([])),
    [selectedCourt?.id],
  )

  return (
    <>
      <h3 className="text-lg font-semibold text-ink-800 mb-4">المحاكم والدوائر</h3>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="min-w-56">
          <label className={LABEL_CLASS}>المحافظة</label>
          <select
            value={governorateId}
            onChange={(e) => {
              setGovernorateId(e.target.value)
              setSelectedCourt(null)
            }}
            className={INPUT_CLASS}
          >
            <option value="">اختر المحافظة</option>
            {(governorates ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.nameAr || g.nameEn}
              </option>
            ))}
          </select>
        </div>
        {canManage && (
          <Button
            onClick={() => setAddingCourt(true)}
            disabled={!governorateId}
            className="!py-2 !px-3 text-xs inline-flex items-center gap-1.5"
          >
            <Plus size={14} />
            إضافة محكمة
          </Button>
        )}
      </div>

      {!governorateId ? (
        <p className="text-sm text-ink-400">اختر محافظة لعرض محاكمها.</p>
      ) : courts.loading ? (
        <LoadingBlock label="جاري تحميل المحاكم..." />
      ) : courts.error ? (
        <ErrorBlock error={courts.error} onRetry={courts.reload} />
      ) : (courts.data ?? []).length === 0 ? (
        <p className="text-sm text-ink-400">لا توجد محاكم في هذه المحافظة.</p>
      ) : (
        <ul className="divide-y divide-paper-line border border-paper-line rounded-xl mb-6">
          {courts.data.map((court) => (
            <li key={court.id}>
              <button
                type="button"
                onClick={() => setSelectedCourt(selectedCourt?.id === court.id ? null : court)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-right ${
                  selectedCourt?.id === court.id ? 'bg-brass-100/50' : 'hover:bg-paper-soft'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm text-ink-800">{court.nameAr}</p>
                  <p className="text-xs text-ink-400" dir="ltr">
                    {court.nameEn}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-ink-500">{COURT_TYPE_OPTIONS.find((o) => o.value === court.type)?.label}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      court.tenantId ? 'bg-brass-100 text-brass-700' : 'bg-paper-soft text-ink-500'
                    }`}
                  >
                    {court.tenantId ? 'خاص بالمكتب' : 'شامل'}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedCourt && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-ink-700">دوائر {selectedCourt.nameAr}</h4>
            {canManage && (
              <Button onClick={() => setAddingCircuit(true)} className="!py-1.5 !px-3 text-xs inline-flex items-center gap-1.5">
                <Plus size={14} />
                إضافة دائرة
              </Button>
            )}
          </div>
          {circuits.loading ? (
            <LoadingBlock label="جاري تحميل الدوائر..." />
          ) : circuits.error ? (
            <ErrorBlock error={circuits.error} onRetry={circuits.reload} />
          ) : (circuits.data ?? []).length === 0 ? (
            <p className="text-sm text-ink-400">لا توجد دوائر مسجلة لهذه المحكمة.</p>
          ) : (
            <ul className="divide-y divide-paper-line border border-paper-line rounded-xl">
              {circuits.data.map((circuit) => (
                <li key={circuit.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-ink-800">{circuit.nameAr}</p>
                    <p className="text-xs text-ink-400" dir="ltr">
                      {circuit.nameEn}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                      circuit.tenantId ? 'bg-brass-100 text-brass-700' : 'bg-paper-soft text-ink-500'
                    }`}
                  >
                    {circuit.tenantId ? 'خاص بالمكتب' : 'شامل'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <FormModal
        open={addingCourt}
        onClose={() => setAddingCourt(false)}
        title="إضافة محكمة"
        fields={[
          { name: 'nameAr', label: 'الاسم بالعربية', required: true },
          { name: 'nameEn', label: 'الاسم بالإنجليزية', required: true },
          { name: 'type', label: 'نوع المحكمة', type: 'select', required: true, options: COURT_TYPE_OPTIONS },
        ]}
        initialValues={{ type: 'FIRST_INSTANCE' }}
        onSubmit={async (values) => {
          await referenceApi.createCourt({
            governorateId,
            nameAr: values.nameAr.trim(),
            nameEn: values.nameEn.trim(),
            type: values.type,
          })
          setAddingCourt(false)
          courts.reload()
        }}
      />
      <FormModal
        open={addingCircuit}
        onClose={() => setAddingCircuit(false)}
        title="إضافة دائرة"
        fields={[
          { name: 'nameAr', label: 'الاسم بالعربية', required: true },
          { name: 'nameEn', label: 'الاسم بالإنجليزية', required: true },
        ]}
        onSubmit={async (values) => {
          await referenceApi.createCircuit(selectedCourt.id, {
            nameAr: values.nameAr.trim(),
            nameEn: values.nameEn.trim(),
          })
          setAddingCircuit(false)
          circuits.reload()
        }}
      />
    </>
  )
}

// Reference lists rendered by SimpleListPanel.
const REFERENCE_LISTS = {
  'أنواع القضايا': {
    title: 'نوع القضية',
    load: () => referenceApi.caseTypes(),
    create: (v) => referenceApi.createCaseType({ nameAr: v.ar, nameEn: v.en }),
    archive: (id) => referenceApi.archiveCaseType(id),
  },
  'أنواع الجلسات': {
    title: 'نوع الجلسة',
    load: () => lookupsApi.list('HEARING_TYPE'),
    create: (v) => lookupsApi.create({ kind: 'HEARING_TYPE', labelAr: v.ar, labelEn: v.en }),
    archive: (id) => lookupsApi.archive(id),
  },
  'تصنيفات المستندات': {
    title: 'تصنيف المستند',
    load: () => lookupsApi.list('DOCUMENT_CATEGORY'),
    create: (v) => lookupsApi.create({ kind: 'DOCUMENT_CATEGORY', labelAr: v.ar, labelEn: v.en }),
    archive: (id) => lookupsApi.archive(id),
  },
}

function ChangePasswordPanel() {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setDone(false)
    if (!isStrongPassword(newPassword)) {
      setError(WEAK_PASSWORD_MESSAGE)
      return
    }
    if (newPassword !== confirm) {
      setError('كلمتا المرور الجديدتان غير متطابقتين')
      return
    }
    setLoading(true)
    try {
      await authApi.changePassword(oldPassword, newPassword)
      setDone(true)
      setOldPassword('')
      setNewPassword('')
      setConfirm('')
    } catch (err) {
      setError(err.message === 'Incorrect old password' ? 'كلمة المرور الحالية غير صحيحة' : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h3 className="text-lg font-semibold text-ink-800 mb-4">تغيير كلمة المرور</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
        <div>
          <label className="block text-xs text-ink-400 mb-1">كلمة المرور الحالية</label>
          <input
            type="password"
            dir="ltr"
            required
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="w-full rounded-lg border border-paper-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500/30 focus:border-brass-500"
          />
        </div>
        <div>
          <label className="block text-xs text-ink-400 mb-1">كلمة المرور الجديدة</label>
          <input
            type="password"
            dir="ltr"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-paper-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500/30 focus:border-brass-500"
          />
        </div>
        <div>
          <label className="block text-xs text-ink-400 mb-1">تأكيد كلمة المرور الجديدة</label>
          <input
            type="password"
            dir="ltr"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border border-paper-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500/30 focus:border-brass-500"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rust-100 border border-rust-200">
            <AlertCircle size={14} className="text-rust-500 shrink-0" />
            <p className="text-sm text-rust-600">{error}</p>
          </div>
        )}
        {done && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-brass-100 border border-brass-200">
            <CheckCircle2 size={14} className="text-brass-600 shrink-0" />
            <p className="text-sm text-brass-700">تم تغيير كلمة المرور بنجاح</p>
          </div>
        )}

        <Button type="submit" disabled={loading} className="self-start">
          {loading ? 'جاري الحفظ...' : 'تغيير كلمة المرور'}
        </Button>
      </form>
    </>
  )
}

export default function Settings() {
  const { currentUser } = useAuth()
  const [active, setActive] = useState('معلومات المكتب')
  const sections = SECTIONS.filter((s) => !s.firmAdminOnly || isFirmAdmin(currentUser))

  let panel = null
  if (active === 'معلومات المكتب') panel = <FirmInfoPanel />
  else if (REFERENCE_LISTS[active]) panel = <SimpleListPanel key={active} {...REFERENCE_LISTS[active]} />
  else if (active === 'المحاكم والدوائر') panel = <CourtsPanel />
  else if (active === 'تغيير كلمة المرور' && isFirmAdmin(currentUser)) panel = <ChangePasswordPanel />

  return (
    <div>
      <PageHeader title="الإعدادات" />

      <div className="flex gap-4">
        <aside className="w-60 shrink-0 bg-white rounded-xl border border-paper-line shadow-card p-3 h-fit">
          {sections.map((section) => (
            <div key={section.title} className="mb-4 last:mb-0">
              <p className="px-3 mb-1 text-xs text-ink-400 font-medium">{section.title}</p>
              {section.items.map((item) =>
                item === 'الأدوار والصلاحيات' ? (
                  <Link
                    key={item}
                    to="/roles"
                    className="block w-full text-right px-3 py-2 rounded-lg text-sm mb-0.5 text-ink-600 hover:bg-paper-soft"
                  >
                    {item}
                  </Link>
                ) : (
                  <button
                    key={item}
                    onClick={() => setActive(item)}
                    className={`w-full text-right px-3 py-2 rounded-lg text-sm mb-0.5 ${
                      active === item ? 'bg-brass-100 text-brass-800 font-medium' : 'text-ink-600 hover:bg-paper-soft'
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
            </div>
          ))}
        </aside>

        <div className="flex-1 bg-white rounded-xl border border-paper-line shadow-card p-6">{panel}</div>
      </div>
    </div>
  )
}
