import { CheckCircle2, MessageCircle } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import { PortalHeader } from '#/features/portal/components/portal-header'
import type { PortalOrder } from '../model'

export function PendingView({ order }: { order: PortalOrder }) {
  const t = useTranslations('portal')

  const waPhone = order.orgPhone?.replace(/\D/g, '').replace(/^0/, '62')
  const waUrl = waPhone
    ? `https://wa.me/${waPhone}?text=${encodeURIComponent(`Hi, regarding order ${order.orderNumber || order.id}`)}`
    : null

  return (
    <div className="min-h-screen bg-muted">
      <PortalHeader
        orgLogoAssetId={order.orgLogoAssetId}
        title={t('waitApproval')}
      />
      <div className="flex items-center justify-center py-12">
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
          {waUrl && (
            <Button asChild variant="outline" className="mt-6 w-full">
              <a href={waUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" />
                {t('chatOnWhatsApp')}
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
