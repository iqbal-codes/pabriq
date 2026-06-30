import { Clock, FileText, ReceiptText, Upload } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useLocale, useTranslations } from 'use-intl'
import { StatusBadge } from '#/components/status-badge'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { formatCurrency, formatLongDate } from '#/lib/formatters'
import type { PortalInvoice } from '../model'

type Props = {
  invoices: PortalInvoice[]
  onUpload: (invoiceId: string, file: File) => Promise<void>
}

export function InvoiceListDialog({ invoices, onUpload }: Props) {
  const t = useTranslations('portal')
  const ti = useTranslations('invoices')
  const locale = useLocale()
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const now = new Date()

  const visibleInvoices = invoices.filter((inv) => inv.status !== 'void')
  if (visibleInvoices.length === 0) return null

  const unpaidCount = visibleInvoices.filter(
    (inv) => inv.status !== 'paid',
  ).length
  const totalAmount = visibleInvoices.reduce((sum, inv) => sum + inv.total, 0)
  const unpaidAmount = visibleInvoices
    .filter((inv) => inv.status !== 'paid')
    .reduce((sum, inv) => sum + inv.total, 0)

  const summaryText =
    unpaidCount > 0
      ? t('invoiceSummaryUnpaid', {
          count: unpaidCount,
          amount: formatCurrency(unpaidAmount, locale),
        })
      : t('invoiceSummary', {
          count: visibleInvoices.length,
          amount: formatCurrency(totalAmount, locale),
        })

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50"
        >
          <ReceiptText className="size-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-card-foreground">
              {t('invoiceDialogTitle')}
            </p>
            <p className="text-xs text-muted-foreground">{summaryText}</p>
          </div>
          <FileText className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('invoiceDialogTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {visibleInvoices.map((inv) => {
            const isUnpaid = inv.status === 'unpaid'
            const isOverdue = isUnpaid && now && new Date(inv.dueDate) < now
            const isPending = isUnpaid && inv.hasPaymentProof

            return (
              <div key={inv.id} className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{inv.invoiceNumber}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOverdue && (
                      <Badge variant="destructive">{ti('overdue')}</Badge>
                    )}
                    {isPending ? (
                      <Badge variant="secondary">
                        <Clock className="mr-1 size-3" />
                        {ti('pendingConfirmation')}
                      </Badge>
                    ) : (
                      <StatusBadge status={inv.status} />
                    )}
                  </div>
                </div>

                <div className="mb-2">
                  <p className="text-lg font-bold">
                    {formatCurrency(inv.total, locale)}
                  </p>
                  {inv.shippingFee && inv.shippingFee > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t('invoiceShipmentFee')}:{' '}
                      {formatCurrency(inv.shippingFee, locale)}
                    </p>
                  )}
                  {isUnpaid && (
                    <p className="text-sm text-muted-foreground">
                      {ti('dueDate')}: {formatLongDate(inv.dueDate, locale)}
                    </p>
                  )}
                </div>

                {inv.paymentMethodName && (
                  <div className="mb-3 rounded-lg bg-muted p-3 text-sm">
                    <p className="font-medium">{inv.paymentMethodName}</p>
                    {inv.paymentMethodAccountHolder && (
                      <p className="text-muted-foreground">
                        {inv.paymentMethodAccountHolder}
                      </p>
                    )}
                    {inv.paymentMethodInstructions && (
                      <p className="mt-1 text-muted-foreground">
                        {inv.paymentMethodInstructions}
                      </p>
                    )}
                  </div>
                )}

                {isUnpaid && (
                  <div className="w-full">
                    <input
                      type="file"
                      id={`proof-dialog-${inv.id}`}
                      aria-label={ti('uploadProof')}
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setUploadingId(inv.id)
                          onUpload(inv.id, file)
                            .then(() => {
                              toast.success(ti('pendingConfirmation'))
                            })
                            .catch(() => {
                              toast.error(ti('uploadFailed'))
                            })
                            .finally(() => {
                              setUploadingId(null)
                            })
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={uploadingId === inv.id}
                      onClick={() =>
                        document
                          .getElementById(`proof-dialog-${inv.id}`)
                          ?.click()
                      }
                    >
                      {uploadingId === inv.id ? (
                        <Clock className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 size-4" />
                      )}
                      {ti('uploadProof')}
                    </Button>
                  </div>
                )}

                <div className="mt-3">
                  <Button variant="ghost" size="sm" className="w-full" asChild>
                    <a
                      href={`/api/documents/invoices/token/${inv.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FileText className="mr-2 size-4" />
                      {ti('downloadInvoice')}
                    </a>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
