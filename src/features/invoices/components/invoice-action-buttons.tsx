import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import { RecordPaymentDialog } from '#/features/invoices/components/record-payment-dialog'

type InvoiceActionButtonsProps = {
  canModify: boolean
  recordDialogOpen: boolean
  onRecordDialogOpenChange: (open: boolean) => void
  invoiceId: string
  onMarkPaid: () => void
  isMarkingPaid: boolean
  onVoid: () => void
  isVoiding: boolean
}

export function InvoiceActionButtons({
  canModify,
  recordDialogOpen,
  onRecordDialogOpenChange,
  invoiceId,
  onMarkPaid,
  isMarkingPaid,
  onVoid,
  isVoiding,
}: InvoiceActionButtonsProps) {
  const t = useTranslations('invoices')

  if (!canModify) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <RecordPaymentDialog
        open={recordDialogOpen}
        onOpenChange={onRecordDialogOpenChange}
        invoiceId={invoiceId}
      />

      <Button variant="default" onClick={onMarkPaid} disabled={isMarkingPaid}>
        {t('markAsPaid')}
      </Button>
      <Button variant="outline" onClick={onVoid} disabled={isVoiding}>
        {t('voidInvoice')}
      </Button>
    </div>
  )
}
