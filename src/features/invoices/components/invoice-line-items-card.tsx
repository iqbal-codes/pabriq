import { useLocale, useTranslations } from 'use-intl'
import type { InvoiceLineItem } from '#/features/invoices/model'
import { formatCurrency } from '#/lib/formatters'

type InvoiceLineItemsCardProps = {
  lineItems: InvoiceLineItem[]
  total: number
}

export function InvoiceLineItemsCard({
  lineItems,
  total,
}: InvoiceLineItemsCardProps) {
  const t = useTranslations('invoices')
  const locale = useLocale()

  return (
    <div className="rounded-xl border bg-card p-6">
      <p className="mb-4 font-semibold text-muted-foreground">
        {t('lineItems')}
      </p>
      <div className="space-y-3">
        {lineItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-lg border border-hairline bg-card p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{item.description}</p>
              <p className="text-sm text-muted-foreground">
                {item.quantity}x @ {formatCurrency(item.unitPrice, locale)}
              </p>
            </div>
            <p className="font-semibold tabular-nums">
              {formatCurrency(item.total, locale)}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end border-t pt-4">
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{t('total')}</p>
          <p className="text-lg font-semibold">
            {formatCurrency(total, locale)}
          </p>
        </div>
      </div>
    </div>
  )
}
