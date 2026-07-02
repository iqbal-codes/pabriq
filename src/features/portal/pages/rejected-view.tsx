import { AlertOctagon, CheckCircle2 } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
<<<<<<< HEAD
import { CustomerInfoCard } from '#/features/portal/components/customer-info-card'
import { ShippingAddressCard } from '#/features/portal/components/shipping-address-card'
=======
import { getVisibleDesignName } from '#/features/orders/line-item-display'
import { cn } from '#/lib/utils'
>>>>>>> 502307f (refactor: rename order item name to designName, resolve product name from products table)
import { PortalContactButton } from '../components/portal-contact-button'
import { PortalOrderSummary } from '../components/portal-order-summary'
import type { PortalOrder } from '../model'

export function RejectedView({ order }: { order: PortalOrder }) {
  const t = useTranslations('portal')
  const reason = order.rejectReason?.trim() ?? ''

  return (
    <div className="space-y-6">
      {/* Status Hero Card */}
      <section className="rounded-2xl border border-destructive/30 bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertOctagon className="size-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-destructive">
              {t('progressHeroLabel')}
            </p>
            <h1 className="mt-1.5 text-balance text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
              {t('rejectedHeroTitle')}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('rejectedHeroSubtitle')}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
              {order.orderNumber ? (
                <>
                  <span className="font-mono text-foreground">
                    {order.orderNumber}
                  </span>
                  {order.orgName ? (
                    <span aria-hidden className="text-muted-foreground/30">
                      ·
                    </span>
                  ) : null}
                </>
              ) : null}
              {order.orgName ? <span>{order.orgName}</span> : null}
            </div>
          </div>
        </div>
<<<<<<< HEAD
=======

        <div className="px-5 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('rejectedReasonTitle')}
          </p>
          <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/[0.03] p-4 text-sm leading-relaxed text-foreground">
            {reason || t('rejectedReasonEmpty')}
          </div>

          {order.lineItems.length > 0 ? (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('rejectedAffectedItems')}
              </p>
              <ul className="mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-background">
                {order.lineItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-baseline justify-between gap-3 px-3 py-2.5 text-sm"
                  >
                    <span className="min-w-0 truncate font-medium text-foreground">
                      {item.productName}
                    </span>
                    {getVisibleDesignName(
                      item.designName,
                      item.productName,
                    ) && (
                      <span className="text-xs text-muted-foreground">
                        (
                        {getVisibleDesignName(
                          item.designName,
                          item.productName,
                        )}
                        )
                      </span>
                    )}
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      × <span className="font-semibold">{item.quantity}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {order.orgPhone ? (
              <PortalContactButton
                order={order}
                label="contactAdmin"
                className={cn('w-full sm:w-auto')}
              />
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.reload()}
                className="gap-2"
              >
                <CheckCircle2 className="size-4" />
                {t('retry')}
              </Button>
            )}
            {reason ? (
              <span className="text-xs italic text-muted-foreground">
                {t('rejectedNote', { note: reason })}
              </span>
            ) : null}
          </div>
        </div>
>>>>>>> 502307f (refactor: rename order item name to designName, resolve product name from products table)
      </section>

      {/* Seller Reason Card */}
      {reason ? (
        <section className="rounded-2xl border border-destructive/30 bg-destructive/[0.02] p-5 shadow-sm sm:p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-destructive">
            {t('rejectedReasonTitle')}
          </h2>
          <div className="mt-2 text-sm leading-relaxed text-foreground font-medium">
            {reason}
          </div>
        </section>
      ) : null}

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

      {/* Contact Admin */}
      <div className="flex flex-col items-center gap-3">
        {order.orgPhone ? (
          <PortalContactButton
            order={order}
            label="contactAdmin"
            className="w-full sm:w-auto"
          />
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
            className="w-full gap-2 sm:w-auto"
          >
            <CheckCircle2 className="size-4" />
            {t('retry')}
          </Button>
        )}
        <p className="text-center text-xs text-muted-foreground">
          {t('rejectedHelp')}
        </p>
      </div>
    </div>
  )
}
