import { Copy, Truck } from 'lucide-react'
import { useLocale, useTranslations } from 'use-intl'
import { StatusBadge } from '#/components/status-badge'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { CustomerInfoCard } from '#/features/portal/components/customer-info-card'
import { ShippingAddressCard } from '#/features/portal/components/shipping-address-card'
import { formatCurrency, formatLongDate } from '#/lib/formatters'
import { InvoicePanel } from '../components/invoice-panel'
import { LineItemTaskCard } from '../components/line-item-task-card'
import { useOrderTimeline } from '../hooks'
import type { PortalOrder } from '../model'

export function ProgressView({
  order,
  token,
}: {
  order: PortalOrder
  token: string
}) {
  const t = useTranslations('portal')
  const pt = useTranslations('production')
  const locale = useLocale()
  const shouldFetchTimeline =
    token &&
    [
      'production',
      'in_delivery',
      'completed',
      'approved',
      'in_progress',
    ].includes(order.status)
  const { data: timelineEvents } = useOrderTimeline(
    shouldFetchTimeline ? token : '',
  )

  const maxDeadline =
    order.lineItems.length > 0
      ? new Date(
          Math.max(...order.lineItems.map((item) => item.deadline.getTime())),
        )
      : null

  const safeTimelineEvents = timelineEvents ?? []
  const hasUnpaidInvoices = order.invoices.some(
    (invoice) => invoice.status !== 'void' && invoice.status !== 'paid',
  )
  const completedDateText = (() => {
    const completedEvent = safeTimelineEvents
      .filter((e) => e.type === 'completed')
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0]
    return completedEvent
      ? formatLongDate(String(completedEvent.createdAt), locale)
      : null
  })()

  const dateLabel =
    order.status === 'completed'
      ? t('completedOnLabel')
      : t('estimatedCompletionLabel')

  const dateValue =
    order.status === 'completed'
      ? (completedDateText ?? t('estimatedCompletionUnavailable'))
      : maxDeadline
        ? formatLongDate(String(maxDeadline), locale)
        : t('estimatedCompletionUnavailable')

  const statusHelp: string = (() => {
    switch (order.status) {
      case 'approved':
        return t('progressStatusApprovedHelp')
      case 'production':
      case 'in_progress':
        return t('progressStatusProductionHelp')
      case 'in_delivery':
        return t('progressStatusDeliveryHelp')
      case 'completed':
        return t('progressStatusCompletedHelp')
      default:
        return t('progressStatusFallbackHelp')
    }
  })()

  return (
    <div className="space-y-6">
      {/* Status hero */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('progressHeroLabel')}
              </p>
              {order.status === 'completed' ? (
                <Badge variant="success">{t('statusCompleted')}</Badge>
              ) : order.status ? (
                <StatusBadge status={order.status} />
              ) : null}
            </div>
            <p className="mt-2 text-sm text-foreground font-medium">
              {statusHelp}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
              {order.orderNumber ? (
                <>
                  <span className="font-mono text-foreground">
                    {order.orderNumber}
                  </span>
                  <span aria-hidden className="text-muted-foreground/30">
                    ·
                  </span>
                </>
              ) : null}
              <span>
                <span className="text-muted-foreground">{dateLabel}</span>:{' '}
                <span className="font-semibold text-foreground">
                  {dateValue}
                </span>
              </span>
            </div>
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
        {(order.courier || order.trackingNumber) && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Truck className="size-4" />
                <CardTitle>{t('shipmentTracking')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.courier && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    {pt('courier')}
                  </p>
                  <p className="font-medium">{order.courier}</p>
                </div>
              )}
              {order.trackingNumber && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    {pt('trackingNumber')}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono">{order.trackingNumber}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      aria-label={t('copyTrackingNumber')}
                      onClick={() =>
                        navigator.clipboard.writeText(
                          order.trackingNumber ?? '',
                        )
                      }
                    >
                      <Copy className="size-3" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Invoices inline */}
      {order.invoices.length > 0 ? (
        <div id="portal-invoices">
          <InvoicePanel
            invoices={order.invoices}
            token={token}
            showAboveFold={hasUnpaidInvoices}
          />
        </div>
      ) : null}

      {/* Items */}
      <section className="space-y-3">
        <header className="px-1">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            {t('itemsSectionTitle')}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t('itemsSectionDescription')}
          </p>
        </header>
        <div className="space-y-3">
          {order.lineItems.map((item) => (
            <LineItemTaskCard
              key={item.id}
              item={item}
              events={safeTimelineEvents}
            />
          ))}
        </div>
        <div className="flex justify-end border-t border-border pt-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{t('orderTotal')}</p>
            <p className="text-lg font-semibold text-foreground tabular-nums">
              {formatCurrency(order.total, locale)}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
