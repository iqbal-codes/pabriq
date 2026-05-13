import { XCircle } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import { PortalHeader } from '#/features/portal/components/portal-header'
import type { PortalOrder } from '../model'

export function RejectedView({ order }: { order: PortalOrder }) {
  const t = useTranslations('portal')

  return (
    <div className="min-h-screen bg-muted">
      <PortalHeader
        orgLogoAssetId={order.orgLogoAssetId}
        title={t('rejectedTitle')}
      />
      <div className="flex items-center justify-center py-12">
        <div className="mx-4 max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
          <div className="mb-4 flex justify-center">
            <XCircle className="h-12 w-12 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-card-foreground">
            {t('rejectedTitle')}
          </h1>
          {order.rejectReason && (
            <p className="mt-2 text-sm text-muted-foreground">
              {order.rejectReason}
            </p>
          )}
          <Button type="button" className="mt-4 w-full">
            {t('contactAdmin')}
          </Button>

          <div className="mt-8 border-t border-border pt-6 text-left">
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
                    {new Intl.NumberFormat('en-ID', {
                      style: 'currency',
                      currency: 'IDR',
                    }).format(item.total)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between border-t border-border pt-4">
              <span className="font-medium text-card-foreground">
                {t('orderTotal')}
              </span>
              <span className="font-semibold text-card-foreground">
                {new Intl.NumberFormat('en-ID', {
                  style: 'currency',
                  currency: 'IDR',
                }).format(order.total)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
