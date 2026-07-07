import { useLocale, useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'
import { CustomerInfoCard } from '#/features/portal/components/customer-info-card'
import { ShippingAddressCard } from '#/features/portal/components/shipping-address-card'
import { formatLongDate } from '#/lib/formatters'
import { PortalOrderSummary } from '../components/portal-order-summary'
import type { PortalOrder } from '../model'

export function PendingView({ order }: { order: PortalOrder }) {
  const t = useTranslations('portal')
  const locale = useLocale()

  const receivedAt = formatLongDate(
    String(order.createdAt ?? new Date()),
    locale,
  )

  return (
    <div className="space-y-6">
      {/* Status Hero Card */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('progressHeroLabel')}
            </p>
            <Badge variant="secondary" className="capitalize">
              {t('statusPending')}
            </Badge>
          </div>
          <h1 className="mt-1.5 text-balance text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
            {t('pendingHeroTitle')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('pendingHelp')}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
            {order.orderNumber ? (
              <>
                <span className="font-mono text-foreground">
                  {order.orderNumber}
                </span>
                {order.createdAt ? (
                  <span aria-hidden className="text-muted-foreground/30">
                    ·
                  </span>
                ) : null}
              </>
            ) : null}
            {order.createdAt ? (
              <span>{t('pendingReceivedAt', { date: receivedAt })}</span>
            ) : null}
          </div>
        </div>
      </section>

      {/* Details Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <CustomerInfoCard
          name={order.customerName}
          phone={order.customerPhone}
          photoAssetId={order.customerPhotoAssetId}
        />
        <ShippingAddressCard address={order.shippingAddress} />
      </div>

      {/* Order Summary */}
      <PortalOrderSummary
        order={order}
        className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
      />
    </div>
  )
}
