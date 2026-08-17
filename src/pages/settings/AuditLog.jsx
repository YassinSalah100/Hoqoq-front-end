import { History } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import EmptyState from '../../components/ui/EmptyState'

// The backend exposes no audit-log endpoint yet, so this shows an honest empty
// state rather than fabricated rows.
export default function AuditLog() {
  return (
    <div>
      <PageHeader title="سجل الأحداث" />
      <EmptyState icon={History} message="سجل الأحداث غير متاح بعد — لم يتم تفعيل هذه الخدمة في الخادم." />
    </div>
  )
}
