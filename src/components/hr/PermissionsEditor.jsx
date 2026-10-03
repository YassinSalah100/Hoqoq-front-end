import { useEffect, useMemo, useState } from 'react'
import { Info } from 'lucide-react'
import Button from '../ui/Button'
import { LoadingBlock, ErrorBlock } from '../ui/AsyncState'
import { employeesApi, permissionsApi } from '../../lib/api'
import { groupPermissionCodes } from '../../data/permissionCatalog'

// Shared permission-catalog + per-employee editor, used both by Roles.jsx
// (dedicated permission page) and Employees.jsx (quick per-row "edit
// permissions" action) so the catalog-fetch-and-render logic isn't
// duplicated between the two entry points. There is no Roles module on the
// backend anymore — access is exactly the flat list of permission codes
// granted directly to the account (see src/data/auth.js).
export default function PermissionsEditor({ employee, onSaved, onCancel }) {
  const [catalog, setCatalog] = useState(null)
  const [granted, setGranted] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    if (!employee) return
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setSaveError(null)
    Promise.all([permissionsApi.catalog(), employeesApi.getPermissions(employee.id)])
      .then(([cat, current]) => {
        if (cancelled) return
        setCatalog(cat?.codes ?? [])
        // rolePermissions is always [] now (dead field from the old
        // role-based model) — the only real state is grantedPermissions.
        setGranted(new Set(current?.grantedPermissions ?? []))
      })
      .catch((err) => !cancelled && setLoadError(err))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [employee])

  const grouped = useMemo(() => groupPermissionCodes(catalog ?? []), [catalog])

  function toggle(code) {
    setGranted((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const result = await employeesApi.setPermissions(employee.id, Array.from(granted))
      onSaved?.(result?.grantedPermissions ?? Array.from(granted))
    } catch (err) {
      setSaveError(err)
    } finally {
      setSaving(false)
    }
  }

  if (!employee) return null

  return (
    <div>
      {loading && <LoadingBlock label="جاري تحميل الصلاحيات..." />}
      {loadError && <ErrorBlock error={loadError} onRetry={() => setLoadError(null)} />}

      {!loading && !loadError && (
        <>
          {/* BR-002: case-level permissions are only half of an employee's
              access — the other half is being added to a specific case. */}
          <div className="flex items-start gap-2.5 rounded-xl border border-brass-200 bg-brass-50 px-4 py-3 mb-5 text-[13px] text-ink-700 leading-relaxed">
            <Info size={16} className="text-brass-600 shrink-0 mt-0.5" />
            <p>
              صلاحيات القضايا والموكلين والخصوم والجلسات والمستندات والمهام تحدد <strong>ما يمكن للموظف فعله</strong>، لكنها
              تعمل فقط على القضايا التي <strong>يُضاف إليها</strong>: إما بتعيينه المحامي المسؤول عن القضية، أو بإضافته من تبويب
              «الفريق» داخل القضية. اللوحة الرئيسية والتقويم متاحان لكل موظف ويعرضان أعماله فقط.
            </p>
          </div>
          {grouped.length === 0 ? (
            <p className="text-sm text-ink-400 py-10 text-center">لا توجد صلاحيات متاحة للمنح حالياً</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              {grouped.map(({ group, groupLabel, items }) => (
                <div key={group}>
                  <p className="text-sm font-semibold text-ink-700 mb-2">{groupLabel}</p>
                  <div className="space-y-1.5">
                    {items.map((p) => (
                      <label
                        key={p.code}
                        className="flex items-center gap-2 text-sm rounded-lg px-2 py-1 -mx-2 hover:bg-paper-soft cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={granted.has(p.code)}
                          onChange={() => toggle(p.code)}
                          className="accent-brass-500 w-4 h-4 rounded shrink-0"
                        />
                        <span className="text-ink-700">{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 justify-end pt-5 mt-5 border-t border-paper-line">
            {saveError && <p className="text-sm text-rust-600 ml-auto">{saveError.message ?? 'تعذر حفظ الصلاحيات'}</p>}
            {onCancel && (
              <Button variant="secondary" onClick={onCancel} disabled={saving}>
                إلغاء
              </Button>
            )}
            <Button onClick={handleSave} disabled={loading || saving}>
              {saving ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
