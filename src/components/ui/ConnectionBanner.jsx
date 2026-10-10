import { useEffect, useRef, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { useConnectivity } from '../../lib/connectivity'
import { OFFLINE_MESSAGE } from '../../lib/api'

const RESTORED_VISIBLE_MS = 3500

// Sticky notice: red while the backend is unreachable, then a short green
// confirmation once the connection comes back.
export default function ConnectionBanner() {
  const online = useConnectivity()
  const wasOffline = useRef(!online)
  const [showRestored, setShowRestored] = useState(false)

  useEffect(() => {
    if (!online) {
      wasOffline.current = true
      setShowRestored(false)
      return undefined
    }
    if (!wasOffline.current) return undefined
    wasOffline.current = false
    setShowRestored(true)
    const timer = setTimeout(() => setShowRestored(false), RESTORED_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [online])

  if (!online) {
    return (
      <div role="alert" className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm bg-rust-100 text-rust-600 border-b border-rust-100">
        <WifiOff size={16} className="shrink-0" />
        <span className="font-medium">{OFFLINE_MESSAGE}</span>
        <span className="text-rust-500 hidden sm:inline">— سيتم الاتصال تلقائيًا فور عودة الشبكة</span>
      </div>
    )
  }
  if (showRestored) {
    return (
      <div role="status" className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm bg-emerald-100 text-emerald-700 border-b border-emerald-100">
        <Wifi size={16} className="shrink-0" />
        <span className="font-medium">تمت استعادة الاتصال</span>
      </div>
    )
  }
  return null
}
