import { useParams } from '@tanstack/react-router'
import { Clock, ExternalLink, Printer } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { AvatarPhoto } from '#/components/app/avatar-photo'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { StatusBadge } from '#/components/status-badge'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { InvoiceStatusTimeline } from '#/features/invoices/components/invoice-status-timeline'
import { RecordPaymentDialog } from '#/features/invoices/components/record-payment-dialog'
import { RejectPaymentDialog } from '#/features/invoices/components/reject-payment-dialog'
import {
  useConfirmPayment,
  useInvoice,
  useInvoicePayments,
  useMarkInvoicePaid,
  useRejectPayment,
  useVoidInvoice,
} from '#/features/invoices/hooks'

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
})

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

export function InvoiceDetailPage() {
  const { id } = useParams({ from: '/_org/invoices/$id/' })
  const t = useTranslations('invoices')
  const st = useTranslations('status')

  const { data: result } = useInvoice(id)
  const { data: payments } = useInvoicePayments(id)
  const markPaid = useMarkInvoicePaid()
  const voidInv = useVoidInvoice()
  const confirmPayment = useConfirmPayment()
  const rejectPayment = useRejectPayment()

  const [recordDialogOpen, setRecordDialogOpen] = useState(false)
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null)

  if (!result) {
    return (
      <PageContent>
        <PageHeader title={t('viewInvoice')} />
      </PageContent>
    )
  }

  const { invoice, lineItems, paymentMethod, customer } = result

  const canModify =
    invoice.status === 'unpaid' || invoice.status === 'partially_paid'

  const handleMarkPaid = async () => {
    const res = await markPaid.mutateAsync(id)
    if (res.ok) {
      toast.success(st('paid'))
    } else {
      toast.error(res.error ?? 'Failed')
    }
  }

  const handleVoid = async () => {
    const res = await voidInv.mutateAsync(id)
    if (res.ok) {
      toast.success(t('voidInvoice'))
    } else {
      toast.error(res.error ?? 'Failed')
    }
  }

  const handleConfirmPayment = async (paymentId: string) => {
    const res = await confirmPayment.mutateAsync(paymentId)
    if (res.ok) {
      toast.success(t('paymentConfirmed'))
    } else {
      toast.error(res.error ?? 'Failed')
    }
  }

  const handleRejectPayment = async (paymentId: string, reason: string) => {
    const res = await rejectPayment.mutateAsync({
      paymentId,
      reason,
    })
    if (res.ok) {
      toast.success(t('paymentRejected'))
      setRejectDialogId(null)
    } else {
      toast.error(res.error ?? 'Failed')
    }
  }

  // Build events for timeline
  const timelinePayments = payments ?? []

  return (
    <PageContent>
      <PageHeader title={`${t('viewInvoice')} — ${invoice.invoiceNumber}`} />

      <div className="mb-4 flex items-center gap-2">
        <StatusBadge status={invoice.status} />
        {invoice.percentage && (
          <Badge variant="secondary">{invoice.percentage}%</Badge>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon-sm" asChild>
              <a
                href={`/api/documents/invoices/${invoice.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Printer className="size-4" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('printInvoice')}</TooltipContent>
        </Tooltip>
      </div>

      {/* Invoice Meta */}
      <div className="grid gap-3 rounded-xl border bg-card p-6 md:grid-cols-3">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">
            {t('issuedDate')}
          </p>
          <p className="font-semibold">{formatDate(invoice.issuedDate)}</p>
        </div>
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">
            {t('dueDate')}
          </p>
          <p className="font-semibold">{formatDate(invoice.dueDate)}</p>
        </div>
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">
            {t('total')}
          </p>
          <p className="text-lg font-semibold">
            {currencyFormatter.format(invoice.total)}
          </p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="flex items-center gap-4 rounded-xl border bg-card p-6">
        <AvatarPhoto
          assetId={customer?.photoAssetId ?? null}
          name={customer?.name ?? invoice.customerName}
          className="size-14"
        />
        <div>
          <p className="font-semibold">
            {customer?.name ?? invoice.customerName}
          </p>
          {customer?.phone && (
            <p className="text-sm text-muted-foreground">+62{customer.phone}</p>
          )}
        </div>
      </div>

      {/* Line Items */}
      <div className="rounded-xl border bg-card p-6">
        <p className="font-semibold text-muted-foreground mb-4">
          {t('lineItems')}
        </p>
        <div className="space-y-3">
          {lineItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-hairline bg-card p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{item.description}</p>
                <p className="text-sm text-muted-foreground">
                  {item.quantity}x @ {currencyFormatter.format(item.unitPrice)}
                </p>
              </div>
              <p className="font-semibold tabular-nums">
                {currencyFormatter.format(item.total)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end border-t pt-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-lg font-semibold">
              {currencyFormatter.format(invoice.total)}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Instructions */}
      {paymentMethod && (
        <div className="rounded-xl border bg-card p-6">
          <p className="font-semibold text-muted-foreground mb-4 flex items-center gap-2">
            {t('paymentMethod')}
          </p>
          <div className="rounded-lg bg-accent p-4 space-y-1">
            <p className="font-semibold">{paymentMethod.name}</p>
            {paymentMethod.accountHolder && (
              <p className="text-sm text-muted-foreground">
                {paymentMethod.accountHolder}
              </p>
            )}
            {paymentMethod.instructions && (
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                {paymentMethod.instructions}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {invoice.notes && (
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm font-semibold text-muted-foreground mb-3">
            Notes
          </p>
          <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}

      {/* Status Timeline */}
      <div>
        <InvoiceStatusTimeline
          invoiceCreatedAt={invoice.createdAt.toISOString()}
          payments={timelinePayments}
          invoiceStatus={invoice.status}
        />
      </div>

      {/* Pending Payments - Action needed */}
      {payments &&
        payments.filter((p) => p.status === 'pending').length > 0 && (
          <div className="rounded-xl border border-destructive/50 bg-card p-6">
            <p className="text-sm font-semibold text-destructive mb-4 flex items-center gap-2">
              <Clock className="size-4" />
              {t('pendingConfirmation')}
            </p>
            <div className="space-y-4">
              {payments.reduce<React.ReactNode[]>((acc, pm) => {
                if (pm.status !== 'pending') return acc
                acc.push(
                  <div
                    key={pm.id}
                    className="flex items-center justify-between rounded-lg border bg-card p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">
                          {currencyFormatter.format(pm.amount)}
                        </p>
                        <Badge variant="secondary">
                          {pm.method ?? 'Transfer'}
                        </Badge>
                      </div>
                      {pm.receivedAt && (
                        <p className="text-sm text-muted-foreground">
                          {new Date(pm.receivedAt).toLocaleDateString('id-ID')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {pm.proofAssetId && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon-sm" asChild>
                              <a
                                href={`/api/assets/${pm.proofAssetId}/download`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="size-4" />
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t('downloadProof')}</TooltipContent>
                        </Tooltip>
                      )}
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleConfirmPayment(pm.id)}
                        disabled={confirmPayment.isPending}
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRejectDialogId(pm.id)}
                        disabled={rejectPayment.isPending}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>,
                )
                return acc
              }, [])}
            </div>
          </div>
        )}

      {/* Actions */}
      {canModify && (
        <div className="flex flex-wrap items-center gap-2">
          <RecordPaymentDialog
            open={recordDialogOpen}
            onOpenChange={setRecordDialogOpen}
            invoiceId={id}
          />

          <Button
            variant="default"
            onClick={handleMarkPaid}
            disabled={markPaid.isPending}
          >
            {t('markAsPaid')}
          </Button>
          <Button
            variant="outline"
            onClick={handleVoid}
            disabled={voidInv.isPending}
          >
            {t('voidInvoice')}
          </Button>
        </div>
      )}

      <RejectPaymentDialog
        open={!!rejectDialogId}
        onOpenChange={(open_) => {
          if (!open_) {
            setRejectDialogId(null)
          }
        }}
        paymentId={rejectDialogId}
        onReject={handleRejectPayment}
        isPending={rejectPayment.isPending}
      />
    </PageContent>
  )
}
