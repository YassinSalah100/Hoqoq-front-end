import { useEffect, useReducer, useRef, useState } from 'react'
import {
  LayoutDashboard,
  Briefcase,
  Calendar,
  Users,
  CheckSquare,
  BarChart3,
  Bell,
  HelpCircle,
  Menu,
  X,
  Search,
  RotateCcw,
  CheckCircle2,
  MousePointerClick,
  LogOut,
} from 'lucide-react'
import BrandMark from '../../components/ui/BrandMark'
import { Avatar } from './ui'
import { CasesPage, CaseDetailPage, ClientsPage, DashboardPage, HearingsPage, ReportsPage, TasksPage } from './pages'
import { FIRM, OWNER, initialDemoState, money, todayIso } from './demoData'

// ---------------------------------------------------------------- state

function addNotice(state, title, message) {
  return { ...state, notifications: [{ id: `n${state.seq}`, title, message, read: false, at: 'الآن' }, ...state.notifications].slice(0, 6), seq: state.seq + 1 }
}

function reducer(state, action) {
  switch (action.type) {
    case 'reset':
      return initialDemoState()
    case 'createCase': {
      const { id, data } = action
      const next = {
        ...state,
        seq: state.seq + 1,
        cases: [
          { id, title: data.title, client: data.client, clientType: 'فرد', opponent: '—', court: data.court, number: String(1400 + state.seq), year: 2026, type: data.type, status: 'DRAFT', lawyer: data.lawyer, opened: todayIso(), fee: data.fee, payments: [] },
          ...state.cases,
        ],
      }
      return addNotice(next, 'قضية جديدة', `أُنشئت «${data.title}» وأُسندت إلى ${data.lawyer}`)
    }
    case 'pay': {
      const c = state.cases.find((x) => x.id === action.caseId)
      const next = {
        ...state,
        cases: state.cases.map((x) => (x.id === action.caseId ? { ...x, payments: [{ id: `p${state.seq}`, amount: action.amount, method: action.method, date: todayIso() }, ...x.payments] } : x)),
        seq: state.seq + 1,
      }
      return addNotice(next, 'دفعة جديدة', `${money(action.amount)} في «${c.title}»`)
    }
    case 'status':
      return { ...state, cases: state.cases.map((c) => (c.id === action.caseId ? { ...c, status: action.status } : c)) }
    case 'hearing': {
      const h = state.hearings.find((x) => x.id === action.id)
      const c = state.cases.find((x) => x.id === h.caseId)
      const next = { ...state, hearings: state.hearings.map((x) => (x.id === action.id ? { ...x, status: action.status } : x)) }
      return addNotice(next, action.status === 'COMPLETED' ? 'انعقاد جلسة' : 'تأجيل جلسة', `«${c.title}» — ${h.kind}`)
    }
    case 'task':
      return { ...state, tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t)) }
    case 'readAll':
      return { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) }
    default:
      return state
  }
}

// ---------------------------------------------------------------- shell (mirrors the app's sidebar + top bar)

const NAV_GROUPS = [
  { title: null, items: [['dashboard', 'الرئيسية', LayoutDashboard]] },
  {
    title: 'إدارة الأعمال',
    items: [
      ['cases', 'القضايا', Briefcase],
      ['hearings', 'الجلسات', Calendar],
      ['clients', 'الموكلين', Users],
      ['tasks', 'المهام', CheckSquare],
    ],
  },
  { title: 'المالية', items: [['reports', 'التقارير المالية', BarChart3]] },
]

