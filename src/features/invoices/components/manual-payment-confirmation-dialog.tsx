import { Download, ImageOff, Landmark } from 'lucide-react'
import { useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { useInvoice } from '#/features/invoices/hooks'
import type { InvoicePaymentProof, InvoiceRow } from '#/features/invoices/model'
import { formatCurrency } from '#/lib/formatters'

type ManualPaymentConfirmationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: InvoiceRow
  paymentProofs: InvoicePaymentProof[]
  onConfirm: () => Promise<boolean>
  isConfirming: boolean
}

export function ManualPaymentConfirmationDialog({
  open,
  onOpenChange,
  invoice,
  paymentProofs,
  onConfirm,
  isConfirming,
}: ManualPaymentConfirmationDialogProps) {
  const t = useTranslations('invoices')
  const ct = useTranslations('common')
  const locale = useLocale()
  const { data: invoiceDetail } = useInvoice(invoice.id)
  const [isProcessing, setIsProcessing] = useState(false)

  const paymentMethod = invoiceDetail?.paymentMethod
  const latestProof =
    paymentProofs.length > 0
      ? paymentProofs.reduce((latest, current) =>
          current.createdAt > latest.createdAt ? current : latest,
        )
      : null

  const handleClose = (nextOpen: boolean) => {
    if (isProcessing || isConfirming) return
    onOpenChange(nextOpen)
  }

  const handleConfirm = async () => {
    setIsProcessing(true)
    try {
      const success = await onConfirm()
      if (success) {
        onOpenChange(false)
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const isLoading = isProcessing || isConfirming

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('confirmManualPayment')}</DialogTitle>
          <DialogDescription>{t('confirmManualPaymentDesc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Invoice summary */}
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {t('invoiceNumber')}
            </span>
            <div className="text-right">
              <span className="mr-2 text-sm font-medium">
                {invoice.invoiceNumber}
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {formatCurrency(invoice.total, locale)}
              </span>
            </div>
          </div>

          {/* Destination bank details */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Landmark className="size-3" aria-hidden="true" />
              {t('destinationBank')}
            </p>
            {paymentMethod ? (
              <div className="space-y-1">
                {paymentMethod.bankName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t('bankName')}
                    </span>
                    <span className="font-medium">
                      {paymentMethod.bankName}
                    </span>
                  </div>
                )}
                {paymentMethod.accountNumber && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t('accountNumber')}
                    </span>
                    <span className="font-medium tabular-nums">
                      {paymentMethod.accountNumber}
                    </span>
                  </div>
                )}
                {paymentMethod.accountHolder && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t('accountHolder')}
                    </span>
                    <span className="font-medium">
                      {paymentMethod.accountHolder}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('noPaymentMethodConfigured')}
              </p>
            )}
          </div>

          {/* Latest proof submission */}
          {latestProof && (
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {t('latestProofSubmitted')}
              </span>
              <time
                className="text-sm"
                dateTime={latestProof.createdAt.toISOString()}
              >
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(latestProof.createdAt)}
              </time>
            </div>
          )}

          {/* Payment proofs */}
          {paymentProofs.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {t('paymentProofs')} ({paymentProofs.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {paymentProofs.map((proof) => (
                  <div
                    key={proof.id}
                    className="flex items-center gap-2 border p-2"
                  >
                    <AssetImage
                      assetId={proof.proofAssetId}
                      assetKind="image"
                      className="size-16 object-cover"
                    />
                    <Button variant="outline" size="icon-sm" asChild>
                      <a
                        href={`/api/assets/${proof.proofAssetId}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                      >
                        <Download aria-hidden="true" />
                        <span className="sr-only">{t('downloadProof')}</span>
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-dashed p-3">
              <ImageOff
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="text-sm text-muted-foreground">
                {t('noPaymentProofs')}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={isLoading}
            onClick={() => handleClose(false)}
          >
            {ct('cancel')}
          </Button>
          <Button
            variant="default"
            isLoading={isLoading}
            disabled={isLoading}
            onClick={handleConfirm}
          >
            {t('confirmSimple')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
