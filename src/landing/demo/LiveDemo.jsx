import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  LayoutGrid,
  Briefcase,
  CalendarDays,
  ListChecks,
  Search,
  ArrowRight,
  CircleCheck,
  Plus,
  RotateCcw,
  Wallet,
  Gavel,
  User,
  Landmark,
  MousePointerClick,
  AlertCircle,
  Check,
} from 'lucide-react'
import { initialDemoState, CASE_STATUS, HEARING_STATUS, PRIORITY, money, paidOf, todayIso, prettyDate } from './demoData'

// ---------------------------------------------------------------- state

function reducer(state, action) {
  switch (action.type) {
    case 'reset':
      return initialDemoState()
    case 'pay':
      return {
        ...state,
        cases: state.cases.map((c) =>
          c.id === action.caseId
            ? { ...c, payments: [{ id: `p${Date.now()}`, amount: action.amount, method: action.method, date: todayIso() }, ...c.payments] }
            : c,
        ),
      }
    case 'activate':
      return { ...state, cases: state.cases.map((c) => (c.id === action.caseId ? { ...c, status: 'ACTIVE' } : c)) }
    case 'hearing':
      return { ...state, hearings: state.hearings.map((h) => (h.id === action.id ? { ...h, status: action.status } : h)) }
    case 'task':
      return { ...state, tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t)) }
    default:
      return state
  }
}

