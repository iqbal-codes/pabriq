import { MapPin } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { cn } from '#/lib/utils'
import type { ShippingAddress } from '#/features/address/model'

export function ShippingAddressCard({
  address,
  className,
  compact,
}: {
  address: ShippingAddress | null
  className?: string
  compact?: boolean
}) {
  const t = useTranslations('portal')

  const street = address?.streetAddress?.trim()
  const area = address?.areaName?.trim()
  const hasAddress = Boolean(street || area)

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border border-border bg-card p-4',
        compact && 'p-3',
        className,
      )}
    >
      <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('shippingAddress')}
        </p>
        {hasAddress ? (
          <p className="mt-0.5 text-sm text-foreground">
            {street ? <span className="block">{street}</span> : null}
            {area ? (
              <span className="block text-xs text-muted-foreground">
                {area}
              </span>
            ) : null}
          </p>
        ) : (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t('noShippingAddress')}
          </p>
        )}
      </div>
    </div>
  )
}
