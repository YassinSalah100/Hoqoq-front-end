import { useState } from 'react'
import { Bell, HelpCircle, CheckCheck, Menu } from 'lucide-react'
import SearchInput from '../ui/SearchInput'
import Avatar from '../ui/Avatar'
import { notificationsApi } from '../../lib/api'
import { useFetch } from '../../hooks/useApi'

function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const { data, loading, reload } = useFetch(() => notificationsApi.me(), [])
  const notifications = Array.isArray(data) ? data : data?.items ?? []
  const unreadCount = notifications.filter((n) => !n.isRead).length

  async function handleMarkRead(id) {
    try {
      await notificationsApi.markRead(id)
      reload()
    } catch {
      // non-critical, ignore
    }
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="p-2 rounded-lg text-ink-500 hover:bg-paper-soft relative">
        <Bell size={15} />
        {unreadCount > 0 && <span className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-rust-500" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed sm:absolute left-3 right-3 sm:left-0 sm:right-auto mt-2 sm:w-80 bg-white rounded-xl shadow-pop border border-paper-line z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-paper-line flex items-center justify-between">
              <p className="text-sm font-semibold text-ink-800">الإشعارات</p>
              <span className="text-xs text-ink-400">{unreadCount} غير مقروءة</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <p className="text-sm text-ink-400 p-4 text-center">جاري التحميل...</p>
              ) : notifications.length ? (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-2 px-4 py-3 border-b border-paper-line last:border-0 hover:bg-paper-soft ${
                      n.isRead ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink-700">{n.title}</p>
                      <p className="text-xs text-ink-500 mt-0.5">{n.message}</p>
                      <p className="text-xs text-ink-400 mt-0.5">{(n.createdAt ?? '').toString().slice(0, 16).replace('T', ' ')}</p>
                    </div>
                    {!n.isRead && (
                      <button onClick={() => handleMarkRead(n.id)} title="وضع كمقروء" className="text-ink-300 hover:text-brass-600 shrink-0">
                        <CheckCheck size={14} />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-ink-400 p-4 text-center">لا توجد إشعارات جديدة</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function TopBar({ user, onOpenMenu }) {
  return (
    <header className="h-14 shrink-0 bg-white border-b border-paper-line flex items-center justify-between px-3 sm:px-6 gap-2 sm:gap-4">
      <button onClick={onOpenMenu} className="p-2 rounded-lg text-ink-500 hover:bg-paper-soft lg:hidden shrink-0">
        <Menu size={18} />
      </button>
      <SearchInput placeholder="بحث..." className="max-w-sm w-full hidden sm:block" />
      <div className="flex items-center gap-1.5 sm:gap-3">
        <NotificationsMenu />
        <button className="p-2 rounded-lg text-ink-500 hover:bg-paper-soft hidden sm:inline-flex">
          <HelpCircle size={15} />
        </button>
        <Avatar name={user?.name} size="sm" />
      </div>
    </header>
  )
}
