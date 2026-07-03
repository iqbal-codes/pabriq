import {
  CheckCircle2,
  Factory,
  Link2,
  Printer,
  Truck,
  XCircle,
} from 'lucide-react'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'

export function OrderActionBar({
  order,
  onCopyPortalLink,
  isGeneratingLink,
  onApprove,
  isApproving,
  onReject,
  isRejecting,
  onStartProduction,
  isStartingProduction,
  canStartProduction,
  onCompleteProduction,
  onCompleteOrder,
  isCompletingOrder,
  canCompleteProduction,
  canCompleteOrder,
}: {
  order: { id: string; orderToken: string | null; status: string }
  onCopyPortalLink: () => void
  isGeneratingLink: boolean
  onApprove: () => void
  isApproving: boolean
  onReject: () => void
  isRejecting: boolean
  onStartProduction: () => void
  isStartingProduction: boolean
  canStartProduction: boolean
  onCompleteProduction: () => void
  onCompleteOrder: () => void
  isCompletingOrder: boolean
  canCompleteProduction: boolean
  canCompleteOrder: boolean
}) {
  const t = useTranslations('orders')
  const pt = useTranslations('production')

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCopyPortalLink}
        isLoading={isGeneratingLink}
      >
        <Link2 className="size-4" />
        {order.orderToken ? t('copyPortalLink') : t('generateLink')}
      </Button>
      {order.status !== 'draft' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="outline" size="icon-sm" asChild>
              <a
                href={`/api/documents/orders/${order.id}/quotation`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('downloadQuotation')}
              >
                <Printer className="size-4" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('downloadQuotation')}</p>
          </TooltipContent>
        </Tooltip>
      )}

      {order.status === 'pending' && (
        <>
          <Button
            type="button"
            size="sm"
            onClick={onApprove}
            isLoading={isApproving}
          >
            <CheckCircle2 className="size-4" />
            {t('approve')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onReject}
            isLoading={isRejecting}
          >
            <XCircle className="size-4" />
            {t('reject')}
          </Button>
        </>
      )}

      {canStartProduction && (
        <Button
          type="button"
          size="sm"
          onClick={onStartProduction}
          isLoading={isStartingProduction}
        >
          <Factory className="size-4" />
          {pt('startOrderProduction')}
        </Button>
      )}

      {canCompleteProduction && (
        <Button type="button" size="sm" onClick={onCompleteProduction}>
          <Truck className="size-4" />
          {pt('markAsShipped')}
        </Button>
      )}

      {canCompleteOrder && (
        <Button
          type="button"
          size="sm"
          onClick={onCompleteOrder}
          isLoading={isCompletingOrder}
        >
          <CheckCircle2 className="size-4" />
          {t('completeOrder')}
        </Button>
      )}
    </div>
  )
}
