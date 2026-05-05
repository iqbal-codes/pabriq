import { CheckCircle2 } from 'lucide-react'
import { useTranslations } from 'use-intl'
import type { PortalOrder } from '../model'

export function PendingView({ order }: { order: PortalOrder }) {
  const t = useTranslations('portal')

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="mx-4 max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <div className="mb-4 flex justify-center">
          <CheckCircle2 className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-xl font-semibold text-card-foreground">
          {t('waitApproval')}
        </h1>
        {order.orderNumber && (
          <p className="mt-2 text-sm text-muted-foreground">
            {t('orderNumber')}: {order.orderNumber}
          </p>
        )}
      </div>
    </div>
  )
}
