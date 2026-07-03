import { Copy, Truck } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

export function ShipmentTrackingCard({
  courier,
  trackingNumber,
  className,
  compact,
}: {
  courier: string | null | undefined
  trackingNumber: string | null | undefined
  className?: string
  compact?: boolean
}) {
  const t = useTranslations('portal')

  if (!courier && !trackingNumber) return null

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border border-border bg-card p-4',
        compact && 'p-3',
        className,
      )}
    >
      <Truck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('shipmentTracking')}
        </p>
        {courier ? (
          <p className="mt-0.5 text-sm font-medium text-foreground">
            {courier}
          </p>
        ) : null}
        {trackingNumber ? (
          <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground font-mono">
            <span>{trackingNumber}</span>
            <Button
              variant="ghost"
              size="icon"
              className="size-5 text-muted-foreground hover:text-foreground"
              aria-label={t('copyTrackingNumber')}
              onClick={() => navigator.clipboard.writeText(trackingNumber)}
            >
              <Copy className="size-3" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
