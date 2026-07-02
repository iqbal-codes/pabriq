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
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <p className="font-semibold text-base">{t('lineItems')}</p>
        <span className="text-xs text-muted-foreground">
          {lineItems.length} {lineItems.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className="mx-4 rounded-xl border bg-muted/50 p-1.5">
        <div className="rounded-lg border bg-background overflow-hidden divide-y divide-border">
          {lineItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-4 px-4 py-3 transition-colors hover:bg-muted/30"
            >
              {/* Left: description + pricing breakdown */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-sm">
                  {item.description}
                </p>
                <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                  {item.quantity} &times;{' '}
                  {formatCurrency(item.unitPrice, locale)}
                </p>
              </div>

              {/* Right: line total */}
              <p className="shrink-0 font-semibold text-sm tabular-nums">
                {formatCurrency(item.total, locale)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Grand total */}
      <div className="mx-6 mt-3 mb-5 flex items-center justify-end gap-4 border-t pt-3">
        <p className="text-sm text-muted-foreground">{t('total')}</p>
        <p className="text-lg font-bold tabular-nums">
          {formatCurrency(total, locale)}
        </p>
      </div>
    </div>
  )
}
