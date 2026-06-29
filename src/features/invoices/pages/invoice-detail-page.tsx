import { useParams } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { InvoiceActionButtons } from '#/features/invoices/components/invoice-action-buttons'
import { InvoiceCustomerCard } from '#/features/invoices/components/invoice-customer-card'
import { InvoiceHeaderActions } from '#/features/invoices/components/invoice-header-actions'
import { InvoiceLineItemsCard } from '#/features/invoices/components/invoice-line-items-card'
import { InvoiceMetaCard } from '#/features/invoices/components/invoice-meta-card'
import { InvoiceStatusTimeline } from '#/features/invoices/components/invoice-status-timeline'
import { PaymentMethodInstructionsCard } from '#/features/invoices/components/payment-method-instructions-card'
import { PendingPaymentsSection } from '#/features/invoices/components/pending-payments-section'
import { RejectPaymentDialog } from '#/features/invoices/components/reject-payment-dialog'
import {
  useConfirmPayment,
  useInvoice,
  useInvoicePayments,
  useMarkInvoicePaid,
  useRejectPayment,
  useVoidInvoice,
} from '#/features/invoices/hooks'

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

  const timelinePayments = payments ?? []

  return (
    <PageContent>
      <PageHeader title={`${t('viewInvoice')} — ${invoice.invoiceNumber}`} />

      <InvoiceHeaderActions
        invoiceId={invoice.id}
        status={invoice.status}
        percentage={invoice.percentage}
      />

      <InvoiceMetaCard
        issuedDate={invoice.issuedDate}
        dueDate={invoice.dueDate}
        total={invoice.total}
      />

      <InvoiceCustomerCard
        customer={customer}
        fallbackName={invoice.customerName}
      />

      <InvoiceLineItemsCard lineItems={lineItems} total={invoice.total} />

      {paymentMethod && (
        <PaymentMethodInstructionsCard paymentMethod={paymentMethod} />
      )}

      {invoice.notes && (
        <div className="rounded-xl border bg-card p-6">
          <p className="mb-3 text-sm font-semibold text-muted-foreground">
            {t('notes')}
          </p>
          <p className="whitespace-pre-wrap text-sm">{invoice.notes}</p>
        </div>
      )}

      <div>
        <InvoiceStatusTimeline
          invoiceCreatedAt={invoice.createdAt.toISOString()}
          payments={timelinePayments}
          invoiceStatus={invoice.status}
        />
      </div>

      <PendingPaymentsSection
        payments={timelinePayments}
        onConfirmPayment={handleConfirmPayment}
        onRejectPayment={(paymentId) => setRejectDialogId(paymentId)}
        isConfirming={confirmPayment.isPending}
        isRejecting={rejectPayment.isPending}
      />

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