// Number that counts toward its new value instead of jumping.
function useAnimatedNumber(value, duration = 650) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now()
    const a = from.current
    let raf
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(Math.round(a + (value - a) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return shown
}

function Pill({ meta }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold whitespace-nowrap ${meta.cls}`}>{meta.label}</span>
}

function Stat({ icon: Icon, label, value, format = (v) => v.toLocaleString('ar-EG'), tone = 'gold', onClick }) {
  const shown = useAnimatedNumber(value)
  const tones = { gold: 'bg-brand-gold/15 text-brand-gold', green: 'bg-emerald-100 text-emerald-700', rust: 'bg-rust-100 text-rust-500', brown: 'bg-brand-brown/10 text-brand-brown' }
  return (
    <button type="button" onClick={onClick} className="text-right rounded-2xl bg-white border border-brand-border p-3.5 sm:p-4 hover:border-brand-gold/50 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] text-brand-brown/55">{label}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-2 text-[22px] sm:text-[24px] font-bold tabular-nums">{format(shown)}</p>
    </button>
  )
}

// ---------------------------------------------------------------- views

function Dashboard({ state, go, openCase, dispatch, notify }) {
  const today = todayIso()
  const active = state.cases.filter((c) => c.status === 'ACTIVE').length
  const todays = state.hearings.filter((h) => h.date === today)
  const openTasks = state.tasks.filter((t) => !t.done).length
  const totalFee = state.cases.reduce((s, c) => s + c.fee, 0)
  const totalPaid = state.cases.reduce((s, c) => s + paidOf(c), 0)
  const pct = Math.round((totalPaid / totalFee) * 100)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Stat icon={Briefcase} label="القضايا النشطة" value={active} onClick={() => go('cases')} />
        <Stat icon={CalendarDays} label="جلسات اليوم" value={todays.filter((h) => h.status === 'SCHEDULED').length} tone="brown" onClick={() => go('hearings')} />
        <Stat icon={ListChecks} label="مهام مفتوحة" value={openTasks} tone="rust" onClick={() => go('tasks')} />
        <Stat icon={Wallet} label="المستحق" value={totalFee - totalPaid} format={(v) => money(v)} tone="green" />
      </div>
      <div className="grid lg:grid-cols-[1.25fr_1fr] gap-3">
        <div className="rounded-2xl bg-white border border-brand-border p-4">
          <p className="font-semibold text-[14px] mb-3">جلسات اليوم</p>
          {todays.length === 0 && <p className="text-[13px] text-brand-brown/50">لا توجد جلسات اليوم.</p>}
          <ul className="space-y-2">
            {todays.map((h) => {
              const c = state.cases.find((x) => x.id === h.caseId)
              return (
                <li key={h.id} className="flex items-center gap-3 rounded-xl bg-brand-cream-light border border-brand-border/70 px-3 py-2.5">
                  <span className="text-[12px] font-semibold tabular-nums text-brand-tagline w-11 shrink-0" dir="ltr">
                    {h.time}
                  </span>
                  <button type="button" onClick={() => openCase(c.id)} className="flex-1 min-w-0 text-right">
                    <span className="block text-[13px] font-medium truncate hover:text-brand-gold">{c.title}</span>
                    <span className="block text-[11.5px] text-brand-brown/50 truncate">{h.kind} · {c.court}</span>
                  </button>
                  {h.status === 'SCHEDULED' ? (
                    <button
                      type="button"
                      onClick={() => {
                        dispatch({ type: 'hearing', id: h.id, status: 'COMPLETED' })
                        notify('تم تسجيل انعقاد الجلسة')
                      }}
                      className="shrink-0 rounded-lg border border-brand-border px-2.5 py-1 text-[11.5px] font-medium hover:border-emerald-500 hover:text-emerald-700 transition-colors"
                    >
                      تمت
                    </button>
                  ) : (
                    <Pill meta={HEARING_STATUS[h.status]} />
                  )}
                </li>
              )
            })}
          </ul>
        </div>
        <div className="rounded-2xl bg-white border border-brand-border p-4">
          <p className="font-semibold text-[14px] mb-4">الوضع المالي للمكتب</p>
          <div className="flex items-center gap-5">
            <div
              className="relative w-24 h-24 shrink-0 rounded-full transition-[background] duration-700"
              style={{ background: `conic-gradient(#B98B33 ${pct * 3.6}deg, #3a2c17 0)` }}
              aria-hidden="true"
            >
              <div className="absolute inset-[14px] rounded-full bg-white flex items-center justify-center text-[15px] font-bold tabular-nums">
                {pct.toLocaleString('ar-EG')}٪
              </div>
            </div>
            <dl className="space-y-2 text-[12.5px] flex-1">
              <div className="flex justify-between gap-2"><dt className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand-gold" />محصَّل</dt><dd className="font-semibold tabular-nums">{money(totalPaid)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#3a2c17]" />مستحق</dt><dd className="font-semibold tabular-nums">{money(totalFee - totalPaid)}</dd></div>
              <div className="flex justify-between gap-2 pt-2 border-t border-brand-border text-brand-brown/55"><dt>إجمالي الأتعاب</dt><dd className="tabular-nums">{money(totalFee)}</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

const FILTERS = [
  ['ALL', 'الكل'],
  ['ACTIVE', 'نشطة'],
  ['ON_HOLD', 'معلّقة'],
  ['DRAFT', 'مسودة'],
]

function CasesList({ state, openCase }) {
  const [filter, setFilter] = useState('ALL')
  const [q, setQ] = useState('')
  const rows = state.cases.filter(
    (c) => (filter === 'ALL' || c.status === filter) && (!q.trim() || `${c.title} ${c.client} ${c.number}`.includes(q.trim())),
  )
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-1 px-1">
          {FILTERS.map(([key, label]) => {
            const count = key === 'ALL' ? state.cases.length : state.cases.filter((c) => c.status === key).length
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                  filter === key ? 'bg-brand-brown text-brand-cream' : 'bg-white border border-brand-border text-brand-brown/65 hover:border-brand-gold/50'
                }`}
              >
                {label} <span className="opacity-60 tabular-nums">{count.toLocaleString('ar-EG')}</span>
              </button>
            )
          })}
        </div>
        <label className="relative sm:w-56">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-brown/35" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بالعنوان أو الموكل..."
            className="w-full rounded-lg border border-brand-border bg-white pr-9 pl-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold"
          />
        </label>
      </div>
      <ul className="space-y-2">
        {rows.map((c) => {
          const pct = Math.round((paidOf(c) / c.fee) * 100)
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => openCase(c.id)}
                className="group w-full text-right rounded-xl bg-white border border-brand-border px-3.5 py-3 hover:border-brand-gold/55 hover:shadow-[0_10px_24px_-18px_rgba(43,32,16,0.5)] transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold truncate group-hover:text-brand-gold transition-colors">{c.title}</p>
                    <p className="text-[11.5px] text-brand-brown/50 truncate mt-0.5">{c.client} · {c.court}</p>
                  </div>
                  <Pill meta={CASE_STATUS[c.status]} />
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-brand-cream overflow-hidden">
                    <div className="h-full rounded-full bg-brand-gold transition-[width] duration-700" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] text-brand-brown/45 tabular-nums w-20 text-left">{pct.toLocaleString('ar-EG')}٪ محصَّل</span>
                </div>
              </button>
            </li>
          )
        })}
        {rows.length === 0 && <li className="text-center text-[13px] text-brand-brown/50 py-8">لا توجد قضايا مطابقة.</li>}
      </ul>
    </div>
  )
}

const METHODS = ['نقدي', 'تحويل بنكي', 'شيك', 'محفظة إلكترونية']

function CaseDetail({ state, caseId, back, dispatch, notify }) {
  const c = state.cases.find((x) => x.id === caseId)
  const [tab, setTab] = useState('finance')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState(METHODS[0])
  const [error, setError] = useState(null)
  const paid = paidOf(c)
  const remaining = c.fee - paid
  const pct = Math.round((paid / c.fee) * 100)
  const shownPaid = useAnimatedNumber(paid)
  const caseHearings = state.hearings.filter((h) => h.caseId === c.id)

  function record(value) {
    const n = Number(value)
    setError(null)
    if (!n || n <= 0) return setError('أدخل مبلغًا صحيحًا')
    if (n > remaining) return setError(`المبلغ يتجاوز المتبقي (${money(remaining)}) — حقوق يمنع السداد الزائد`)
    dispatch({ type: 'pay', caseId: c.id, amount: n, method })
    setAmount('')
    notify(`تم تسجيل دفعة ${money(n)}`)
  }

  return (
    <div className="hero-in space-y-3">
      <button type="button" onClick={back} className="inline-flex items-center gap-1.5 text-[12.5px] text-brand-brown/55 hover:text-brand-brown">
        <ArrowRight size={15} />
        كل القضايا
      </button>
      <div className="rounded-2xl bg-white border border-brand-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="font-bold text-[16px] leading-snug">{c.title}</h4>
            <p className="text-[12px] text-brand-brown/50 mt-1">رقم {c.number} · {c.type}</p>
          </div>
          <Pill meta={CASE_STATUS[c.status]} />
        </div>
        {c.status === 'DRAFT' && (
          <button
            type="button"
            onClick={() => {
              dispatch({ type: 'activate', caseId: c.id })
              notify('تم تفعيل القضية')
            }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-brown text-brand-cream px-3 py-1.5 text-[12.5px] font-medium hover:bg-[#3a2c17]"
          >
            <CircleCheck size={14} /> تفعيل القضية
          </button>
        )}
        <div className="mt-4 flex gap-1 border-b border-brand-border">
          {[
            ['finance', 'المالية'],
            ['info', 'البيانات'],
            ['hearings', `الجلسات (${caseHearings.length.toLocaleString('ar-EG')})`],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`relative px-3 py-2 text-[13px] font-medium transition-colors ${tab === key ? 'text-brand-brown' : 'text-brand-brown/45 hover:text-brand-brown'}`}
            >
              {label}
              {tab === key && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-gold" />}
            </button>
          ))}
        </div>

        {tab === 'finance' && (
          <div key="f" className="hero-in pt-4 space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-brand-cream-light border border-brand-border/70 p-2.5">
                <p className="text-[11px] text-brand-brown/50">الأتعاب</p>
                <p className="text-[13px] font-bold tabular-nums mt-0.5">{money(c.fee)}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-2.5">
                <p className="text-[11px] text-emerald-700/70">المحصَّل</p>
                <p className="text-[13px] font-bold tabular-nums mt-0.5 text-emerald-700">{money(shownPaid)}</p>
              </div>
              <div className="rounded-xl bg-brand-cream-light border border-brand-border/70 p-2.5">
                <p className="text-[11px] text-brand-brown/50">المتبقي</p>
                <p className="text-[13px] font-bold tabular-nums mt-0.5">{money(remaining)}</p>
              </div>
            </div>
            <div className="h-2.5 rounded-full bg-brand-cream overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-l from-brand-gold-light to-brand-gold transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
            </div>

            {remaining > 0 ? (
              <div className="rounded-xl border border-dashed border-brand-gold/50 bg-brand-cream-light p-3 space-y-2.5">
                <p className="text-[12.5px] font-semibold">تسجيل دفعة</p>
                <div className="flex flex-wrap gap-1.5">
                  {[5000, 10000, remaining].filter((v, i, a) => v > 0 && v <= remaining && a.indexOf(v) === i).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => record(v)}
                      className="rounded-lg bg-white border border-brand-border px-2.5 py-1.5 text-[12px] font-medium hover:border-brand-gold hover:text-brand-tagline transition-colors"
                    >
                      + {v === remaining ? `كامل المتبقي` : money(v)}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    inputMode="numeric"
                    dir="ltr"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="مبلغ آخر"
                    className="flex-1 min-w-0 rounded-lg border border-brand-border bg-white px-3 py-2 text-[13px] text-right focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold"
                  />
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="rounded-lg border border-brand-border bg-white px-2 py-2 text-[12.5px] focus:outline-none focus:border-brand-gold"
                  >
                    {METHODS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => record(amount)}
                    className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-brand-gold hover:bg-brand-tagline text-white px-3 py-2 text-[12.5px] font-semibold transition-colors"
                  >
                    <Plus size={14} /> سجّل
                  </button>
                </div>
                {error && (
                  <p className="hero-in flex items-center gap-1.5 text-[12px] text-rust-500">
                    <AlertCircle size={14} /> {error}
                  </p>
                )}
              </div>
            ) : (
              <p className="hero-in flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5 text-[12.5px] text-emerald-700 font-medium">
                <CircleCheck size={16} /> تم سداد الأتعاب بالكامل
              </p>
            )}

            <ul className="space-y-1.5">
              {c.payments.map((p, i) => (
                <li key={p.id} className={`flex items-center justify-between text-[12.5px] rounded-lg px-3 py-2 bg-brand-cream-light ${i === 0 ? 'hero-in' : ''}`}>
                  <span className="text-brand-brown/60">{p.method} · {new Date(`${p.date}T12:00:00`).toLocaleDateString('ar-EG')}</span>
                  <span className="font-semibold tabular-nums">{money(p.amount)}</span>
                </li>
              ))}
              {c.payments.length === 0 && <li className="text-[12px] text-brand-brown/45">لا توجد دفعات بعد.</li>}
            </ul>
          </div>
        )}

        {tab === 'info' && (
          <dl key="i" className="hero-in pt-4 grid sm:grid-cols-2 gap-3 text-[13px]">
            {[
              [User, 'الموكل', c.client],
              [Landmark, 'المحكمة', c.court],
              [Gavel, 'المحامي المسؤول', c.lawyer],
              [Briefcase, 'نوع القضية', c.type],
            ].map(([Icon, k, v]) => (
              <div key={k} className="flex items-start gap-2.5 rounded-xl bg-brand-cream-light border border-brand-border/70 p-3">
                <Icon size={16} className="text-brand-gold mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <dt className="text-[11.5px] text-brand-brown/50">{k}</dt>
                  <dd className="font-medium truncate">{v}</dd>
                </div>
              </div>
            ))}
          </dl>
        )}

        {tab === 'hearings' && (
          <ul key="h" className="hero-in pt-4 space-y-2">
            {caseHearings.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2 rounded-xl bg-brand-cream-light border border-brand-border/70 px-3 py-2.5 text-[12.5px]">
                <span>
                  <span className="font-medium">{h.kind}</span>
                  <span className="text-brand-brown/50"> · {prettyDate(h.date)}</span>
                </span>
                <Pill meta={HEARING_STATUS[h.status]} />
              </li>
            ))}
            {caseHearings.length === 0 && <li className="text-[12.5px] text-brand-brown/45">لا توجد جلسات لهذه القضية.</li>}
          </ul>
        )}
      </div>
    </div>
  )
}

function Hearings({ state, dispatch, notify, openCase }) {
  const today = todayIso()
  const sorted = [...state.hearings].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
  const groups = [
    ['اليوم', sorted.filter((h) => h.date === today)],
    ['القادمة', sorted.filter((h) => h.date > today)],
    ['السابقة', sorted.filter((h) => h.date < today)],
  ]
  return (
    <div className="space-y-4">
      {groups.map(([title, list]) =>
        list.length ? (
          <div key={title}>
            <p className="text-[12px] font-semibold text-brand-brown/50 mb-2">{title}</p>
            <ul className="space-y-2">
              {list.map((h) => {
                const c = state.cases.find((x) => x.id === h.caseId)
                return (
                  <li key={h.id} className="flex items-center gap-3 rounded-xl bg-white border border-brand-border px-3 py-2.5">
                    <div className="w-12 shrink-0 text-center rounded-lg bg-brand-cream py-1">
                      <p className="text-[15px] font-bold tabular-nums leading-tight">{new Date(`${h.date}T12:00:00`).getDate().toLocaleString('ar-EG')}</p>
                      <p className="text-[10px] text-brand-brown/55" dir="ltr">{h.time}</p>
                    </div>
                    <button type="button" onClick={() => openCase(c.id)} className="flex-1 min-w-0 text-right">
                      <p className="text-[13px] font-medium truncate hover:text-brand-gold">{c.title}</p>
                      <p className="text-[11.5px] text-brand-brown/50 truncate">{h.kind} · {c.lawyer}</p>
                    </button>
                    {h.status === 'SCHEDULED' ? (
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            dispatch({ type: 'hearing', id: h.id, status: 'POSTPONED' })
                            notify('تم تأجيل الجلسة')
                          }}
                          className="rounded-lg border border-brand-border px-2 py-1 text-[11.5px] hover:border-brand-gold/60"
                        >
                          تأجيل
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            dispatch({ type: 'hearing', id: h.id, status: 'COMPLETED' })
                            notify('تم تسجيل انعقاد الجلسة')
                          }}
                          className="rounded-lg bg-brand-brown text-brand-cream px-2 py-1 text-[11.5px] hover:bg-[#3a2c17]"
                        >
                          انعقدت
                        </button>
                      </div>
                    ) : (
                      <Pill meta={HEARING_STATUS[h.status]} />
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null,
      )}
    </div>
  )
}

function Tasks({ state, dispatch, notify }) {
  const today = todayIso()
  const done = state.tasks.filter((t) => t.done).length
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-white border border-brand-border px-4 py-3">
        <div className="flex justify-between text-[12.5px] mb-2">
          <span className="font-semibold">إنجاز الفريق</span>
          <span className="tabular-nums text-brand-brown/55">{done.toLocaleString('ar-EG')} من {state.tasks.length.toLocaleString('ar-EG')}</span>
        </div>
        <div className="h-2 rounded-full bg-brand-cream overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500/80 transition-[width] duration-700" style={{ width: `${(done / state.tasks.length) * 100}%` }} />
        </div>
      </div>
      <ul className="space-y-2">
        {state.tasks.map((t) => {
          const overdue = !t.done && t.due < today
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'task', id: t.id })
                  if (!t.done) notify('أُنجزت المهمة')
                }}
                className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-right transition-colors ${t.done ? 'bg-brand-cream-light border-brand-border/60' : 'bg-white border-brand-border hover:border-brand-gold/50'}`}
              >
                <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${t.done ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-brand-brown/25'}`}>
                  {t.done && <Check size={13} strokeWidth={3} />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-[13px] font-medium truncate transition-colors ${t.done ? 'line-through text-brand-brown/40' : ''}`}>{t.title}</span>
                  <span className="block text-[11.5px] text-brand-brown/50 truncate">
                    {t.owner} · <span className={PRIORITY[t.priority].cls}>{PRIORITY[t.priority].label}</span>
                  </span>
                </span>
                {overdue && <span className="shrink-0 rounded-full bg-rust-100 text-rust-500 px-2 py-0.5 text-[11px] font-semibold">متأخرة</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------- shell

const NAV = [
  ['dashboard', 'لوحة التحكم', LayoutGrid],
  ['cases', 'القضايا', Briefcase],
  ['hearings', 'الجلسات', CalendarDays],
  ['tasks', 'المهام', ListChecks],
]

export default function LiveDemo() {
  const [state, dispatch] = useReducer(reducer, undefined, initialDemoState)
  const [view, setView] = useState('dashboard')
  const [caseId, setCaseId] = useState(null)
  const [toast, setToast] = useState(null)
  const [touched, setTouched] = useState(false)
  const toastTimer = useRef(null)
  const scrollBox = useRef(null)

  const notify = (text) => {
    clearTimeout(toastTimer.current)
    setToast({ text, key: Date.now() })
    toastTimer.current = setTimeout(() => setToast(null), 2400)
  }
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const go = (next) => {
    setTouched(true)
    setView(next)
    setCaseId(null)
    scrollBox.current?.scrollTo({ top: 0 })
  }
  const openCase = (id) => {
    setTouched(true)
    setView('cases')
    setCaseId(id)
    scrollBox.current?.scrollTo({ top: 0 })
  }
  const act = (action) => {
    setTouched(true)
    dispatch(action)
  }

  const title = useMemo(() => {
    if (view === 'cases' && caseId) return 'تفاصيل القضية'
    return NAV.find(([k]) => k === view)[1]
  }, [view, caseId])

  return (
    <div className="rounded-[22px] overflow-hidden border border-brand-border bg-white shadow-[0_50px_100px_-50px_rgba(43,32,16,0.6)]" dir="rtl">
      {/* window bar */}
      <div className="flex items-center gap-3 px-4 h-10 bg-brand-cream border-b border-brand-border">
        <div className="flex gap-1.5" dir="ltr" aria-hidden="true">
          <span className="w-2.5 h-2.5 rounded-full bg-[#e2d3b3]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#e2d3b3]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#e2d3b3]" />
        </div>
        <span className="text-[11.5px] text-brand-brown/45 truncate">عرض تجريبي ببيانات وهمية — لا يتصل بأي نظام</span>
        <button
          type="button"
          onClick={() => {
            dispatch({ type: 'reset' })
            setView('dashboard')
            setCaseId(null)
            notify('تمت إعادة العرض لحالته الأولى')
          }}
          aria-label="إعادة العرض"
          className="mr-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] text-brand-brown/60 hover:bg-white hover:text-brand-brown"
        >
          <RotateCcw size={13} /> <span className="hidden sm:inline">إعادة العرض</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row h-[560px] sm:h-[580px]">
        {/* side menu (desktop) */}
        <nav aria-label="أقسام العرض التجريبي" className="hidden md:flex w-[190px] shrink-0 flex-col gap-1 bg-brand-brown p-3 relative">
          <p className="px-2 py-2 mb-2 text-[12px] text-brand-gold-light/80 border-b border-white/10">مكتب النخبة للمحاماة</p>
          {NAV.map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => go(key)}
              className={`relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] transition-colors ${
                view === key ? 'bg-white/10 text-brand-gold-light font-semibold' : 'text-brand-cream/70 hover:bg-white/5 hover:text-brand-cream'
              }`}
            >
              <Icon size={17} />
              {label}
              {key === 'cases' && !touched && <span className="absolute left-3 w-2 h-2 rounded-full bg-brand-gold-light animate-ping" />}
            </button>
          ))}
        </nav>

        {/* content */}
        <div className="flex-1 min-w-0 flex flex-col bg-brand-cream-light relative">
          <div className="flex items-center justify-between gap-3 px-4 sm:px-5 h-14 border-b border-brand-border bg-white/70 shrink-0">
            <h3 className="font-bold text-[16px]">{title}</h3>
            {!touched && (
              <span className="hero-in inline-flex items-center gap-1.5 rounded-full bg-brand-gold/15 text-brand-tagline px-3 py-1 text-[11.5px] font-medium">
                <MousePointerClick size={14} /> جرّب: افتح قضية وسجّل دفعة
              </span>
            )}
          </div>
          <div ref={scrollBox} className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5">
            <div key={`${view}-${caseId ?? ''}`} className="hero-in">
              {view === 'dashboard' && <Dashboard state={state} go={go} openCase={openCase} dispatch={act} notify={notify} />}
              {view === 'cases' && !caseId && <CasesList state={state} openCase={openCase} />}
              {view === 'cases' && caseId && <CaseDetail state={state} caseId={caseId} back={() => setCaseId(null)} dispatch={act} notify={notify} />}
              {view === 'hearings' && <Hearings state={state} dispatch={act} notify={notify} openCase={openCase} />}
              {view === 'tasks' && <Tasks state={state} dispatch={act} notify={notify} />}
            </div>
          </div>

          {/* toast */}
          <div className="pointer-events-none absolute inset-x-0 bottom-20 md:bottom-5 flex justify-center px-4" aria-live="polite">
            {toast && (
              <div key={toast.key} className="hero-in inline-flex items-center gap-2 rounded-xl bg-brand-brown text-brand-cream px-4 py-2.5 text-[13px] shadow-[0_14px_30px_-12px_rgba(43,32,16,0.7)]">
                <CircleCheck size={16} className="text-emerald-400" />
                {toast.text}
              </div>
            )}
          </div>

          {/* bottom tab bar (phones) */}
          <nav aria-label="أقسام العرض التجريبي" className="md:hidden grid grid-cols-4 border-t border-brand-border bg-white shrink-0">
            {NAV.map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => go(key)}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${view === key ? 'text-brand-gold' : 'text-brand-brown/50'}`}
              >
                <Icon size={19} />
                {label}
                {view === key && <span className="absolute top-0 inset-x-6 h-0.5 rounded-full bg-brand-gold" />}
                {key === 'cases' && !touched && <span className="absolute top-2 left-1/2 ml-3 w-2 h-2 rounded-full bg-brand-gold animate-ping" />}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}
