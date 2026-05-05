import { CheckCircle2 } from 'lucide-react'
import { useTranslations } from 'use-intl'
import type { PortalOrder } from '../model'

export function ProgressView({ order }: { order: PortalOrder }) {
  const t = useTranslations('portal')

  const statusLabel: Record<string, string> = {
    approved: t('statusApproved'),
    production: t('statusProduction'),
    in_delivery: t('statusInDelivery'),
    completed: t('statusCompleted'),
    cancelled: t('statusCancelled'),
  }

  const isCompleted = order.status === 'completed'

  return (
    <div className="min-h-screen bg-muted py-8">
      <div className="mx-auto max-w-2xl px-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-card-foreground">
              {t('orderSummary')}
            </h1>
            {order.orderNumber && (
              <p className="text-sm text-muted-foreground">
                {order.orderNumber}
              </p>
            )}
            {order.status && (
              <span className="mt-2 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                {statusLabel[order.status] ?? order.status}
              </span>
            )}
          </div>

          {isCompleted && (
            <div className="mb-6 rounded-lg bg-secondary p-4 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-primary" />
              <p className="text-sm text-secondary-foreground">
                {t('completedThanks')}
              </p>
            </div>
          )}

          <div className="mb-6 space-y-3">
            {order.lineItems.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 border-b border-border pb-3 last:border-0"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-card-foreground">
                    {item.name || item.productName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('quantity')}: {item.quantity} ×{' '}
                    {new Intl.NumberFormat('en-ID', {
                      style: 'currency',
                      currency: 'IDR',
                    }).format(item.unitPrice)}
                  </p>
                  {item.notes && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.notes}
                    </p>
                  )}
                </div>
                <p className="text-sm font-medium text-card-foreground">
                  {new Intl.NumberFormat('en-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }).format(item.total)}
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-end border-t border-border pt-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('orderTotal')}</p>
              <p className="text-lg font-semibold text-card-foreground">
                {new Intl.NumberFormat('en-ID', {
                  style: 'currency',
                  currency: 'IDR',
                }).format(order.total)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
