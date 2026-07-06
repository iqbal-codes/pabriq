import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  ClipboardList,
  PackageCheck,
  PartyPopper,
} from 'lucide-react'
import { useLocale, useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'
import { formatShortDate } from '#/lib/formatters'
import { cn } from '#/lib/utils'
import type { OrderTimelineEvent } from '../model'

type Props = {
  events: OrderTimelineEvent[]
  className?: string
}

type PortalTimelineKey =
  | 'orderTimelineEmpty'
  | 'timelineDraftCreated'
  | 'timelineDraftConfirmed'
  | 'timelineOrderApproved'
  | 'timelineDpInvoiceCreated'
  | 'timelinePaymentDpConfirmed'
  | 'timelineProductionStarted'
  | 'timelineFinalInvoiceCreated'
  | 'timelinePaymentFinalConfirmed'
  | 'timelineProductionFinished'
  | 'timelineShipmentConfirmed'
  | 'timelineOrderCompleted'
  | 'timelineStepCompleted'
  | 'timelineStepCurrent'
  | 'timelineStepUpcoming'
  | 'timelineDateUnavailable'

type TranslateFn = (key: PortalTimelineKey) => string

function getEventMeta(
  event: OrderTimelineEvent,
  t: TranslateFn,
): { icon: React.ReactNode; description: string } {
  switch (event.type) {
    case 'draft_created':
      return {
        icon: <ClipboardList className="size-3.5 shrink-0 mt-0.5" />,
        description: t('timelineDraftCreated'),
      }
    case 'draft_confirmed':
      return {
        icon: <CheckCircle2 className="size-3.5 shrink-0 mt-0.5" />,
        description: t('timelineDraftConfirmed'),
      }
    case 'order_approved':
      return {
        icon: <CheckCircle2 className="size-3.5 shrink-0 mt-0.5" />,
        description: t('timelineOrderApproved'),
      }
    case 'dp_invoice_created':
      return {
        icon: <ClipboardList className="size-3.5 shrink-0 mt-0.5" />,
        description: t('timelineDpInvoiceCreated'),
      }
    case 'dp_payment_confirmed':
      return {
        icon: <Banknote className="size-3.5 shrink-0 mt-0.5" />,
        description: t('timelinePaymentDpConfirmed'),
      }
    case 'production_started':
      return {
        icon: <ArrowRight className="size-3.5 shrink-0 mt-0.5" />,
        description: t('timelineProductionStarted'),
      }
    case 'final_invoice_created':
      return {
        icon: <ClipboardList className="size-3.5 shrink-0 mt-0.5" />,
        description: t('timelineFinalInvoiceCreated'),
      }
    case 'final_payment_confirmed':
      return {
        icon: <Banknote className="size-3.5 shrink-0 mt-0.5" />,
        description: t('timelinePaymentFinalConfirmed'),
      }
    case 'production_finished':
      return {
        icon: <PackageCheck className="size-3.5 shrink-0 mt-0.5" />,
        description: t('timelineProductionFinished'),
      }
    case 'shipment_confirmed':
      return {
        icon: <PackageCheck className="size-3.5 shrink-0 mt-0.5" />,
        description: t('timelineShipmentConfirmed'),
      }
    case 'order_completed':
      return {
        icon: <PartyPopper className="size-3.5 shrink-0 mt-0.5" />,
        description: t('timelineOrderCompleted'),
      }
    default:
      return { icon: null, description: '' }
  }
}

function getStatusLabel(
  event: OrderTimelineEvent,
  t: TranslateFn,
  locale: string,
): string {
  if (event.status === 'completed') {
    return event.completedAt
      ? `${formatShortDate(String(event.completedAt), locale)} ${new Date(event.completedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`
      : t('timelineDateUnavailable')
  }
  if (event.status === 'current') return t('timelineStepCurrent')
  return t('timelineStepUpcoming')
}

export function OrderFlowTimeline({ events, className }: Props) {
  const t = useTranslations('portal')
  const translate: TranslateFn = (key) => t(key)
  const locale = useLocale()

  if (events.length === 0) {
    return (
      <p
        className={cn(
          'rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground',
          className,
        )}
      >
        {translate('orderTimelineEmpty')}
      </p>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {events.map((event, i) => {
        const { icon, description } = getEventMeta(event, translate)
        const statusLabel = getStatusLabel(event, translate, locale)
        const invoiceSuffix = event.invoiceNumber
          ? ` · ${event.invoiceNumber}`
          : ''
        const isCompleted = event.status === 'completed'
        const isCurrent = event.status === 'current'
        return (
          <div key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex size-6 shrink-0 items-start justify-center pt-0.5',
                  isCompleted
                    ? 'text-success'
                    : isCurrent
                      ? 'text-foreground'
                      : 'text-muted-foreground',
                )}
              >
                {icon}
              </div>
              {i < events.length - 1 ? (
                <div className="w-px flex-1 bg-border" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1 pb-3 last:pb-0">
              <p
                className={cn(
                  'text-xs tabular-nums',
                  isCompleted
                    ? 'text-success'
                    : isCurrent
                      ? 'text-foreground'
                      : 'text-muted-foreground',
                )}
              >
                {statusLabel}
                {invoiceSuffix}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <p
                  className={cn(
                    'text-sm',
                    isCompleted
                      ? 'text-foreground'
                      : isCurrent
                        ? 'text-foreground'
                        : 'text-muted-foreground',
                  )}
                >
                  {description}
                </p>
                {isCurrent ? (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 shrink-0"
                  >
                    {translate('timelineStepCurrent')}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
