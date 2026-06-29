import { XCircle } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { PortalHeader } from '#/features/portal/components/portal-header'
import { PortalContactButton } from '../components/portal-contact-button'
import { PortalOrderSummary } from '../components/portal-order-summary'
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
        <div className="mx-4 max-w-md rounded-lg border border-border bg-card p-8 text-center">
          <div className="mb-4 flex justify-center">
            <XCircle className="size-12 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-card-foreground">
            {t('rejectedTitle')}
          </h1>
          {order.rejectReason && (
            <p className="mt-2 text-sm text-muted-foreground">
              {order.rejectReason}
            </p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {t('rejectedHelp')}
          </p>
          <PortalContactButton
            order={order}
            label="contactAdmin"
            className="mt-4 w-full"
          />
          <PortalOrderSummary order={order} />
        </div>
      </div>
    </div>
  )
}
