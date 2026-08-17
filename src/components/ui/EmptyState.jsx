import { Inbox } from 'lucide-react'
import Button from './Button'

export default function EmptyState({ icon: Icon = Inbox, message, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon size={40} className="text-ink-300 mb-4" />
      <p className="text-ink-400 mb-4">{message}</p>
      {actionLabel && <Button onClick={onAction}>{actionLabel}</Button>}
    </div>
  )
}
