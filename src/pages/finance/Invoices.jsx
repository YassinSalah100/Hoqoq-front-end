import { useMemo, useState } from 'react'
import { Plus, RotateCcw } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Tabs from '../../components/ui/Tabs'
import DataTable from '../../components/ui/DataTable'
import EnumBadge from '../../components/ui/EnumBadge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import { LoadingBlock, ErrorBlock } from '../../components/ui/AsyncState'
import { CASE_FINANCE_STATUS, PAYMENT_METHOD } from '../../data/enums'
import { financeApi } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { hasPermission } from '../../data/auth'

// There is no standalone Invoice model anymore (see finance.service.ts) —
// this page is now "one row per Case with an agreed fee", sourced entirely
// from GET /finance/summary. Per-case drill-down (payment history, record,
// reverse) lives in the modal below, backed by GET /finance/cases/:id.
const STATUS_TABS = Object.keys(CASE_FINANCE_STATUS)

const fieldInputClass =
  'w-full px-3 py-2 rounded-lg border border-paper-line bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brass-500/30 focus:border-brass-500'

function sar(n) {
  return `${Number(n ?? 0).toLocaleString('ar')} ر.س`
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// ---- Record payment inline form (POST /finance/cases/:caseId/payments) ----
function RecordPaymentForm({ caseId, remaining, onDone, onCancel }) {
  const [values, setValues] = useState({ amount: '', paidAt: todayStr(), method: 'CASH', reference: '', note: '' })
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
      await financeApi.recordPayment(caseId, {
        amount: Number(values.amount),
        paidAt: values.paidAt,
        method: values.method,
        ...(values.reference ? { reference: values.reference } : {}),
        ...(values.note ? { note: values.note } : {}),
      })
      onDone()
    } catch (err) {
      // Backend 400s (e.g. "Payment would exceed the agreed Case fee") are
      // just surfaced as-is rather than pre-validated client-side.
      setError(err.message ?? 'حدث خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 rounded-xl bg-paper-soft border border-paper-line mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink-700">المبلغ (ر.س)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={values.amount}
            onChange={(e) => update('amount', e.target.value)}
            className={fieldInputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink-700">تاريخ الدفع</label>
          <input type="date" required value={values.paidAt} onChange={(e) => update('paidAt', e.target.value)} className={fieldInputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink-700">طريقة الدفع</label>
          <select required value={values.method} onChange={(e) => update('method', e.target.value)} className={fieldInputClass}>
            {Object.entries(PAYMENT_METHOD).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink-700">المرجع (اختياري)</label>
          <input value={values.reference} onChange={(e) => update('reference', e.target.value)} className={fieldInputClass} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-ink-700">ملاحظات (اختياري)</label>
        <textarea rows={2} value={values.note} onChange={(e) => update('note', e.target.value)} className={fieldInputClass} />
      </div>
      {remaining !== undefined && <p className="text-xs text-ink-400">المتبقي حالياً: {sar(remaining)}</p>}
      {error && <p className="text-sm text-rust-600">{error}</p>}
      <div className="flex items-center gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          إلغاء
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'جاري الحفظ...' : 'تسجيل الدفعة'}
        </Button>
      </div>
    </form>
  )
}

// ---- Reverse payment inline confirm (PATCH /finance/payments/:id/reverse) ----
function ReversePaymentForm({ paymentId, onDone, onCancel }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await financeApi.reversePayment(paymentId, reason)
      onDone()
    } catch (err) {
      setError(err.message ?? 'حدث خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3 mt-2 rounded-lg bg-rust-100/50 border border-rust-100">
      <label className="text-xs font-medium text-ink-700">سبب عكس الدفعة</label>
      <textarea
        rows={2}
        required
        minLength={3}
        maxLength={1000}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className={fieldInputClass}
      />
      {error && <p className="text-xs text-rust-600">{error}</p>}
      <div className="flex items-center gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          تراجع
        </Button>
        <Button type="submit" variant="danger" disabled={loading}>
          {loading ? 'جاري العكس...' : 'تأكيد العكس'}
        </Button>
      </div>
    </form>
  )
}

// ---- Per-case finance drill-down (GET /finance/cases/:caseId) ----
function CaseFinanceModal({ caseId, caseNumber, canRecord, canManage, onClose, onChanged }) {
  const { data, loading, error, reload } = useFetch(() => financeApi.getCaseFinance(caseId), [caseId])
  const [showRecordForm, setShowRecordForm] = useState(false)
  const [reversingId, setReversingId] = useState(null)

  function refreshAll() {
    reload()
    onChanged?.()
  }

  return (
    <Modal open onClose={onClose} title={`السجل المالي — ${caseNumber ?? ''}`} size="lg">
      {loading && <LoadingBlock label="جاري تحميل البيانات المالية..." />}
      {error && <ErrorBlock error={error} onRetry={reload} />}

      {!loading && !error && data && (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-paper-soft">
              <p className="text-xs text-ink-400 mb-1">الأتعاب المتفق عليها</p>
              <p className="font-mono text-sm font-semibold text-ink-800">{sar(data.agreedFee)}</p>
            </div>
            <div className="p-3 rounded-lg bg-paper-soft">
              <p className="text-xs text-ink-400 mb-1">المدفوع</p>
              <p className="font-mono text-sm font-semibold text-emerald-700">{sar(data.paid)}</p>
            </div>
            <div className="p-3 rounded-lg bg-paper-soft">
              <p className="text-xs text-ink-400 mb-1">المتبقي</p>
              <p className="font-mono text-sm font-semibold text-rust-600">{sar(data.remaining)}</p>
            </div>
          </div>

          {canRecord && !showRecordForm && (
            <div className="mb-4">
              <Button onClick={() => setShowRecordForm(true)} disabled={data.remaining <= 0}>
                <Plus size={14} />
                تسجيل دفعة
              </Button>
              {data.remaining <= 0 && <p className="text-xs text-ink-400 mt-1">تم سداد كامل الأتعاب المتفق عليها</p>}
            </div>
          )}

          {canRecord && showRecordForm && (
            <RecordPaymentForm
              caseId={caseId}
              remaining={data.remaining}
              onCancel={() => setShowRecordForm(false)}
              onDone={() => {
                setShowRecordForm(false)
                refreshAll()
              }}
            />
          )}

          <h4 className="text-sm font-semibold text-ink-700 mb-2">سجل الدفعات</h4>
          {(data.payments ?? []).length ? (
            <div className="space-y-2">
              {data.payments.map((p) => (
                <div key={p.id} className="p-3 rounded-lg border border-paper-line bg-white">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className={p.reversedAt ? 'line-through text-ink-400' : 'text-ink-800'}>
                      <span className="font-mono font-semibold text-sm">{sar(p.amount)}</span>
                      <span className="text-xs text-ink-400 mx-2">{PAYMENT_METHOD[p.method] ?? p.method}</span>
                      <span className="text-xs text-ink-400 font-mono">{(p.paidAt ?? '').toString().slice(0, 10)}</span>
                    </div>
                    {p.reversedAt ? (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-rust-100 text-rust-600 shrink-0">معكوسة</span>
                    ) : (
                      canManage &&
                      reversingId !== p.id && (
                        <button
                          onClick={() => setReversingId(p.id)}
                          className="text-xs text-rust-600 hover:underline inline-flex items-center gap-1 shrink-0"
                        >
                          <RotateCcw size={12} />
                          عكس الدفعة
                        </button>
                      )
                    )}
                  </div>
                  {p.reference && <p className="text-xs text-ink-400 mt-1">المرجع: {p.reference}</p>}
                  {p.note && <p className="text-xs text-ink-400 mt-1">{p.note}</p>}
                  {p.reversedAt && p.reversalReason && <p className="text-xs text-rust-500 mt-1">سبب العكس: {p.reversalReason}</p>}
                  {reversingId === p.id && (
                    <ReversePaymentForm
                      paymentId={p.id}
                      onCancel={() => setReversingId(null)}
                      onDone={() => {
                        setReversingId(null)
                        refreshAll()
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="لا توجد دفعات مسجلة لهذه القضية" />
          )}
        </div>
      )}
    </Modal>
  )
}

export default function Invoices() {
  const { currentUser } = useAuth()
  const canView = hasPermission(currentUser, 'finance.firm.read')
  const canRecord = hasPermission(currentUser, 'finance.payment.record')
  const canManage = hasPermission(currentUser, 'finance.manage')

  const [status, setStatus] = useState('ALL')
  const [selectedCase, setSelectedCase] = useState(null)
  const { data, loading, error, reload } = useFetch(() => (canView ? financeApi.summary() : Promise.resolve(null)), [canView])

  // Only Cases that actually have an agreed fee set belong on a finance list —
  // a Case with no fee yet has nothing to collect.
  const cases = useMemo(() => (data?.cases ?? []).filter((c) => Number(c.agreedFee) > 0).map((c) => ({ ...c, id: c.caseId })), [data])

  const tabs = [
    { value: 'ALL', label: 'الكل', count: cases.length },
    ...STATUS_TABS.map((s) => ({ value: s, label: CASE_FINANCE_STATUS[s].label, count: cases.filter((c) => c.status === s).length })),
  ]

  const filtered = cases.filter((c) => status === 'ALL' || c.status === status)

  const columns = [
    { key: 'caseNumber', header: 'رقم القضية', render: (r) => <span className="font-mono text-xs">{r.caseNumber}</span> },
    { key: 'agreedFee', header: 'الأتعاب المتفق عليها', render: (r) => <span className="font-mono">{sar(r.agreedFee)}</span> },
    { key: 'paid', header: 'المدفوع', render: (r) => <span className="font-mono">{sar(r.paid)}</span> },
    { key: 'remaining', header: 'المتبقي', render: (r) => <span className="font-mono">{sar(r.remaining)}</span> },
    { key: 'status', header: 'الحالة', sortable: false, render: (r) => <EnumBadge code={r.status} map={CASE_FINANCE_STATUS} /> },
  ]

  return (
    <div>
      <PageHeader title="الأتعاب والمدفوعات" />

      {!canView ? (
        <EmptyState message="لا تملك صلاحية عرض البيانات المالية" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            {[
              ['إجمالي قيمة القضايا', data?.totalCaseValue],
              ['إجمالي المحصّل', data?.totalCollected],
              ['إجمالي المستحق', data?.totalOutstanding],
            ].map(([label, value]) => (
              <div key={label} className="bg-white rounded-xl p-4 shadow-card border border-paper-line">
                <p className="text-xs text-ink-400 mb-1">{label}</p>
                <p className="font-mono text-lg font-semibold text-ink-800">{sar(value)}</p>
              </div>
            ))}
          </div>

          {!loading && !error && (
            <div className="mb-4">
              <Tabs tabs={tabs} active={status} onChange={setStatus} />
            </div>
          )}

          {loading && <LoadingBlock label="جاري تحميل البيانات المالية..." />}
          {error && <ErrorBlock error={error} onRetry={reload} />}

          {!loading &&
            !error &&
            (filtered.length ? (
              <DataTable columns={columns} data={filtered} onRowClick={(r) => setSelectedCase(r)} />
            ) : (
              <EmptyState message="لا توجد قضايا لها أتعاب متفق عليها بعد" />
            ))}

          {selectedCase && (
            <CaseFinanceModal
              caseId={selectedCase.caseId}
              caseNumber={selectedCase.caseNumber}
              canRecord={canRecord}
              canManage={canManage}
              onClose={() => setSelectedCase(null)}
              onChanged={reload}
            />
          )}
        </>
      )}
    </div>
  )
}
