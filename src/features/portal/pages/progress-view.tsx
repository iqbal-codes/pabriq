import { useLocale, useTranslations } from 'use-intl'
import { StatusBadge } from '#/components/status-badge'
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
      <section className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-wrap items-start gap-4 px-5 py-6 sm:px-6">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider">
                {t('progressHeroLabel')}
              </span>
              {order.status ? <StatusBadge status={order.status} /> : null}
            </div>
            <p className="text-sm text-muted-foreground">{statusHelp}</p>
          </div>
        </div>
      </section>

      {/* Order info card */}
      <section className="rounded-2xl border border-border bg-card px-5 py-4 sm:px-6">
        <dl className="space-y-3 text-sm">
          {order.customerName ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="shrink-0 text-muted-foreground">{t('orderInfoName')}</dt>
              <dd className="min-w-0 text-right font-medium text-foreground">
                {order.customerName}
              </dd>
            </div>
          ) : null}
          {order.customerPhone ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="shrink-0 text-muted-foreground">{t('orderInfoPhone')}</dt>
              <dd className="min-w-0 text-right font-medium text-foreground tabular-nums">
                {order.customerPhone}
              </dd>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between gap-3">
            <dt className="shrink-0 text-muted-foreground">
              {order.status === 'completed'
                ? t('completedOnLabel')
                : t('estimatedCompletionLabel')}
            </dt>
            <dd className="min-w-0 text-right font-medium text-foreground tabular-nums">
              {order.status === 'completed' ? (
                (() => {
                  const completedEvent = safeTimelineEvents
                    .filter((e) => e.type === 'completed')
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime(),
                    )[0]
                  return completedEvent ? (
                    formatLongDate(String(completedEvent.createdAt), locale)
                  ) : (
                    <span className="text-muted-foreground">
                      {t('estimatedCompletionUnavailable')}
                    </span>
                  )
                })()
              ) : maxDeadline ? (
                formatLongDate(String(maxDeadline), locale)
              ) : (
                <span className="text-muted-foreground">
                  {t('estimatedCompletionUnavailable')}
                </span>
              )}
            </dd>
          </div>
          {order.shippingAddress ? (
            <div>
              <dt className="text-muted-foreground">{t('orderInfoAddress')}</dt>
              <dd className="mt-1 text-foreground">
                {order.shippingAddress.streetAddress}
                {order.shippingAddress.streetAddress && order.shippingAddress.areaName
                  ? ', '
                  : ''}
                {order.shippingAddress.areaName}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

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
