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
  production: 'warning',
  in_delivery: 'default',
  completed: 'success',
  cancelled: 'destructive',
  active: 'success',
  inactive: 'secondary',
  paid: 'success',
  overdue: 'destructive',
  failed: 'destructive',
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
            | 'production'
            | 'in_delivery'
            | 'completed'
            | 'cancelled'
            | 'active'
            | 'inactive'
            | 'paid'
            | 'overdue'
            | 'failed',
        )
      : status
  return <Badge variant={variant as never}>{label}</Badge>
}
