import {
  CheckCircle2,
  Clock,
  Factory,
  Package,
  type LucideIcon,
} from 'lucide-react'
import { useLocale } from 'use-intl'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { useOrderHistoryEvents } from '#/features/orders/hooks'
import type { OrderHistoryEvent } from '#/features/orders/model'
import { formatCurrency, formatShortDate } from '#/lib/formatters'

type OrderHistoryCardProps = {
  orderId: string
}

type QuantityAdjustedDetails = {
  lineItemId: string
  productName: string
  designName: string | null
  oldQuantity: number
  newQuantity: number
  oldUnitPrice: number
  newUnitPrice: number
  oldLineTotal: number
  newLineTotal: number
  oldOrderTotal: number
  newOrderTotal: number
  reason: string
  pricingBasis: string
  finalInvoiceId: string | null
  finalInvoiceRewritten: boolean
  overpaidAmount: number
}

type KnownAction =
  | 'quantity_adjusted'
  | 'draft_confirmed'
  | 'production_started'
  | 'late_fee_applied'

const ACTION_CONFIG: Record<
  KnownAction,
  { icon: LucideIcon; colorClass: string }
> = {
  quantity_adjusted: { icon: Package, colorClass: 'text-blue-500' },
  draft_confirmed: { icon: CheckCircle2, colorClass: 'text-success' },
  production_started: { icon: Factory, colorClass: 'text-orange-500' },
  late_fee_applied: { icon: Clock, colorClass: 'text-amber-500' },
}

function QuantityAdjustedDetailsView({
  details,
  locale,
}: {
  details: QuantityAdjustedDetails
  locale: string
}) {
  const fmt = (amount: number) => formatCurrency(amount, locale)

  return (
    <div className="mt-2 space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Product</span>
        <span className="font-medium">
          {details.productName}
          {details.designName ? ` - ${details.designName}` : ''}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span className="text-muted-foreground">Quantity</span>
        <span className="text-right">
          {details.oldQuantity} → {details.newQuantity}
        </span>
        <span className="text-muted-foreground">Unit Price</span>
        <span className="text-right">
          {fmt(details.oldUnitPrice)} → {fmt(details.newUnitPrice)}
        </span>
        <span className="text-muted-foreground">Line Total</span>
        <span className="text-right">
          {fmt(details.oldLineTotal)} → {fmt(details.newLineTotal)}
        </span>
        <span className="text-muted-foreground">Order Total</span>
        <span className="text-right">
          {fmt(details.oldOrderTotal)} → {fmt(details.newOrderTotal)}
        </span>
      </div>
      <div className="border-t pt-2">
        <p className="text-xs text-muted-foreground">Reason</p>
        <p className="mt-0.5">{details.reason}</p>
      </div>
      {details.finalInvoiceRewritten && (
        <p className="text-xs text-muted-foreground">
          Invoice rewritten
          {details.finalInvoiceId
            ? ` (${details.finalInvoiceId.slice(0, 8)}…)`
            : ''}
        </p>
      )}
      {details.overpaidAmount > 0 && (
        <p className="text-xs text-amber-600 font-medium">
          Overpaid: {fmt(details.overpaidAmount)}
        </p>
      )}
    </div>
  )
}

function EventDescription({
  event,
  locale,
}: {
  event: OrderHistoryEvent
  locale: string
}) {
  switch (event.action) {
    case 'quantity_adjusted': {
      const details = event.details as unknown as QuantityAdjustedDetails
      return (
        <div>
          <span>Quantity adjusted</span>
          <QuantityAdjustedDetailsView details={details} locale={locale} />
        </div>
      )
    }
    case 'draft_confirmed':
      return <span>Draft confirmed</span>
    case 'production_started':
      return <span>Production started</span>
    case 'late_fee_applied':
      return <span>Late fee applied</span>
    default:
      return <span className="text-muted-foreground">{event.action}</span>
  }
}

export function OrderHistoryCard({ orderId }: OrderHistoryCardProps) {
  const locale = useLocale()
  const { data, isLoading } = useOrderHistoryEvents(orderId)
  const events = data as OrderHistoryEvent[] | undefined

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </CardContent>
      </Card>
    )
  }

  if (!events || events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No history events yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.map((event, i) => {
            const config =
              event.action in ACTION_CONFIG
                ? ACTION_CONFIG[event.action as KnownAction]
                : null
            const Icon = config?.icon ?? Clock
            const iconColor = config?.colorClass ?? 'text-muted-foreground'

            return (
              <div key={event.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex size-6 shrink-0 items-start justify-center pt-0.5">
                    <Icon className={`size-3.5 shrink-0 mt-0.5 ${iconColor}`} />
                  </div>
                  {i < events.length - 1 ? (
                    <div className="w-px flex-1 bg-border" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 pb-3 last:pb-0">
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatShortDate(String(event.createdAt), locale)}
                  </p>
                  <div className="mt-0.5 text-sm text-foreground">
                    <EventDescription event={event} locale={locale} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
