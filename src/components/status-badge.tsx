import { useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'

type StatusVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'

const statusMap: Record<string, StatusVariant> = {
  draft: 'secondary',
  pending: 'outline',
  approved: 'default',
  in_progress: 'warning',
  production: 'warning',
  in_delivery: 'default',
  completed: 'success',
  cancelled: 'destructive',
  rejected: 'destructive',
  active: 'success',
  inactive: 'secondary',
  paid: 'success',
  partially_paid: 'warning',
  unpaid: 'outline',
  void: 'destructive',
  confirmed: 'success',
  refunded: 'secondary',
  pendingPayment: 'warning',
  overdue: 'destructive',
  failed: 'destructive',
  queued: 'outline',
  pending_approval: 'warning',
  accepted: 'success',
  canceled: 'destructive',
  deleted: 'destructive',
}

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('status')
  const variant = statusMap[status] ?? 'outline'
  const label =
    status in statusMap
      ? t(
          status as
            | 'draft'
            | 'pending'
            | 'approved'
            | 'in_progress'
            | 'production'
            | 'in_delivery'
            | 'completed'
            | 'cancelled'
            | 'rejected'
            | 'active'
            | 'inactive'
            | 'paid'
            | 'partially_paid'
            | 'unpaid'
            | 'void'
            | 'confirmed'
            | 'refunded'
            | 'pendingPayment'
            | 'overdue'
            | 'failed'
            | 'queued'
            | 'pending_approval'
            | 'accepted'
            | 'canceled'
            | 'deleted',
        )
      : status
  return <Badge variant={variant as never}>{label}</Badge>
}