function Sidebar({ view, go, open, close, touched }) {
  return (
    <>
      {open && <div className="absolute inset-0 z-20 bg-ink-900/50 lg:hidden" onClick={close} aria-hidden="true" />}
      <aside
        className={`absolute lg:static inset-y-0 right-0 z-30 w-60 shrink-0 bg-ink-800 text-white flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3.5 border-b border-white/10">
          <div className="min-w-0">
            <BrandMark size={38} variant="dark" />
            <span className="mt-2.5 inline-block max-w-full truncate rounded-md bg-brass-500/15 border border-brass-500/25 px-2 py-0.5 text-[10.5px] text-brass-300">{FIRM}</span>
          </div>
          <button type="button" onClick={close} aria-label="إغلاق القائمة" className="p-1 rounded-lg text-ink-300 hover:text-white hover:bg-white/10 lg:hidden">
            <X size={16} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2.5 py-3.5 space-y-5" aria-label="قائمة التطبيق التجريبي">
          {NAV_GROUPS.map((group, i) => (
            <div key={i}>
              {group.title && <p className="px-3 mb-1.5 text-[11.5px] text-ink-300/70 font-medium">{group.title}</p>}
              <div className="space-y-0.5">
                {group.items.map(([key, label, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => go(key)}
                    className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                      view === key ? 'bg-brass-500/15 text-brass-300 font-medium border-r-2 border-brass-400' : 'text-ink-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon size={15} />
                    {label}
                    {key === 'cases' && !touched && <span className="absolute left-3 w-2 h-2 rounded-full bg-brass-400 animate-ping" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-3.5 border-t border-white/10 flex items-center gap-2.5">
          <Avatar name={OWNER} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-medium truncate">{OWNER}</p>
            <p className="text-[11px] text-ink-300/70">مالك المكتب</p>
          </div>
          <span className="p-1.5 text-ink-300" aria-hidden="true"><LogOut size={14} /></span>
        </div>
      </aside>
    </>
  )
}

function Notifications({ items, onOpen, onReadAll }) {
  const [open, setOpen] = useState(false)
  const unread = items.filter((n) => !n.read).length
  return (
    <div className="relative">
      <button type="button" aria-label="الإشعارات" onClick={() => { setOpen((o) => !o); onOpen() }} className="relative p-2 rounded-lg text-ink-500 hover:bg-paper-soft">
        <Bell size={16} />
        {unread > 0 && <span className="absolute top-1 left-1 min-w-4 h-4 px-1 rounded-full bg-rust-500 text-white text-[9.5px] font-bold flex items-center justify-center">{unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="hero-in absolute left-0 mt-2 w-[290px] max-w-[80vw] bg-white rounded-xl shadow-pop border border-paper-line z-40 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-paper-line flex items-center justify-between">
              <p className="text-[13px] font-semibold text-ink-800">الإشعارات</p>
              <button type="button" onClick={onReadAll} className="text-[11.5px] text-brass-600 hover:underline">تعليم الكل كمقروء</button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {items.map((n) => (
                <div key={n.id} className={`px-4 py-2.5 border-b border-paper-line last:border-0 ${n.read ? 'opacity-55' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12.5px] font-medium text-ink-800">{n.title}</p>
                    <span className="text-[10.5px] text-ink-400 shrink-0">{n.at}</span>
                  </div>
                  <p className="text-[11.5px] text-ink-500 mt-0.5">{n.message}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function LiveDemo() {
  const [state, rawDispatch] = useReducer(reducer, undefined, initialDemoState)
  const [view, setView] = useState('dashboard')
  const [caseId, setCaseId] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [touched, setTouched] = useState(false)
  const [toast, setToast] = useState(null)
  const timer = useRef(null)
  const scrollBox = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])
  const notify = (text) => {
    clearTimeout(timer.current)
    setToast({ text, key: Date.now() })
    timer.current = setTimeout(() => setToast(null), 2400)
  }
  const top = () => scrollBox.current?.scrollTo({ top: 0, behavior: 'smooth' })
  const go = (next) => {
    setTouched(true)
    setView(next)
    setCaseId(null)
    setMenuOpen(false)
    top()
  }
  const openCase = (id) => {
    setTouched(true)
    setView('cases')
    setCaseId(id)
    setMenuOpen(false)
    top()
  }
  // createCase needs the new id back so the demo can open it right away.
  const dispatch = (action) => {
    setTouched(true)
    if (action.type === 'createCase') {
      const id = `c${Date.now()}`
      rawDispatch({ ...action, id })
      return id
    }
    rawDispatch(action)
    return undefined
  }

  const pageProps = { state, go, openCase, dispatch, notify }
  let page
  if (view === 'cases' && caseId) page = <CaseDetailPage {...pageProps} caseId={caseId} back={() => setCaseId(null)} />
  else if (view === 'cases') page = <CasesPage {...pageProps} />
  else if (view === 'hearings') page = <HearingsPage {...pageProps} />
  else if (view === 'clients') page = <ClientsPage {...pageProps} />
  else if (view === 'tasks') page = <TasksPage {...pageProps} />
  else if (view === 'reports') page = <ReportsPage {...pageProps} />
  else page = <DashboardPage {...pageProps} />

  return (
    <div className="rounded-[20px] overflow-hidden border border-brand-border bg-white shadow-[0_50px_100px_-50px_rgba(43,32,16,0.6)]" dir="rtl">
      <div className="flex items-center gap-3 px-4 h-9 bg-[#221909] text-brand-cream/60">
        <div className="flex gap-1.5" dir="ltr" aria-hidden="true">
          <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
        </div>
        <span className="text-[11.5px] truncate">Hoqooq — Firm Management · عرض تجريبي ببيانات وهمية</span>
        <button
          type="button"
          aria-label="إعادة العرض"
          onClick={() => {
            rawDispatch({ type: 'reset' })
            setView('dashboard')
            setCaseId(null)
            notify('تمت إعادة العرض لحالته الأولى')
          }}
          className="mr-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] hover:bg-white/10 hover:text-brand-cream"
        >
          <RotateCcw size={12} />
          <span className="hidden sm:inline">إعادة العرض</span>
        </button>
      </div>

      <div className="relative flex h-[600px] sm:h-[640px] bg-paper overflow-hidden">
        <Sidebar view={view} go={go} open={menuOpen} close={() => setMenuOpen(false)} touched={touched} />
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="h-14 shrink-0 bg-white border-b border-paper-line flex items-center justify-between gap-2 px-3 sm:px-5">
            <button type="button" aria-label="فتح القائمة" onClick={() => setMenuOpen(true)} className="p-2 rounded-lg text-ink-500 hover:bg-paper-soft lg:hidden">
              <Menu size={18} />
            </button>
            <button type="button" onClick={() => go('cases')} className="hidden sm:flex items-center gap-2 flex-1 max-w-xs rounded-lg border border-paper-line bg-paper px-3 py-1.5 text-[12.5px] text-ink-300 hover:border-brass-300">
              <Search size={14} />
              بحث...
            </button>
            {!touched && (
              <span className="hero-in hidden md:inline-flex items-center gap-1.5 rounded-full bg-brass-100 text-brass-700 px-3 py-1 text-[11.5px] font-medium">
                <MousePointerClick size={13} /> جرّب: افتح قضية وسجّل دفعة
              </span>
            )}
            <div className="flex items-center gap-1.5 sm:gap-2 mr-auto">
              <button type="button" aria-label="مساعدة" onClick={() => notify('في التطبيق تجد هنا دليل الاستخدام')} className="p-2 rounded-lg text-ink-500 hover:bg-paper-soft">
                <HelpCircle size={16} />
              </button>
              <Notifications items={state.notifications} onOpen={() => setTouched(true)} onReadAll={() => rawDispatch({ type: 'readAll' })} />
              <Avatar name={OWNER} />
            </div>
          </header>
          <main ref={scrollBox} className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-6 relative">
            <div key={`${view}-${caseId ?? ''}`} className="hero-in">{page}</div>
          </main>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-40 flex justify-center px-4" aria-live="polite">
          {toast && (
            <div key={toast.key} className="hero-in inline-flex items-center gap-2 rounded-xl bg-ink-800 text-white px-4 py-2.5 text-[13px] shadow-pop">
              <CheckCircle2 size={16} className="text-emerald-400" />
              {toast.text}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
