import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Building2, Upload } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import { LoadingBlock, ErrorBlock } from '../../components/ui/AsyncState'
import { tenantsApi, authApi, resolveAssetUrl } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'

const SECTIONS = [
  {
    title: 'المكتب',
    items: ['معلومات المكتب', 'ساعات العمل', 'الإجازات والعطل', 'قوالب الفواتير'],
  },
  {
    title: 'الأعضاء',
    items: ['الأدوار والصلاحيات', 'دعوة موظف جديد'],
  },
  {
    title: 'المراجع',
    items: ['أنواع القضايا', 'أنواع الجلسات', 'تصنيفات المستندات'],
  },
  {
    title: 'الإشعارات',
    items: ['إعدادات البريد', 'تفضيلات الإشعارات'],
  },
  {
    title: 'الأمان',
    items: ['تغيير كلمة المرور'],
  },
  {
    title: 'الاشتراك',
    items: ['خطة الاشتراك والفوترة'],
  },
]

// Matches UpdateTenantDto exactly (name, address, contactEmail) — the backend
// rejects any other property with a 400 (global ValidationPipe runs with
// whitelist + forbidNonWhitelisted). There is no publicContactEmail/
// publicContactPhone/website on the Tenant entity in this backend.
const FIRM_INFO_FIELDS = [
  ['name', 'اسم المكتب'],
  ['address', 'العنوان'],
  ['contactEmail', 'البريد الإلكتروني'],
]

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
        {logoUrl ? (
          <img src={resolveAssetUrl(logoUrl)} alt="شعار المكتب" className="w-full h-full object-contain" />
        ) : (
          <Building2 size={28} className="text-ink-300" />
        )}
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
  const { data, loading, error, reload } = useFetch(() => tenantsApi.getMyFirm(), [])
  const [values, setValues] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (data) setValues(data)
  }, [data])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await tenantsApi.updateMyFirm({
        name: values.name,
        address: values.address,
        contactEmail: values.contactEmail,
      })
      setSaved(true)
      reload()
    } catch {
      alert('تعذر حفظ إعدادات المكتب')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingBlock label="جاري تحميل الإعدادات..." />
  if (error) return <ErrorBlock error={error} onRetry={reload} />

  return (
    <>
      <h3 className="text-lg font-semibold text-ink-800 mb-4">معلومات المكتب</h3>
      <FirmLogoUploader logoUrl={values.logoUrl} onUploaded={reload} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {FIRM_INFO_FIELDS.map(([key, label]) => (
          <div key={key}>
            <label className="block text-xs text-ink-400 mb-1">{label}</label>
            <input
              value={values[key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              className="w-full rounded-lg border border-paper-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500/30 focus:border-brass-500"
            />
          </div>
        ))}
      </div>
      {saved && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-brass-100 border border-brass-200 mb-4">
          <CheckCircle2 size={14} className="text-brass-600 shrink-0" />
          <p className="text-sm text-brass-700">تم حفظ التغييرات بنجاح</p>
        </div>
      )}
      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
      </Button>
    </>
  )
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
      setError(err.message)
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
  const [active, setActive] = useState('معلومات المكتب')

  return (
    <div>
      <PageHeader title="الإعدادات" />

      <div className="flex gap-4">
        <aside className="w-60 shrink-0 bg-white rounded-xl border border-paper-line shadow-card p-3 h-fit">
          {SECTIONS.map((section) => (
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

        <div className="flex-1 bg-white rounded-xl border border-paper-line shadow-card p-6">
          {active === 'معلومات المكتب' ? (
            <FirmInfoPanel />
          ) : active === 'تغيير كلمة المرور' ? (
            <ChangePasswordPanel />
          ) : (
            <p className="text-ink-400 text-sm">إعدادات "{active}" غير متوفرة في هذه النسخة التجريبية.</p>
          )}
        </div>
      </div>
    </div>
  )
}
