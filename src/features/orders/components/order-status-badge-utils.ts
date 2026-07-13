type OrderStatusVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'

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

export const orderStatusVariants = {
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

export type { OrderStatusVariant }
