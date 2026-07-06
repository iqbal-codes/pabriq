import { Link, useParams } from '@tanstack/react-router'
import { Printer, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useLocale, useTranslations } from 'use-intl'
import { AvatarPhoto } from '#/components/app/avatar-photo'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { StatusBadge } from '#/components/status-badge'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { InvoiceActionButtons } from '#/features/invoices/components/invoice-action-buttons'
import { InvoiceLineItemsCard } from '#/features/invoices/components/invoice-line-items-card'
import { InvoiceStatusTimeline } from '#/features/invoices/components/invoice-status-timeline'
import { PaymentMethodInstructionsCard } from '#/features/invoices/components/payment-method-instructions-card'
import { PendingPaymentsSection } from '#/features/invoices/components/pending-payments-section'
import { RejectPaymentDialog } from '#/features/invoices/components/reject-payment-dialog'
import {
  useConfirmPayment,
  useInvoice,
  useInvoicePayments,
  useMarkInvoicePaid,
  useOrderForInvoice,
  useReconcileInvoicePayment,
  useRejectPayment,
  useVoidInvoice,
} from '#/features/invoices/hooks'
import { formatCurrency, formatShortDate } from '#/lib/formatters'
export function InvoiceDetailPage() {
  const { id } = useParams({ from: '/_org/invoices/$id/' })
  const t = useTranslations('invoices')
  const st = useTranslations('status')
  const ct = useTranslations('common')
  const locale = useLocale()

  const { data: result } = useInvoice(id)
  const { data: payments } = useInvoicePayments(id)
  const markPaid = useMarkInvoicePaid()
  const voidInv = useVoidInvoice()
  const confirmPayment = useConfirmPayment()
  const rejectPayment = useRejectPayment()
  const reconcileInvoice = useReconcileInvoicePayment()
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

  // Fetch related order if invoice has an orderId
  const { data: orderData } = useOrderForInvoice(invoice.orderId ?? undefined)

  const canModify =
    invoice.status === 'unpaid' || invoice.status === 'partially_paid'

  const handleMarkPaid = async () => {
    const res = await markPaid.mutateAsync(id)
    if (res.ok) {
      toast.success(st('paid'))
    } else {
      toast.error(res.error ?? t('failed'))
    }
  }

  const handleVoid = async () => {
    const res = await voidInv.mutateAsync(id)
    if (res.ok) {
      toast.success(t('voidInvoice'))
    } else {
      toast.error(res.error ?? t('failed'))
    }
  }

  const handleConfirmPayment = async (paymentId: string) => {
    const res = await confirmPayment.mutateAsync(paymentId)
    if (res.ok) {
      toast.success(t('paymentConfirmed'))
    } else {
      toast.error(res.error ?? t('failed'))
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
      toast.error(res.error ?? t('failed'))
    }
  }

  const handleReconcile = async () => {
    const res = await reconcileInvoice.mutateAsync(id)
    if (!res.ok) {
      toast.error(res.error ?? t('failed'))
      return
    }
    if (res.status === 'paid') {
      toast.success(t('reconcilePaid'))
    } else if (res.status === 'not_settled_yet') {
      toast.warning(t('reconcileNotSettled'))
    } else if (res.status === 'no_midtrans_order_id') {
      toast.info(t('reconcileNoOrderId'))
    } else if (res.status === 'mismatch') {
      toast.error(t('reconcileMismatch'))
    }
  }

  const timelinePayments = payments ?? []

  return (
    <PageContent>
      <PageHeader
        title={`${t('viewInvoice')} — ${invoice.invoiceNumber}`}
        backAction={{ label: ct('back'), href: '/invoices' }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left Pane */}
        <div className="lg:col-span-2 space-y-6">
          <InvoiceLineItemsCard lineItems={lineItems} total={invoice.total} />

          {paymentMethod && (
            <PaymentMethodInstructionsCard paymentMethod={paymentMethod} />
          )}

          <InvoiceStatusTimeline
            invoiceCreatedAt={invoice.createdAt.toISOString()}
            payments={timelinePayments}
            invoiceStatus={invoice.status}
          />

          <PendingPaymentsSection
            payments={timelinePayments}
            onConfirmPayment={handleConfirmPayment}
            onRejectPayment={(paymentId) => setRejectDialogId(paymentId)}
            confirmingPaymentId={
              confirmPayment.isPending ? confirmPayment.variables : null
            }
            rejectingPaymentId={
              rejectPayment.isPending
                ? (rejectPayment.variables?.paymentId ?? null)
                : null
            }
          />
        </div>

        {/* Right Pane */}
        <div className="lg:col-span-1 space-y-6">
          {/* Invoice Details Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusBadge status={invoice.status} />
                  {invoice.percentage && (
                    <Badge variant="secondary">{invoice.percentage}%</Badge>
                  )}
                </div>
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
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Total */}
              <div>
                <p className="text-sm text-muted-foreground">{t('total')}</p>
                <p className="text-2xl font-bold font-mono">
                  {formatCurrency(invoice.total, locale)}
                </p>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3">
                {invoice.percentage != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t('percentage')}
                    </p>
                    <p className="text-sm">{invoice.percentage}%</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t('issuedDate')}
                  </p>
                  <p className="text-sm">
                    {formatShortDate(invoice.issuedDate, locale)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t('dueDate')}
                  </p>
                  <p className="text-sm">
                    {formatShortDate(invoice.dueDate, locale)}
                  </p>
                </div>
                {invoice.status === 'paid' && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {st('paid')}
                    </p>
                    <p className="text-sm">
                      {invoice.updatedAt
                        ? formatShortDate(
                            invoice.updatedAt.toISOString(),
                            locale,
                          )
                        : '—'}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <InvoiceActionButtons
                canModify={canModify}
                recordDialogOpen={recordDialogOpen}
                onRecordDialogOpenChange={setRecordDialogOpen}
                invoiceId={id}
                onMarkPaid={handleMarkPaid}
                isMarkingPaid={markPaid.isPending}
                onVoid={handleVoid}
                isVoiding={voidInv.isPending}
              />

              {invoice.midtransOrderId && invoice.status !== 'paid' && invoice.status !== 'void' ? (
                <Button
                  variant="outline"
                  onClick={handleReconcile}
                  isLoading={reconcileInvoice.isPending}
                  className="w-full"
                >
                  <RefreshCw className="mr-2 size-4" />
                  {t('reconcileWithMidtrans')}
                </Button>
              ) : null}
            </CardContent>
          </Card>

          {/* Customer Details Card */}
          {customer && (
            <Card>
              <CardHeader>
                <CardTitle>{t('customer')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <AvatarPhoto
                    assetId={customer.photoAssetId}
                    name={customer.name}
                    className="size-10"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/customers/$id"
                      params={{ id: customer.id }}
                      className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                      {customer.name}
                    </Link>
                    {customer.phone && (
                      <p className="text-sm text-muted-foreground">
                        {customer.phone}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Related Order Card */}
          {invoice.orderId && (
            <Card>
              <CardHeader>
                <CardTitle>{t('orderLabel', { orderNumber: '' })}</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  to="/orders/$id"
                  params={{ id: invoice.orderId }}
                  className="flex items-center gap-2 text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  {orderData?.order.orderNumber ??
                    t('orderLabel', { orderNumber: invoice.orderId })}
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

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
