import { Wallet } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import EmptyState from '../../components/ui/EmptyState'

// The backend exposes no expenses endpoint yet (finance covers invoices and
// payments only), so this shows an honest empty state rather than mock rows.
export default function Expenses() {
  return (
    <div>
      <PageHeader title="المصروفات" />
      <EmptyState icon={Wallet} message="إدارة المصروفات غير متاحة بعد — لم يتم تفعيل هذه الخدمة في الخادم." />
    </div>
  )
}
