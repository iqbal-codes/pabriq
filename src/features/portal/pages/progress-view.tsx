import { Package } from 'lucide-react'
import { useLocale, useTranslations } from 'use-intl'
import { StatusBadge } from '#/components/status-badge'
import { Badge } from '#/components/ui/badge'
import { CustomerInfoCard } from '#/features/portal/components/customer-info-card'
import { OrderFlowTimeline } from '#/features/portal/components/order-flow-timeline'
import { ShipmentTrackingCard } from '#/features/portal/components/shipment-tracking-card'
import { ShippingAddressCard } from '#/features/portal/components/shipping-address-card'
import { formatCurrency, formatLongDate } from '#/lib/formatters'
import { InvoicePanel } from '../components/invoice-panel'
import { LineItemTaskCard } from '../components/line-item-task-card'
import { useOrderTasksTimeline, useOrderTimeline } from '../hooks'
import type { PortalOrder } from '../model'

export function ProgressView({
  order,
  token,
}: {
  order: PortalOrder
  token: string
}) {
  const t = useTranslations('portal')
  const locale = useLocale()
  const shouldFetchOrderTimeline = Boolean(token)
  const shouldFetchTaskTimeline =
    token &&
    [
      'production',
      'in_delivery',
      'completed',
      'approved',
      'in_progress',
    ].includes(order.status)
  const { data: orderTimelineEvents } = useOrderTimeline(
    shouldFetchOrderTimeline ? token : '',
  )
  const { data: taskTimelineEvents } = useOrderTasksTimeline(
    shouldFetchTaskTimeline ? token : '',
  )

  const maxDeadline =
    order.lineItems.length > 0
      ? new Date(
          Math.max(...order.lineItems.map((item) => item.deadline.getTime())),
        )
      : null

  const safeOrderTimelineEvents = orderTimelineEvents ?? []
  const safeTaskTimelineEvents = taskTimelineEvents ?? []
  const hasUnpaidInvoices = order.invoices.some(
    (invoice) => invoice.status !== 'void' && invoice.status !== 'paid',
  )
  const completedDateText = order.deliveredAt
    ? formatLongDate(String(order.deliveredAt), locale)
    : null

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
        return t('progressStatusApprovedHelp', {
          org_name: order.orgName,
          first_preproduction_stage_name:
            order.preProductionFirstStageName ?? 'Pre-Production',
        })
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
              <span>
                <span className="text-muted-foreground">Masuk Antrian</span>:{' '}
                <span className="font-semibold text-foreground">
                  {formatLongDate(String(order.createdAt), locale)}
                </span>
              </span>
              <span aria-hidden className="text-muted-foreground/30">
                ·
              </span>
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

      {/* Order-level flow timeline */}
      <OrderFlowTimeline events={safeOrderTimelineEvents} />

      {/* Details Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <CustomerInfoCard
          name={order.customerName}
          phone={order.customerPhone}
          photoAssetId={order.customerPhotoAssetId}
        />
        <ShippingAddressCard address={order.shippingAddress} />
        <ShipmentTrackingCard
          courier={order.courier}
          trackingNumber={order.trackingNumber}
        />
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
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
            <Package className="size-4 shrink-0 text-muted-foreground" />
            <span>{t('itemsSectionTitle')}</span>
          </h2>
        </header>
        <div className="space-y-3">
          {order.lineItems.map((item) => (
            <LineItemTaskCard
              key={item.id}
              item={item}
              events={safeTaskTimelineEvents}
              token={token}
              productionFirstStageName={order.productionFirstStageName}
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
