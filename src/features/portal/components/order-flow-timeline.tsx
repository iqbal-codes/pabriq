import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  ListOrdered,
  PackageCheck,
  PartyPopper,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { formatShortDate } from '#/lib/formatters'
import { cn } from '#/lib/utils'
import type { OrderTimelineEvent } from '../model'

type Props = {
  events: OrderTimelineEvent[]
  className?: string
}

type PortalTimelineKey =
  | 'orderTimelineSectionTitle'
  | 'timelineLastUpdatePrefix'
  | 'timelineExpand'
  | 'timelineCollapse'
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
  | 'timelineShowAll'
  | 'timelineShowLess'
  | 'timelineQuantityAdjusted'

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
    case 'quantity_adjusted': {
      const d = (event.details ?? {}) as Record<string, unknown>
      const product = String(d.productName ?? '')
      const design = d.designName ? String(d.designName) : null
      const label = design ? `${product} - ${design}` : product
      const oldQty = Number(d.oldQuantity ?? 0)
      const newQty = Number(d.newQuantity ?? 0)
      const impact = Number(d.newLineTotal ?? 0) - Number(d.oldLineTotal ?? 0)
      const impactStr = impact >= 0 ? `+${impact}` : `${impact}`
      return {
        icon: <ArrowRight className="size-3.5 shrink-0 mt-0.5" />,
        description: t('timelineQuantityAdjusted')
          .replace('{product}', label)
          .replace('{oldQty}', String(oldQty))
          .replace('{newQty}', String(newQty))
          .replace('{impact}', impactStr),
      }
    }

    default:
      return { icon: null, description: '' }
  }
}

function getStatusLabel(
  event: OrderTimelineEvent,
  t: TranslateFn,
  locale: string,
  mounted: boolean,
): string {
  if (event.status === 'completed') {
    if (!event.completedAt) return t('timelineDateUnavailable')
    if (!mounted) return ''
    return `${formatShortDate(String(event.completedAt), locale)} ${new Date(event.completedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`
  }
  if (event.status === 'current') return t('timelineStepCurrent')
  return t('timelineStepUpcoming')
}

export function OrderFlowTimeline({ events, className }: Props) {
  const t = useTranslations('portal')
  const translate: TranslateFn = (key) => t(key)
  const locale = useLocale()
  const [isExpanded, setIsExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const completedEvents = events.filter((e) => e.status === 'completed')

  if (completedEvents.length === 0) {
    return (
      <section
        className={cn(
          'rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6',
          className,
        )}
      >
        <header className="flex items-center gap-2">
          <ListOrdered className="size-4 shrink-0 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {translate('orderTimelineSectionTitle')}
          </p>
        </header>
        <p className="mt-4 rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
          {translate('orderTimelineEmpty')}
        </p>
      </section>
    )
  }

  const latestEvent = completedEvents[completedEvents.length - 1]
  const { description: latestDescription } = getEventMeta(
    latestEvent,
    translate,
  )
  const hasDate = latestEvent.completedAt !== null
  const latestStatusLabel = hasDate
    ? getStatusLabel(latestEvent, translate, locale, mounted)
    : ''
  const baseSubtitle = hasDate
    ? `${latestDescription} · ${latestStatusLabel}`
    : latestDescription
  const subtitle = `${translate('timelineLastUpdatePrefix')}${baseSubtitle}`

  const displayEvents = [...completedEvents].reverse()

  return (
    <section
      className={cn(
        'rounded-2xl border border-border bg-card shadow-sm overflow-hidden',
        className,
      )}
    >
      <div className="p-5 sm:p-6 flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">
          <ListOrdered className="size-4 shrink-0" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {translate('orderTimelineSectionTitle')}
          </p>
          <p className="text-sm font-medium text-foreground">{subtitle}</p>
        </div>
      </div>

      <div
        className={cn(
          'grid transition-all duration-200 ease-out',
          isExpanded
            ? 'grid-rows-[1fr] border-t border-border'
            : 'grid-rows-[0fr] border-t border-transparent',
        )}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6 space-y-3">
            {displayEvents.map((event, i) => {
              const { icon, description } = getEventMeta(event, translate)
              const statusLabel = getStatusLabel(
                event,
                translate,
                locale,
                mounted,
              )
              const invoiceSuffix = event.invoiceNumber
                ? ` · ${event.invoiceNumber}`
                : ''
              return (
                <div key={event.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex size-6 shrink-0 items-start justify-center pt-0.5 text-muted-foreground">
                      {icon}
                    </div>
                    {i < displayEvents.length - 1 ? (
                      <div className="w-px flex-1 bg-border" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 pb-3 last:pb-0">
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {statusLabel}
                      {invoiceSuffix}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className="text-sm text-foreground">{description}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-3 hover:bg-muted/5 focus-visible:bg-muted/5 transition-colors focus:outline-none text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5"
          aria-expanded={isExpanded}
        >
          <span>
            {isExpanded
              ? translate('timelineCollapse')
              : translate('timelineExpand')}
          </span>
          {isExpanded ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
        </button>
      </div>
    </section>
  )
}
