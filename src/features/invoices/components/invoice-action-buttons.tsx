import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import { useGlobalModal } from '#/hooks/use-global-overlay'

type InvoiceActionButtonsProps = {
  canModify: boolean
  invoiceId: string
  onMarkPaid: () => void
  isMarkingPaid: boolean
  onVoid: () => void
  isVoiding: boolean
}

export function InvoiceActionButtons({
  canModify,
  invoiceId,
  onMarkPaid,
  isMarkingPaid,
  onVoid,
  isVoiding,
}: InvoiceActionButtonsProps) {
  const t = useTranslations('invoices')
  const { openModal } = useGlobalModal()

  if (!canModify) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="default"
        onClick={() => openModal('record-payment', invoiceId)}
      >
        {t('recordPayment')}
      </Button>
      <Button variant="default" onClick={onMarkPaid} isLoading={isMarkingPaid}>
        {t('markAsPaid')}
      </Button>
      <Button variant="outline" onClick={onVoid} isLoading={isVoiding}>
        {t('voidInvoice')}
      </Button>
    </div>
  )
}
