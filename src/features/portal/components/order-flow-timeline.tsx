import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  ClipboardList,
  PackageCheck,
  PartyPopper,
} from 'lucide-react'
import { useLocale, useTranslations } from 'use-intl'
import { formatShortDate } from '#/lib/formatters'
import { cn } from '#/lib/utils'
import type { OrderTimelineEvent } from '../model'

type Props = {
  events: OrderTimelineEvent[]
  className?: string
}

function getEventMeta(
  event: OrderTimelineEvent,
  t: ReturnType<typeof useTranslations<'portal'>>,
): { icon: React.ReactNode; description: string } {
  switch (event.type) {
    case 'order_received':
      return {
        icon: (
          <ClipboardList className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
        ),
        description: t('timelineOrderReceived'),
      }
    case 'order_approved':
      return {
        icon: (
          <CheckCircle2 className="size-3.5 text-success shrink-0 mt-0.5" />
        ),
        description: t('timelineOrderApproved'),
      }
    case 'order_completed':
      return {
        icon: (
          <PackageCheck className="size-3.5 text-success shrink-0 mt-0.5" />
        ),
        description: t('timelineOrderCompleted'),
      }
    case 'payment_confirmed':
      return {
        icon: <Banknote className="size-3.5 text-success shrink-0 mt-0.5" />,
        description:
          event.kind === 'down_payment'
            ? t('timelinePaymentDpConfirmed')
            : t('timelinePaymentFinalConfirmed'),
      }
    case 'production_stage': {
      const stageName = event.toStageName ?? event.fromStageName ?? ''
      return {
        icon: (
          <ArrowRight className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
        ),
        description: t('timelineProductionStageReached', {
          product: event.productName,
          stage: stageName,
        }),
      }
    }
    default: {
      const exhaustive: never = event
      void exhaustive
      return {
        icon: (
          <PartyPopper className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
        ),
        description: '',
      }
    }
  }
}

export function OrderFlowTimeline({ events, className }: Props) {
  const t = useTranslations('portal')
  const locale = useLocale()

  if (events.length === 0) {
    return (
      <p
        className={cn(
          'rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground',
          className,
        )}
      >
        {t('orderTimelineEmpty')}
      </p>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {events.map((event, i) => {
        const { icon, description } = getEventMeta(event, t)
        return (
          <div key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex size-6 shrink-0 items-start justify-center pt-0.5">
                {icon}
              </div>
              {i < events.length - 1 ? (
                <div className="w-px flex-1 bg-border" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1 pb-3 last:pb-0">
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatShortDate(String(event.createdAt), locale)}{' '}
                {new Date(event.createdAt).toLocaleTimeString(locale, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <p className="mt-0.5 text-sm text-foreground">{description}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
