import { caseLabel } from '../../lib/caseLabels'
import { useMemo, useState } from 'react'
import { ChevronRight, ChevronLeft, Plus, Clock, Briefcase } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import FormModal from '../../components/ui/FormModal'
import { LoadingBlock, ErrorBlock } from '../../components/ui/AsyncState'
import { TIMELINE_ITEM_TYPE, HEARING_STATUS, TASK_STATUS, TASK_PRIORITY } from '../../data/enums'
import { calendarApi, casesApi } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { hasPermission } from '../../data/auth'

const WEEKDAYS = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]
// GET /calendar/timeline item `type` (CalendarService.getTimeline — hand-
// built, not a documented DTO): CUSTOM | HEARING | SERVICE | MEETING | TASK.
const ITEM_TYPE_LABEL = { CUSTOM: 'مواعيد', HEARING: 'جلسات', SERVICE: 'تبليغات', MEETING: 'اجتماعات', TASK: 'مهام' }
// Only HEARING and TASK have a matching status-badge map in data/enums.js;
// SERVICE/MEETING statuses render without a badge (no enum map defined for
// them yet, and their status values aren't otherwise used on this page).
const STATUS_MAP = { HEARING: HEARING_STATUS, TASK: TASK_STATUS }

function buildGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()
  const cells = []

  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, current: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true })
  }
  while (cells.length % 7 !== 0 || cells.length < 35) {
    cells.push({ day: cells.length - (firstDay + daysInMonth) + 1, current: false })
  }
  return cells
}

const createFields = [
  { name: 'title', label: 'العنوان', required: true },
  { name: 'description', label: 'الوصف', type: 'textarea' },
  { name: 'startsAt', label: 'وقت البدء', type: 'datetime-local', required: true },
  { name: 'endsAt', label: 'وقت الانتهاء', type: 'datetime-local' },
  { name: 'location', label: 'الموقع' },
]

function formatTime(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
}

function formatFullDate(year, month, day) {
  const d = new Date(year, month, day)
  const weekday = WEEKDAYS[d.getDay()]
  return `${weekday}، ${day} ${MONTH_NAMES[month]} ${year}`
}

// HEARING and SERVICE timeline items carry no `title` at all (see
// CalendarService.getTimeline — they're built from just
// { id, type, caseId, startsAt, status }), unlike CUSTOM/MEETING/TASK. Fall
// back to the item-type label plus the case number when there's no title.
function itemDisplayTitle(item, casesById) {
  if (item.title) return item.title
  const caseNumber = item.caseId ? caseLabel(casesById[item.caseId]) : null
  const base = ITEM_TYPE_LABEL[item.type] ?? item.type
  return caseNumber ? `${base} — ${caseNumber}` : base
}

