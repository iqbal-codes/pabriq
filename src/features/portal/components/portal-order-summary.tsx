import { useLocale, useTranslations } from 'use-intl'
import { formatCurrency } from '#/lib/formatters'
import type { PortalOrder } from '../model'

export function PortalOrderSummary({
  order,
  className,
}: {
  order: Pick<PortalOrder, 'lineItems' | 'total' | 'orderNumber'>
  className?: string
}) {
  const t = useTranslations('portal')
  const locale = useLocale()

  if (order.lineItems.length === 0) return null

  return (
    <section aria-labelledby="portal-order-summary-title" className={className}>
      <header className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
        <h2
          id="portal-order-summary-title"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {t('orderSummary')}
        </h2>
        {order.orderNumber ? (
          <span className="font-mono text-xs text-muted-foreground">
            {order.orderNumber}
          </span>
        ) : null}
      </header>
      <ul className="divide-y divide-border">
        {order.lineItems.map((item) => (
          <li
            key={item.id}
            className="flex items-baseline justify-between gap-4 py-2.5"
          >
            <div className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">
                {item.name || item.productName}
              </span>
              <span className="block mt-0.5 text-xs text-muted-foreground">
                <span className="tabular-nums">{item.quantity}</span>
                {' × '}
                <span className="tabular-nums">
                  {formatCurrency(item.unitPrice, locale)}
                </span>
              </span>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
              {formatCurrency(item.total, locale)}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
        <span className="text-sm font-medium text-muted-foreground">
          {t('orderTotal')}
        </span>
        <span className="text-base font-semibold tabular-nums text-foreground">
          {formatCurrency(order.total, locale)}
        </span>
      </div>
    </section>
  )
}
