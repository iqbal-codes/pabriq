import { useLocale, useTranslations } from 'use-intl'
import { formatCurrency } from '#/lib/formatters'
import type { PortalOrder } from '../model'

export function PortalOrderSummary({
  order,
}: {
  order: Pick<PortalOrder, 'lineItems' | 'total'>
}) {
  const t = useTranslations('portal')
  const locale = useLocale()

  return (
    <div className="border-t border-border pt-6 text-left">
      <h2 className="mb-4 text-sm font-medium text-card-foreground">
        {t('orderSummary')}
      </h2>
      <div className="space-y-3">
        {order.lineItems.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-card-foreground">
              {item.name || item.productName} × {item.quantity}
            </span>
            <span className="font-medium text-card-foreground">
              {formatCurrency(item.total, locale)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-between border-t border-border pt-4">
        <span className="font-medium text-card-foreground">
          {t('orderTotal')}
        </span>
        <span className="font-semibold text-card-foreground">
          {formatCurrency(order.total, locale)}
        </span>
      </div>
    </div>
  )
}
