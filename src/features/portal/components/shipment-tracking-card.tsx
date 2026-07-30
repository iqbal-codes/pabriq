import { CheckCircle2, ExternalLink, Store, Truck } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import { getCourierAdapter } from '#/features/fulfillment/courier-adapter'
import { cn } from '#/lib/utils'

export function ShipmentTrackingCard({
  courier,
  trackingNumber,
  trackingUrl,
  fulfillmentType = 'shipping',
  status,
  className,
  compact,
}: {
  courier?: string | null
  trackingNumber?: string | null
  trackingUrl?: string | null
  fulfillmentType?: 'shipping' | 'pickup' | string
  status?: string | null
  className?: string
  compact?: boolean
}): React.JSX.Element | null {
  const t = useTranslations('portal')

  if (!courier && !trackingNumber && !status) return null

  const isPickup =
    fulfillmentType === 'pickup' || courier?.toLowerCase() === 'pickup'
  const finalTrackingUrl =
    trackingUrl ??
    (courier && trackingNumber
      ? getCourierAdapter().getTrackingUrl(courier, trackingNumber)
      : null)

  const IconComponent = isPickup ? Store : Truck

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border border-border bg-card p-4',
        compact && 'p-3',
        className,
      )}
    >
      <IconComponent className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isPickup ? t('storePickup') : t('shipmentTracking')}
          </p>
          {status && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium capitalize text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {status === 'delivered' ||
              status === 'picked_up' ||
              status === 'completed' ? (
                <CheckCircle2 className="size-3 text-emerald-600" />
              ) : null}
              {status.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {courier ? (
          <p className="mt-0.5 text-sm font-medium text-foreground">
            {courier}
          </p>
        ) : null}

        {trackingNumber ? (
          <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground font-mono">
            <span>{trackingNumber}</span>
            {finalTrackingUrl && (
              <Button
                variant="ghost"
                size="icon"
                className="size-5 text-muted-foreground hover:text-foreground"
                asChild
              >
                <a
                  href={finalTrackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('trackShipment')}
                >
                  <ExternalLink className="size-3" />
                </a>
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
export default ShipmentTrackingCard
