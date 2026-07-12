import { useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'

import {
  getOrderStatusLabel,
  orderStatusVariants,
  type OrderStatusVariant,
} from './order-status-badge-utils'

function getOrderStatusVariant(status: string): OrderStatusVariant {
  return orderStatusVariants[status as keyof typeof orderStatusVariants] ?? 'outline'
}

export function OrderStatusBadge({ status }: { status: string }) {
  const t = useTranslations('orders')

  return (
    <Badge variant={getOrderStatusVariant(status)}>
      {getOrderStatusLabel(t, status)}
    </Badge>
  )
}
