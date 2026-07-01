import { Clock, ExternalLink, ReceiptText } from 'lucide-react'
import { useLocale, useTranslations } from 'use-intl'
import { StatusBadge } from '#/components/status-badge'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { formatCurrency, formatLongDate } from '#/lib/formatters'
import type { PortalInvoice } from '../model'
import { SubmitPaymentProofDialog } from './submit-payment-proof-dialog'

type Props = {
  invoices: PortalInvoice[]
  token: string
}

export function InvoiceSectionCard({ invoices, token }: Props) {
  const ti = useTranslations('invoices')
  const locale = useLocale()

  const visibleInvoices = invoices.filter((inv) => inv.status !== 'void')
  if (visibleInvoices.length === 0) return null

  const now = new Date()

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ReceiptText className="size-4 text-muted-foreground shrink-0" />
        <h2 className="text-sm font-semibold text-card-foreground">
          {ti('title')}
        </h2>
      </div>

      <div className="space-y-4">
        {visibleInvoices.map((inv) => {
          const isUnpaid = inv.status === 'unpaid'
          const isOverdue = isUnpaid && new Date(inv.dueDate) < now
          const isPending = isUnpaid && inv.hasPaymentProof

          return (
            <div
              key={inv.id}
              className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
            >
              {/* Invoice Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="font-semibold text-sm text-card-foreground">
                  {inv.invoiceNumber}
                </p>
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

              {/* Amount & Due Date */}
              <div className="px-4 py-3 space-y-0.5">
                <p className="text-xl font-bold text-card-foreground">
                  {formatCurrency(inv.total, locale)}
                </p>
                {inv.shippingFee && inv.shippingFee > 0 && (
                  <p className="text-xs text-muted-foreground">
                    + {formatCurrency(inv.shippingFee, locale)} ongkir
                  </p>
                )}
                {isUnpaid && (
                  <p className="text-xs text-muted-foreground">
                    {ti('dueDate')}: {formatLongDate(inv.dueDate, locale)}
                  </p>
                )}
              </div>

              {/* Payment Method */}
              {inv.paymentMethodName && (
                <div className="mx-4 mb-3 rounded-lg bg-muted/60 px-3 py-2.5 text-xs space-y-1">
                  <p className="font-semibold text-card-foreground">
                    {inv.paymentMethodName}
                  </p>
                  {inv.paymentMethodBankName && (
                    <p className="text-muted-foreground">
                      {inv.paymentMethodBankName}
                    </p>
                  )}
                  {inv.paymentMethodAccountNumber && (
                    <p className="font-mono text-card-foreground">
                      {inv.paymentMethodAccountNumber}
                    </p>
                  )}
                  {inv.paymentMethodAccountHolder && (
                    <p className="text-muted-foreground">
                      {inv.paymentMethodAccountHolder}
                    </p>
                  )}
                  {inv.paymentMethodInstructions && (
                    <p className="text-muted-foreground leading-relaxed mt-1">
                      {inv.paymentMethodInstructions}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="px-4 pb-4 space-y-2">
                {isUnpaid && (
                  <SubmitPaymentProofDialog
                    invoiceId={inv.id}
                    token={token}
                    hasExistingProof={inv.hasPaymentProof}
                  />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  asChild
                >
                  <a
                    href={`/api/documents/invoices/portal/${inv.id}/${token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 size-3.5" />
                    {ti('downloadInvoice')}
                  </a>
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