// Compact month grid up top — each cell just shows the date and a dot per
// item type present that day, not the full event chips the old full-size
// grid used. Clicking a day is how you see what's actually on it, in the
// panel below, instead of squinting at truncated text inside tiny cells.
export default function CalendarPage() {
  const { currentUser } = useAuth()
  const today = useMemo(() => new Date(), [])
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selectedDay, setSelectedDay] = useState(today.getDate())
  const [showCreate, setShowCreate] = useState(false)
  // Custom events are personal (the backend scopes them to the creator), so
  // every signed-in member may add their own.
  const canManage = Boolean(currentUser)

  const { data, loading, error, reload } = useFetch(() => calendarApi.timeline(), [])
  const items = useMemo(() => (Array.isArray(data) ? data : data?.items ?? []), [data])
  // Timeline HEARING/SERVICE/MEETING/TASK items only carry a caseId, not an
  // embedded case — resolved client-side the same way Hearings.jsx/Tasks.jsx
  // resolve caseId → case number.
  const canViewCases = hasPermission(currentUser, 'case.view')
  const { data: casesAll } = useFetch(() => (canViewCases ? casesApi.list() : Promise.resolve([])), [canViewCases])
  const casesById = useMemo(() => Object.fromEntries((casesAll ?? []).map((c) => [c.id, c])), [casesAll])

  const cells = useMemo(() => buildGrid(cursor.year, cursor.month), [cursor])
  const itemsByDay = useMemo(() => {
    const map = {}
    items.forEach((item) => {
      if (!item.startsAt) return
      const d = new Date(item.startsAt)
      if (d.getFullYear() !== cursor.year || d.getMonth() !== cursor.month) return
      const day = d.getDate()
      map[day] = map[day] ?? []
      map[day].push(item)
    })
    return map
  }, [items, cursor])

  const selectedItems = useMemo(
    () => (selectedDay ? itemsByDay[selectedDay] ?? [] : []),
    [itemsByDay, selectedDay]
  )
  const isCurrentMonth = cursor.year === today.getFullYear() && cursor.month === today.getMonth()

  function shiftMonth(delta) {
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
    setSelectedDay(null)
  }

  return (
    <div>
      <PageHeader
        title="التقويم"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => shiftMonth(-1)} className="p-2 rounded-lg border border-paper-line hover:bg-paper-soft">
              <ChevronRight size={15} />
            </button>
            <span className="font-display text-lg text-ink-800 min-w-[140px] text-center">
              {MONTH_NAMES[cursor.month]} {cursor.year}
            </span>
            <button onClick={() => shiftMonth(1)} className="p-2 rounded-lg border border-paper-line hover:bg-paper-soft">
              <ChevronLeft size={15} />
            </button>
            {canManage && (
              <Button onClick={() => setShowCreate(true)}>
                <Plus size={14} />
                موعد جديد
              </Button>
            )}
          </div>
        }
      />

      {canManage && (
        <FormModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title="موعد جديد"
          fields={createFields}
          onSubmit={async (values) => {
            // CreateEventDto only declares title/description/startsAt/endsAt/
            // location/isAllDay — the backend always forces eventType:CUSTOM
            // and derives userId from the authenticated user itself
            // (CalendarService.create), so sending either extra field 400s
            // under the global whitelist(true)/forbidNonWhitelisted(true)
            // ValidationPipe.
            await calendarApi.create({
              title: values.title,
              description: values.description || undefined,
              location: values.location || undefined,
              startsAt: new Date(values.startsAt).toISOString(),
              endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : undefined,
            })
            reload()
          }}
        />
      )}

      {loading && <LoadingBlock label="جاري تحميل الأحداث..." />}
      {error && <ErrorBlock error={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          {/* Compact calendar — a small strip at the top, not the main event */}
          <div className="max-w-xl mx-auto bg-white rounded-xl border border-paper-line shadow-card overflow-hidden mb-4">
            <div className="grid grid-cols-7 border-b border-paper-line bg-paper-soft/60">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1.5 text-center text-[10px] font-medium text-ink-500">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((cell, i) => {
                const dayItems = cell.current ? itemsByDay[cell.day] ?? [] : []
                const types = [...new Set(dayItems.map((it) => it.type))]
                const isToday = isCurrentMonth && cell.current && cell.day === today.getDate()
                const isSelected = cell.current && cell.day === selectedDay
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!cell.current}
                    onClick={() => setSelectedDay(cell.day)}
                    className={`h-11 flex flex-col items-center justify-center gap-0.5 border-b border-l border-paper-line transition-colors ${
                      !cell.current ? 'bg-paper-soft/40 text-ink-300 cursor-default' : 'bg-white hover:bg-paper-soft/60 cursor-pointer'
                    } ${isSelected ? '!bg-brass-100' : ''}`}
                  >
                    <span
                      className={`text-xs font-mono w-5 h-5 flex items-center justify-center rounded-full ${
                        isSelected ? 'bg-brass-500 text-white' : isToday ? 'text-brass-700 font-semibold' : cell.current ? 'text-ink-600' : 'text-ink-300'
                      }`}
                    >
                      {cell.day}
                    </span>
                    {types.length > 0 && (
                      <span className="flex items-center gap-0.5">
                        {types.slice(0, 3).map((t) => (
                          <span key={t} className={`w-1.5 h-1.5 rounded-full ${TIMELINE_ITEM_TYPE[t] ?? 'bg-ink-400'}`} />
                        ))}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mb-4 text-xs text-ink-500 flex-wrap">
            {Object.entries(ITEM_TYPE_LABEL).map(([key, label]) => (
              <span key={key} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${TIMELINE_ITEM_TYPE[key]}`} />
                {label}
              </span>
            ))}
          </div>

          {/* Day detail — what's actually on the day you clicked */}
          <div className="bg-white rounded-xl border border-paper-line shadow-card p-4">
            <p className="text-sm font-semibold text-ink-800 mb-3">
              {selectedDay ? formatFullDate(cursor.year, cursor.month, selectedDay) : 'اختر يوماً من التقويم'}
            </p>

            {selectedDay && (selectedItems.length ? (
              <div className="space-y-2">
                {selectedItems.map((item, idx) => {
                  const statusMap = STATUS_MAP[item.type]
                  const statusInfo = statusMap?.[item.status]
                  const caseNumber = item.caseId ? caseLabel(casesById[item.caseId]) : null
                  const priorityInfo = item.type === 'TASK' ? TASK_PRIORITY[item.priority] : null
                  return (
                    <div key={item.id ?? idx} className="flex items-start gap-3 rounded-lg border border-paper-line p-3">
                      <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${TIMELINE_ITEM_TYPE[item.type] ?? 'bg-ink-400'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-ink-800 truncate">{itemDisplayTitle(item, casesById)}</p>
                          <span className="text-xs text-ink-400 font-mono flex items-center gap-1 shrink-0">
                            <Clock size={11} />
                            {formatTime(item.startsAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] text-ink-400">{ITEM_TYPE_LABEL[item.type] ?? item.type}</span>
                          {caseNumber && (
                            <span className="text-[10px] text-ink-500 flex items-center gap-1 bg-paper-soft px-1.5 py-0.5 rounded-full">
                              <Briefcase size={9} />
                              {caseNumber}
                            </span>
                          )}
                          {statusInfo && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.text}`}>
                              {statusInfo.label}
                            </span>
                          )}
                          {priorityInfo && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${priorityInfo.bg} ${priorityInfo.text}`}>
                              {priorityInfo.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState message="لا توجد جلسات أو مهام أو مواعيد في هذا اليوم" />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
