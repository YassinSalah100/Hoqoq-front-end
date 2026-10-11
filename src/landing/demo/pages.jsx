import { useEffect, useRef, useState } from 'react'
import {
  Briefcase,
  CalendarDays,
  Clock,
  Plus,
  Download,
  Search,
  LayoutGrid,
  List,
  ChevronLeft,
  Gavel,
  User,
  Landmark,
  Scale,
  CheckCircle2,
  CalendarClock,
  AlertCircle,
  Check,
} from 'lucide-react'
import { Avatar, Badge, Btn, Card, Field, Modal, PageHeader, StatusPill, inputCls } from './ui'
import {
  CASE_STATUS,
  CASE_TYPES,
  COURTS,
  HEARING_STATUS,
  LAWYERS,
  PRIORITY,
  TRANSITIONS,
  longDate,
  money,
  num,
  paidOf,
  shortDate,
  todayIso,
} from './demoData'

// Counts toward the new value instead of jumping (stat cards, totals).
function useCountUp(value, duration = 600) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now()
    const a = from.current
    let raf
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      setShown(Math.round(a + (value - a) * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return shown
}

function StatCard({ label, value, icon: Icon, accent = 'gold', onClick, format = num }) {
  const shown = useCountUp(value)
  const accents = { gold: 'bg-brass-100 text-brass-600', rust: 'bg-rust-100 text-rust-600', ink: 'bg-ink-100 text-ink-600', green: 'bg-emerald-100 text-emerald-700' }
  return (
    <button type="button" onClick={onClick} className="text-right bg-white rounded-xl p-4 sm:p-5 shadow-card border border-paper-line hover:border-brass-300 transition-colors">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <p className="text-[12.5px] text-ink-400 mb-1">{label}</p>
          <p className="text-[26px] sm:text-3xl font-bold text-ink-800 font-mono truncate">{format(shown)}</p>
        </div>
        <span className={`p-2.5 rounded-xl shrink-0 ${accents[accent]}`}>
          <Icon size={17} />
        </span>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------- dashboard

export function DashboardPage({ state, go, openCase }) {
  const today = todayIso()
  const upcoming = state.hearings.filter((h) => h.status === 'SCHEDULED' && h.date >= today).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
  const fee = state.cases.reduce((s, c) => s + c.fee, 0)
  const paid = state.cases.reduce((s, c) => s + paidOf(c), 0)
  const pct = fee ? Math.round((paid / fee) * 100) : 0
  return (
    <>
      <PageHeader title="لوحة التحكم" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-4">
        <StatCard label="إجمالي القضايا" value={state.cases.length} icon={Briefcase} onClick={() => go('cases')} />
        <StatCard label="القضايا النشطة" value={state.cases.filter((c) => c.status === 'ACTIVE').length} icon={Briefcase} accent="green" onClick={() => go('cases')} />
        <StatCard label="مهام قيد الانتظار" value={state.tasks.filter((t) => !t.done).length} icon={Clock} accent="rust" onClick={() => go('tasks')} />
        <StatCard label="الجلسات القادمة" value={upcoming.length} icon={CalendarDays} accent="ink" onClick={() => go('hearings')} />
      </div>
      <div className="grid lg:grid-cols-[1.35fr_1fr] gap-4">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-paper-line">
            <h3 className="font-semibold text-ink-800 text-[15px]">الجلسات القادمة</h3>
            <button type="button" onClick={() => go('hearings')} className="text-[12.5px] text-brass-600 hover:underline">عرض الكل</button>
          </div>
          <table className="w-full text-[12.5px]">
            <thead className="text-ink-400">
              <tr className="border-b border-paper-line">
                <th className="text-right font-medium px-4 sm:px-5 py-2.5">التاريخ</th>
                <th className="text-right font-medium px-2 py-2.5">القضية</th>
                <th className="text-right font-medium px-4 sm:px-5 py-2.5">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.slice(0, 5).map((h) => {
                const c = state.cases.find((x) => x.id === h.caseId)
                return (
                  <tr key={h.id} onClick={() => openCase(c.id)} className="border-b border-paper-line last:border-0 hover:bg-paper-soft cursor-pointer">
                    <td className="px-4 sm:px-5 py-2.5 font-mono text-ink-600 whitespace-nowrap">{shortDate(h.date)} · <span dir="ltr">{h.time}</span></td>
                    <td className="px-2 py-2.5 text-ink-700 max-w-[180px] truncate">{c.title}</td>
                    <td className="px-4 sm:px-5 py-2.5"><Badge meta={HEARING_STATUS[h.status]} /></td>
                  </tr>
                )
              })}
              {upcoming.length === 0 && (
                <tr><td colSpan={3} className="text-center text-ink-400 py-6">لا توجد جلسات قادمة</td></tr>
              )}
            </tbody>
          </table>
        </Card>
        <Card className="p-4 sm:p-5">
          <h3 className="font-semibold text-ink-800 text-[15px] mb-4">الوضع المالي</h3>
          <div className="flex items-center gap-5">
            <div className="relative w-28 h-28 shrink-0 rounded-full transition-[background] duration-700" style={{ background: `conic-gradient(#B98B33 ${pct * 3.6}deg, #4A3A22 0)` }} aria-hidden="true">
              <div className="absolute inset-[16px] rounded-full bg-white flex items-center justify-center font-bold font-mono text-ink-800">{num(pct)}٪</div>
            </div>
            <dl className="flex-1 space-y-2.5 text-[12.5px]">
              <div className="flex justify-between gap-2"><dt className="flex items-center gap-1.5 text-ink-500"><span className="w-2 h-2 rounded-full bg-brass-500" />محصَّلة</dt><dd className="font-mono text-ink-800">{num(paid)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="flex items-center gap-1.5 text-ink-500"><span className="w-2 h-2 rounded-full bg-ink-600" />مستحقة</dt><dd className="font-mono text-ink-800">{num(fee - paid)}</dd></div>
              <div className="flex justify-between gap-2 pt-2.5 border-t border-paper-line"><dt className="text-ink-400">إجمالي أتعاب القضايا</dt><dd className="font-mono text-ink-600">{num(fee)}</dd></div>
            </dl>
          </div>
        </Card>
      </div>
    </>
  )
}

// ---------------------------------------------------------------- cases

const STATUS_TABS = [
  ['ALL', 'الكل'],
  ['DRAFT', 'مسودة'],
  ['ACTIVE', 'نشطة'],
  ['ON_HOLD', 'معلّقة'],
  ['CLOSED', 'مغلقة'],
]

function NewCaseModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ title: '', type: CASE_TYPES[0], client: '', court: COURTS[0], lawyer: LAWYERS[0], fee: '' })
  const [error, setError] = useState(null)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  function submit(e) {
    e.preventDefault()
    if (!form.title.trim()) return setError('عنوان القضية مطلوب')
    if (!form.client.trim()) return setError('اسم الموكل مطلوب')
    onCreate({ ...form, title: form.title.trim(), client: form.client.trim(), fee: Number(form.fee) || 0 })
  }
  return (
    <Modal title="قضية جديدة" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <Field label="عنوان القضية"><input autoFocus value={form.title} onChange={set('title')} placeholder="مثال: دعوى مطالبة مالية" className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="نوع القضية"><select value={form.type} onChange={set('type')} className={inputCls}>{CASE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="الأتعاب المتفق عليها"><input inputMode="numeric" dir="ltr" value={form.fee} onChange={(e) => setForm((f) => ({ ...f, fee: e.target.value.replace(/[^\d]/g, '') }))} placeholder="0" className={`${inputCls} text-right`} /></Field>
        </div>
        <Field label="الموكل"><input value={form.client} onChange={set('client')} placeholder="اسم الموكل" className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="المحكمة"><select value={form.court} onChange={set('court')} className={inputCls}>{COURTS.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="المحامي المسؤول"><select value={form.lawyer} onChange={set('lawyer')} className={inputCls}>{LAWYERS.map((l) => <option key={l}>{l}</option>)}</select></Field>
        </div>
        {error && <p className="flex items-center gap-1.5 text-[12.5px] text-rust-600"><AlertCircle size={14} />{error}</p>}
        <div className="flex justify-end gap-2 pt-3 mt-1 border-t border-paper-line">
          <Btn variant="secondary" onClick={onClose}>إلغاء</Btn>
          <Btn type="submit">إنشاء القضية</Btn>
        </div>
      </form>
    </Modal>
  )
}

export function CasesPage({ state, openCase, dispatch, notify }) {
  const [tab, setTab] = useState('ALL')
  const [q, setQ] = useState('')
  const [view, setView] = useState('table')
  const [creating, setCreating] = useState(false)
  const rows = state.cases.filter((c) => (tab === 'ALL' || c.status === tab) && (!q.trim() || `${c.title} ${c.client} ${c.number}`.includes(q.trim())))
  return (
    <>
      <PageHeader
        title="القضايا"
        actions={
          <>
            <Btn variant="secondary" onClick={() => notify('في التطبيق يُصدَّر الجدول ملف PDF')} className="hidden sm:inline-flex"><Download size={15} />تصدير</Btn>
            <Btn onClick={() => setCreating(true)}><Plus size={15} />قضية جديدة</Btn>
          </>
        }
      />
      <div className="flex gap-1 border-b border-paper-line mb-4 overflow-x-auto no-scrollbar">
        {STATUS_TABS.map(([key, label]) => {
          const count = key === 'ALL' ? state.cases.length : state.cases.filter((c) => c.status === key).length
          return (
            <button key={key} type="button" onClick={() => setTab(key)} className={`relative shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-[13px] transition-colors ${tab === key ? 'text-brass-700 font-medium' : 'text-ink-500 hover:text-ink-700'}`}>
              {label}
              <span className={`min-w-5 px-1.5 rounded-full text-[11px] font-mono ${tab === key ? 'bg-brass-100 text-brass-700' : 'bg-paper-soft text-ink-400'}`}>{num(count)}</span>
              {tab === key && <span className="absolute inset-x-1 -bottom-px h-0.5 bg-brass-500 rounded-full" />}
            </button>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالرقم أو العنوان أو اسم الموكل..." className={`${inputCls} bg-white pr-9`} />
        </label>
        <div className="inline-flex rounded-lg border border-paper-line bg-white p-0.5">
          {[['table', List, 'جدول'], ['cards', LayoutGrid, 'بطاقات']].map(([key, Icon, label]) => (
            <button key={key} type="button" onClick={() => setView(key)} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12.5px] transition-colors ${view === key ? 'bg-ink-800 text-white' : 'text-ink-500 hover:text-ink-700'}`}>
              <Icon size={14} /><span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {view === 'table' ? (
        <Card className="overflow-x-auto">
          <table className="w-full text-[12.5px] min-w-[620px]">
            <thead className="text-ink-400">
              <tr className="border-b border-paper-line">
                {['القضية', 'الموكل', 'النوع', 'المحامي المسؤول', 'الحالة', ''].map((h) => <th key={h} className="text-right font-medium px-4 py-3">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} onClick={() => openCase(c.id)} className="hero-in border-b border-paper-line last:border-0 hover:bg-paper-soft cursor-pointer">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-800">{c.title}</p>
                    <p className="text-[11.5px] text-ink-400 font-mono mt-0.5">{c.number} / {c.year}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-700">{c.client}</td>
                  <td className="px-4 py-3 text-ink-600">{c.type}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-2 text-ink-700"><Avatar name={c.lawyer} size="sm" />{c.lawyer}</span></td>
                  <td className="px-4 py-3"><StatusPill status={c.status} /></td>
                  <td className="px-3 py-3 text-ink-300"><ChevronLeft size={16} /></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="text-center text-ink-400 py-10">لا توجد قضايا مطابقة</td></tr>}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {rows.map((c) => (
            <button key={c.id} type="button" onClick={() => openCase(c.id)} className="hero-in text-right bg-white rounded-xl shadow-card border border-paper-line p-4 hover:border-brass-300 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[11.5px] text-ink-400 font-mono">{c.number} / {c.year}</span>
                <StatusPill status={c.status} />
              </div>
              <p className="font-semibold text-ink-800 text-[14px]">{c.title}</p>
              <p className="text-[12.5px] text-ink-500 mt-1 flex items-center gap-1.5"><User size={13} />{c.client}</p>
              <p className="text-[12.5px] text-ink-500 mt-1 flex items-center gap-1.5 truncate"><Landmark size={13} />{c.court}</p>
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-paper-line text-[12px] text-ink-500">
                <span className="inline-flex items-center gap-1.5"><Avatar name={c.lawyer} size="sm" />{c.lawyer}</span>
                <span>{c.type}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {creating && (
        <NewCaseModal
          onClose={() => setCreating(false)}
          onCreate={(data) => {
            const id = dispatch({ type: 'createCase', data })
            setCreating(false)
            notify('تم إنشاء القضية كمسودة')
            openCase(id)
          }}
        />
      )}
    </>
  )
}

// ---------------------------------------------------------------- case detail

const METHODS = ['نقدي', 'تحويل بنكي', 'شيك', 'محفظة إلكترونية']

export function CaseDetailPage({ state, caseId, back, dispatch, notify }) {
  const c = state.cases.find((x) => x.id === caseId)
  const [tab, setTab] = useState('overview')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState(METHODS[0])
  const [error, setError] = useState(null)
  const paid = paidOf(c)
  const remaining = Math.max(0, c.fee - paid)
  const pct = c.fee ? Math.round((paid / c.fee) * 100) : 0
  const shownPaid = useCountUp(paid)
  const caseHearings = state.hearings.filter((h) => h.caseId === c.id)
  const readOnly = c.status === 'CLOSED'

  function record(value) {
    const n = Number(value)
    setError(null)
    if (readOnly) return setError('القضية مغلقة — لا يمكن تسجيل دفعات جديدة')
    if (!n || n <= 0) return setError('أدخل مبلغًا صحيحًا')
    if (n > remaining) return setError(`المبلغ يتجاوز المتبقي (${money(remaining)})`)
    dispatch({ type: 'pay', caseId: c.id, amount: n, method })
    setAmount('')
    notify(`تم تسجيل دفعة ${money(n)}`)
  }

  return (
    <>
      <PageHeader
        title={c.title}
        breadcrumb={
          <>
            <button type="button" onClick={back} className="hover:text-brass-600">القضايا</button>
            <ChevronLeft size={13} />
            <span className="truncate">{c.title}</span>
          </>
        }
        actions={<StatusPill status={c.status} />}
      />
      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] text-ink-500 ml-1">تغيير الحالة:</span>
          {TRANSITIONS[c.status].map((to) => (
            <Btn
              key={to}
              variant={to === 'ACTIVE' ? 'primary' : 'secondary'}
              className="!py-1.5 !px-3"
              onClick={() => {
                dispatch({ type: 'status', caseId: c.id, status: to })
                notify(`تم تغيير الحالة إلى «${CASE_STATUS[to].label}»`)
              }}
            >
              {to === 'ACTIVE' && c.status !== 'DRAFT' ? 'إعادة فتح' : to === 'ACTIVE' ? 'تفعيل القضية' : to === 'ON_HOLD' ? 'تعليق' : 'إغلاق القضية'}
            </Btn>
          ))}
        </div>
      </Card>

      <div className="flex gap-1 border-b border-paper-line mb-4">
        {[['overview', 'نظرة عامة'], ['hearings', `الجلسات (${num(caseHearings.length)})`], ['finance', 'المالية']].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`relative px-3.5 py-2.5 text-[13px] transition-colors ${tab === key ? 'text-brass-700 font-medium' : 'text-ink-500 hover:text-ink-700'}`}>
            {label}
            {tab === key && <span className="absolute inset-x-1 -bottom-px h-0.5 bg-brass-500 rounded-full" />}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div key="o" className="hero-in grid sm:grid-cols-2 gap-3">
          {[
            [User, 'الموكل', `${c.client} (${c.clientType})`],
            [Scale, 'الخصم', c.opponent],
            [Landmark, 'المحكمة', c.court],
            [Gavel, 'المحامي المسؤول', c.lawyer],
            [Briefcase, 'نوع القضية', c.type],
            [CalendarDays, 'تاريخ الفتح', longDate(c.opened)],
          ].map(([Icon, k, v]) => (
            <Card key={k} className="p-3.5 flex items-start gap-3">
              <span className="p-2 rounded-lg bg-brass-100 text-brass-600 shrink-0"><Icon size={15} /></span>
              <div className="min-w-0">
                <p className="text-[11.5px] text-ink-400">{k}</p>
                <p className="text-[13px] font-medium text-ink-800 truncate">{v}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'hearings' && (
        <Card key="h" className="hero-in overflow-hidden">
          {caseHearings.map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-paper-line last:border-0 text-[12.5px]">
              <div>
                <p className="font-medium text-ink-800">{h.kind}</p>
                <p className="text-ink-400 font-mono mt-0.5">{longDate(h.date)} · <span dir="ltr">{h.time}</span></p>
              </div>
              <Badge meta={HEARING_STATUS[h.status]} />
            </div>
          ))}
          {caseHearings.length === 0 && <p className="text-center text-ink-400 text-[13px] py-8">لا توجد جلسات لهذه القضية</p>}
        </Card>
      )}

      {tab === 'finance' && (
        <div key="f" className="hero-in space-y-3">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[['الأتعاب المتفق عليها', money(c.fee), 'text-ink-800'], ['المحصَّل', money(shownPaid), 'text-emerald-700'], ['المتبقي', money(remaining), 'text-ink-800']].map(([k, v, cls]) => (
              <Card key={k} className="p-3 text-center">
                <p className="text-[11.5px] text-ink-400">{k}</p>
                <p className={`text-[13px] sm:text-[15px] font-bold font-mono mt-1 ${cls}`}>{v}</p>
              </Card>
            ))}
          </div>
          <div className="h-2 rounded-full bg-paper-soft overflow-hidden">
            <div className="h-full rounded-full bg-brass-500 transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
          </div>
          {remaining > 0 ? (
            <Card className="p-4">
              <p className="text-[13px] font-semibold text-ink-800 mb-3">تسجيل دفعة</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[5000, 10000, remaining].filter((v, i, a) => v > 0 && v <= remaining && a.indexOf(v) === i).map((v) => (
                  <button key={v} type="button" onClick={() => record(v)} className="rounded-lg border border-paper-line px-2.5 py-1.5 text-[12px] text-ink-600 hover:border-brass-400 hover:text-brass-700 transition-colors">
                    + {v === remaining ? 'كامل المتبقي' : money(v)}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input inputMode="numeric" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))} placeholder="المبلغ" className={`${inputCls} text-right min-w-0`} />
                <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${inputCls} !w-auto`}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
                <Btn onClick={() => record(amount)} className="shrink-0"><Plus size={14} />تسجيل</Btn>
              </div>
              {error && <p className="hero-in mt-2 flex items-center gap-1.5 text-[12.5px] text-rust-600"><AlertCircle size={14} />{error}</p>}
            </Card>
          ) : (
            <p className="hero-in flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-3 text-[13px] text-emerald-700 font-medium"><CheckCircle2 size={16} />تم سداد الأتعاب بالكامل</p>
          )}
          <Card className="overflow-hidden">
            <p className="px-4 py-3 border-b border-paper-line text-[13px] font-semibold text-ink-800">سجل الدفعات</p>
            {c.payments.map((p, i) => (
              <div key={p.id} className={`flex items-center justify-between px-4 py-2.5 border-b border-paper-line last:border-0 text-[12.5px] ${i === 0 ? 'hero-in' : ''}`}>
                <span className="text-ink-500">{p.method} · {shortDate(p.date)}</span>
                <span className="font-mono font-semibold text-ink-800">{money(p.amount)}</span>
              </div>
            ))}
            {c.payments.length === 0 && <p className="text-center text-ink-400 text-[12.5px] py-5">لا توجد دفعات بعد</p>}
          </Card>
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------- hearings

export function HearingsPage({ state, dispatch, notify, openCase }) {
  const today = todayIso()
  const rows = [...state.hearings].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
  const todays = rows.filter((h) => h.date === today && h.status === 'SCHEDULED')
  return (
    <>
      <PageHeader title="الجلسات" actions={<Btn onClick={() => notify('في التطبيق تُجدول الجلسة وتُسند لمحامٍ')}><Plus size={15} />جدولة جلسة</Btn>} />
      <div className="flex items-center gap-2 rounded-xl bg-brass-100/60 border border-brass-200 px-4 py-3 mb-4">
        <CalendarClock size={17} className="text-brass-600" />
        <span className="font-semibold text-ink-800 text-[14px]">جلسات اليوم</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[11.5px] text-ink-600 font-mono">{num(todays.length)} جلسات</span>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-[12.5px] min-w-[620px]">
          <thead className="text-ink-400">
            <tr className="border-b border-paper-line">
              {['التاريخ والوقت', 'القضية', 'المحكمة', 'نوع الجلسة', 'الحالة', ''].map((h) => <th key={h} className="text-right font-medium px-4 py-3">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => {
              const c = state.cases.find((x) => x.id === h.caseId)
              return (
                <tr key={h.id} className={`border-b border-paper-line last:border-0 ${h.date === today ? 'bg-brass-50/60' : ''}`}>
                  <td className="px-4 py-3 font-mono text-ink-600 whitespace-nowrap">{shortDate(h.date)} · <span dir="ltr">{h.time}</span></td>
                  <td className="px-4 py-3"><button type="button" onClick={() => openCase(c.id)} className="text-ink-800 hover:text-brass-600 font-medium text-right">{c.title}</button></td>
                  <td className="px-4 py-3 text-ink-600">{c.court}</td>
                  <td className="px-4 py-3 text-ink-600">{h.kind}</td>
                  <td className="px-4 py-3"><Badge meta={HEARING_STATUS[h.status]} /></td>
                  <td className="px-3 py-3">
                    {h.status === 'SCHEDULED' && (
                      <div className="flex items-center gap-1">
                        <button type="button" title="انعقدت" aria-label="انعقدت" onClick={() => { dispatch({ type: 'hearing', id: h.id, status: 'COMPLETED' }); notify('تم تسجيل انعقاد الجلسة') }} className="p-1.5 rounded-lg text-ink-400 hover:text-emerald-700 hover:bg-emerald-100"><CheckCircle2 size={16} /></button>
                        <button type="button" title="تأجيل" aria-label="تأجيل" onClick={() => { dispatch({ type: 'hearing', id: h.id, status: 'POSTPONED' }); notify('تم تأجيل الجلسة') }} className="p-1.5 rounded-lg text-ink-400 hover:text-brass-700 hover:bg-brass-100"><CalendarClock size={16} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </>
  )
}

// ---------------------------------------------------------------- clients

export function ClientsPage({ state, openCase }) {
  const clients = Object.values(
    state.cases.reduce((acc, c) => {
      acc[c.client] ??= { name: c.client, type: c.clientType, cases: [] }
      acc[c.client].cases.push(c)
      return acc
    }, {}),
  )
  return (
    <>
      <PageHeader title="الموكلين" />
      <div className="grid sm:grid-cols-2 gap-3">
        {clients.map((cl) => {
          const due = cl.cases.reduce((s, c) => s + Math.max(0, c.fee - paidOf(c)), 0)
          return (
            <Card key={cl.name} className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={cl.name} />
                <div className="min-w-0">
                  <p className="font-semibold text-ink-800 text-[14px] truncate">{cl.name}</p>
                  <p className="text-[12px] text-ink-400">{cl.type} · {num(cl.cases.length)} قضية</p>
                </div>
              </div>
              {cl.cases.map((c) => (
                <button key={c.id} type="button" onClick={() => openCase(c.id)} className="w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[12.5px] hover:bg-paper-soft text-right">
                  <span className="truncate text-ink-700">{c.title}</span>
                  <StatusPill status={c.status} />
                </button>
              ))}
              <p className="flex justify-between pt-2.5 mt-2 border-t border-paper-line text-[12px]"><span className="text-ink-400">المستحق على الموكل</span><span className="font-mono text-ink-800">{money(due)}</span></p>
            </Card>
          )
        })}
      </div>
    </>
  )
}

// ---------------------------------------------------------------- tasks

export function TasksPage({ state, dispatch, notify }) {
  const today = todayIso()
  const done = state.tasks.filter((t) => t.done).length
  return (
    <>
      <PageHeader title="المهام" actions={<span className="text-[12.5px] text-ink-500 font-mono">{num(done)} / {num(state.tasks.length)} منجزة</span>} />
      <div className="h-1.5 rounded-full bg-paper-soft overflow-hidden mb-4">
        <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-700" style={{ width: `${(done / state.tasks.length) * 100}%` }} />
      </div>
      <div className="space-y-2.5">
        {state.tasks.map((t) => {
          const c = state.cases.find((x) => x.id === t.caseId)
          const overdue = !t.done && t.due < today
          return (
            <Card key={t.id} className={`p-3.5 flex items-start gap-3 transition-opacity ${t.done ? 'opacity-60' : ''}`}>
              <button
                type="button"
                aria-label={t.done ? 'إلغاء الإنجاز' : 'تمت'}
                onClick={() => { dispatch({ type: 'task', id: t.id }); if (!t.done) notify('تم إنجاز المهمة') }}
                className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${t.done ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-ink-200 hover:border-brass-500'}`}
              >
                {t.done && <Check size={13} strokeWidth={3} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-[13.5px] font-medium text-ink-800 ${t.done ? 'line-through' : ''}`}>{t.title}</p>
                <p className="text-[12px] text-ink-400 truncate mt-0.5">{c.title}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-[11.5px]">
                  <Badge meta={PRIORITY[t.priority]} />
                  <span className={`inline-flex items-center gap-1 ${overdue ? 'text-rust-600 font-medium' : 'text-ink-500'}`}><Clock size={12} />{overdue ? 'متأخرة · ' : ''}{shortDate(t.due)}</span>
                  <span className="inline-flex items-center gap-1 text-ink-500"><Avatar name={t.owner} size="sm" className="!w-5 !h-5 !text-[10px]" />{t.owner}</span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}

// ---------------------------------------------------------------- finance reports

export function ReportsPage({ state, openCase }) {
  const fee = state.cases.reduce((s, c) => s + c.fee, 0)
  const paid = state.cases.reduce((s, c) => s + paidOf(c), 0)
  const shownPaid = useCountUp(paid)
  const top = [...state.cases].map((c) => ({ c, due: Math.max(0, c.fee - paidOf(c)) })).filter((x) => x.due > 0).sort((a, b) => b.due - a.due)
  const max = top[0]?.due || 1
  return (
    <>
      <PageHeader title="التقارير المالية" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {[['إجمالي قيمة القضايا', fee], ['إجمالي المحصَّل', shownPaid], ['إجمالي المستحق', fee - paid]].map(([k, v]) => (
          <Card key={k} className="p-4">
            <p className="text-[12.5px] text-ink-400">{k}</p>
            <p className="text-[20px] font-bold font-mono text-ink-800 mt-1">{money(v)}</p>
          </Card>
        ))}
      </div>
      <Card className="p-4 sm:p-5">
        <h3 className="font-semibold text-ink-800 text-[15px] mb-4">أعلى القضايا مبالغ مستحقة</h3>
        <div className="space-y-3">
          {top.map(({ c, due }, i) => (
            <button key={c.id} type="button" onClick={() => openCase(c.id)} className="w-full text-right group">
              <div className="flex justify-between gap-3 text-[12.5px] mb-1">
                <span className="truncate text-ink-700 group-hover:text-brass-600">{c.title}</span>
                <span className="font-mono text-ink-800 shrink-0">{money(due)}</span>
              </div>
              <div className="h-2.5 rounded-full bg-paper-soft overflow-hidden">
                <div className={`h-full rounded-full transition-[width] duration-700 ${i === 0 ? 'bg-ink-800' : 'bg-brass-500'}`} style={{ width: `${(due / max) * 100}%` }} />
              </div>
            </button>
          ))}
          {top.length === 0 && <p className="text-center text-ink-400 text-[13px] py-6">تم تحصيل كل الأتعاب</p>}
        </div>
      </Card>
    </>
  )
}

