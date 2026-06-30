import { MapPin } from 'lucide-react'
import { useTranslations } from 'use-intl'
import type { ShippingAddress } from '#/features/address/model'

export function ShippingAddressCard({
  address,
}: {
  address: ShippingAddress | null
}) {
  const t = useTranslations('portal')

  const hasAddress = address && (address.streetAddress || address.areaName)

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-card-foreground">
            {t('shippingAddress')}
          </p>
          <p className="text-sm text-muted-foreground">
            {hasAddress
              ? address.streetAddress
                ? `${address.streetAddress}, ${address.areaName}`
                : address.areaName
              : t('noShippingAddress')}
          </p>
        </div>
      </div>
    </div>
  )
}
