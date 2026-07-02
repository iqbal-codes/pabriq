import { useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'

type OrderStatusVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'

const orderStatusVariants = {
  draft: 'secondary',
  pending: 'outline',
  approved: 'default',
  in_progress: 'warning',
  production: 'warning',
  in_delivery: 'default',
  completed: 'success',
  cancelled: 'destructive',
  rejected: 'destructive',
} as const satisfies Record<string, OrderStatusVariant>

const orderStatusLabelKeys = {
  draft: 'statusDraft',
  pending: 'statusPending',
  approved: 'statusApproved',
  in_progress: 'statusInProgress',
  production: 'statusProduction',
  in_delivery: 'statusInDelivery',
  completed: 'statusCompleted',
  cancelled: 'statusCancelled',
  rejected: 'statusRejected',
} as const

type OrderStatus = keyof typeof orderStatusLabelKeys
type OrderStatusLabelKey = (typeof orderStatusLabelKeys)[OrderStatus]
type OrderStatusTranslator = (key: OrderStatusLabelKey) => string

export function getOrderStatusLabel(
  t: OrderStatusTranslator,
  status: string,
): string {
  const key = orderStatusLabelKeys[status as OrderStatus]
  return key ? t(key) : status
}

function getOrderStatusVariant(status: string): OrderStatusVariant {
  return orderStatusVariants[status as OrderStatus] ?? 'outline'
}

export function OrderStatusBadge({ status }: { status: string }) {
  const t = useTranslations('orders')

  return (
    <Badge variant={getOrderStatusVariant(status)}>
      {getOrderStatusLabel(t, status)}
    </Badge>
  )
}
