import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-paper-line bg-paper text-sm focus:outline-none focus:ring-2 focus:ring-brass-500/30 focus:border-brass-500'

// Fields that naturally want the full row: long-form text and anything the
// caller explicitly marks. Everything else pairs up two-per-row on wider
// screens so a long onboarding form doesn't read as one endless list.
function isFullWidth(field) {
  return field.span === 'full' || field.type === 'textarea' || field.type === 'checkboxes' || field.type === 'grouped-checkboxes'
}

function Field({ field, value, onChange }) {
  if (field.type === 'checkboxes') {
    const selected = new Set(value ?? [])
    function toggle(optValue) {
      const next = new Set(selected)
      if (next.has(optValue)) next.delete(optValue)
      else next.add(optValue)
      onChange(Array.from(next))
    }
    return (
      <div className="flex flex-wrap gap-2">
        {(field.options ?? []).map((opt) => (
          <label
            key={opt.value}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
              selected.has(opt.value) ? 'bg-brass-100 border-brass-300 text-brass-800' : 'bg-paper border-paper-line text-ink-500 hover:border-ink-300'
            }`}
          >
            <input type="checkbox" checked={selected.has(opt.value)} onChange={() => toggle(opt.value)} className="hidden" />
            {opt.label}
          </label>
        ))}
      </div>
    )
  }
  // Same underlying multi-select as 'checkboxes', but for lists long enough
  // (permission catalogs, case capabilities — 30+ items) that an
  // undifferentiated wall of pills is hard to scan. `field.groups` is
  // [{ label, options: [{ value, label }] }, ...] — pre-grouped by the
  // caller (see groupPermissionCodes/groupCaseCapabilities).
  if (field.type === 'grouped-checkboxes') {
    const selected = new Set(value ?? [])
    function toggle(optValue) {
      const next = new Set(selected)
      if (next.has(optValue)) next.delete(optValue)
      else next.add(optValue)
      onChange(Array.from(next))
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 p-3 rounded-xl border border-paper-line bg-paper-soft/50 max-h-80 overflow-y-auto">
        {(field.groups ?? []).map((group) => (
          <div key={group.label}>
            <p className="text-xs font-semibold text-ink-600 mb-1.5">{group.label}</p>
            <div className="space-y-1">
              {group.options.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm rounded-lg px-1.5 py-0.5 -mx-1.5 hover:bg-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(opt.value)}
                    onChange={() => toggle(opt.value)}
                    className="accent-brass-500 w-3.5 h-3.5 shrink-0"
                  />
                  <span className="text-ink-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }
  if (field.type === 'select') {
    return (
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} required={field.required} className={inputClass}>
        <option value="" disabled>
          {field.placeholder ?? 'اختر...'}
        </option>
        {(field.options ?? []).map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    )
  }
  if (field.type === 'textarea') {
    return (
      <textarea
        rows={3}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        placeholder={field.placeholder}
        className={inputClass}
      />
    )
  }
  return (
    <input
      type={field.type ?? 'text'}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      required={field.required}
      placeholder={field.placeholder}
      dir={field.type === 'email' || field.type === 'password' ? 'ltr' : undefined}
      className={inputClass}
    />
  )
}

// Generic "create X" modal. `fields` describes the form; `onSubmit(values)`
// does the actual API call. Keeps every create-button across the app from
// needing its own bespoke form component.
export default function FormModal({ open, onClose, title, fields, initialValues, onSubmit, submitLabel = 'حفظ' }) {
  const [values, setValues] = useState(initialValues ?? {})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function update(name, value) {
    setValues((v) => ({ ...v, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await onSubmit(values)
      setValues(initialValues ?? {})
      onClose()
    } catch (err) {
      setError(err.message ?? 'حدث خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setValues(initialValues ?? {})
    setError(null)
    onClose()
  }

  // Some fields only make sense once another field has a particular value
  // (e.g. "specializations" only applies when jobClassification === LAWYER).
  // Filtered per-render against the live form values instead of the caller
  // building a static field list, so the field appears/disappears as the
  // user fills the form in rather than always showing with a footnote.
  const visibleFields = fields.filter((field) => (field.visibleWhen ? field.visibleWhen(values) : true))

  // Wider modal only pays off once fields actually pair up into a grid.
  const useGrid = visibleFields.length > 3
  const modalSize = useGrid ? 'lg' : 'md'

  return (
    <Modal open={open} onClose={handleClose} title={title} size={modalSize}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className={useGrid ? 'grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4' : 'flex flex-col gap-4'}>
          {visibleFields.map((field) => (
            <div key={field.name} className={`flex flex-col gap-1.5 ${useGrid && isFullWidth(field) ? 'sm:col-span-2' : ''}`}>
              <label className="text-sm font-medium text-ink-700">{field.label}</label>
              <Field field={typeof field.groups === 'function' ? { ...field, groups: field.groups(values) } : field} value={values[field.name]} onChange={(v) => update(field.name, v)} />
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rust-100 border border-rust-200">
            <AlertCircle size={14} className="text-rust-500 shrink-0" />
            <p className="text-sm text-rust-600">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-2 justify-end pt-3 mt-1 border-t border-paper-line">
          <Button type="button" variant="secondary" onClick={handleClose}>
            إلغاء
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'جاري الحفظ...' : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
