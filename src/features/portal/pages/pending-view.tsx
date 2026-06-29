import { CheckCircle2 } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { PortalHeader } from '#/features/portal/components/portal-header'
import { PortalContactButton } from '../components/portal-contact-button'
import { PortalOrderSummary } from '../components/portal-order-summary'
import type { PortalOrder } from '../model'

export function PendingView({ order }: { order: PortalOrder }) {
  const t = useTranslations('portal')

  return (
    <div className="min-h-screen bg-muted">
      <PortalHeader
        orgLogoAssetId={order.orgLogoAssetId}
        title={t('waitApproval')}
      />
      <div className="flex items-center justify-center py-12">
        <div className="mx-4 max-w-md rounded-lg border border-border bg-card p-8 text-center">
          <div className="mb-4 flex justify-center">
            <CheckCircle2 className="size-12 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-card-foreground">
            {t('waitApproval')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('pendingHelp')}
          </p>
          {order.orderNumber && (
            <p className="mt-2 text-sm text-muted-foreground">
              {t('orderNumber')}: {order.orderNumber}
            </p>
          )}
          <PortalOrderSummary order={order} />
          <PortalContactButton
            order={order}
            label="chatOnWhatsApp"
            className="mt-6 w-full"
          />
        </div>
      </div>
    </div>
  )
}
