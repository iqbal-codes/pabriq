import { useParams } from '@tanstack/react-router'
import {
  Banknote,
  CheckCircle2,
  Clock,
  ExternalLink,
  Printer,
  Upload,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { AvatarPhoto } from '#/components/app/avatar-photo'
import {
  FormActions,
  FormGrid,
  FormRoot,
  FormSection,
  useAppForm,
} from '#/components/app/form'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { StatusBadge } from '#/components/status-badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Badge } from '#/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
})

import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  useConfirmPayment,
  useCreatePayment,
  useInvoice,
  useInvoicePayments,
  useMarkInvoicePaid,
  useRejectPayment,
  useVoidInvoice,
} from '#/features/invoices/hooks'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

function formatDateTime(dateStr: string): { date: string; time: string } {
  const d = new Date(dateStr)
  return {
    date: d.toLocaleDateString('id-ID'),
    time: d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}

function getEventIcon(
  type: 'created' | 'payment_submitted' | 'payment_confirmed' | 'paid' | 'void',
) {
  switch (type) {
    case 'created':
      return (
        <Clock className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
      )
    case 'payment_submitted':
      return <Upload className="size-3.5 text-brand-accent shrink-0 mt-0.5" />
    case 'payment_confirmed':
    case 'paid':
      return <CheckCircle2 className="size-3.5 text-success shrink-0 mt-0.5" />
    case 'void':
      return <XCircle className="size-3.5 text-destructive shrink-0 mt-0.5" />
    default:
      return (
        <Banknote className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
      )
  }
}

type PaymentEvent = {
  id: string
  type: 'created' | 'payment_submitted' | 'payment_confirmed' | 'paid' | 'void'
  createdAt: string
  description: string
  proofAssetId?: string
}

function RecordPaymentDialog({
  open,
  onOpenChange,
  invoiceId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceId: string
}) {
  const t = useTranslations('invoices')
  const ct = useTranslations('common')
  const createPayment = useCreatePayment()

  const paymentMethodOptions = [
    { value: 'bank_transfer', label: t('bankTransfer') },
    { value: 'payment_gateway', label: t('gateway') },
    { value: 'cash', label: t('paymentCash') },
  ]

  const form = useAppForm({
    defaultValues: {
      amount: '',
      method: 'bank_transfer',
      reference: '',
    },
    onSubmit: async ({ value }) => {
      const amount = Number.parseFloat(value.amount)
      if (!amount || amount <= 0) {
        toast.error(t('invalidAmount'))
        return
      }
      const res = await createPayment.mutateAsync({
        invoiceId,
        amount,
        method: value.method as 'bank_transfer' | 'payment_gateway' | 'cash',
        reference: value.reference || undefined,
      })
      if (res.ok) {
        toast.success(t('paymentRecorded'))
        onOpenChange(false)
      } else {
        toast.error(res.error ?? 'Failed')
      }
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('recordPayment')}</DialogTitle>
        </DialogHeader>

        <FormRoot form={form}>
          <FormSection title="">
            <FormGrid columns={1}>
              <form.AppField name="amount">
                {(field) => (
                  <field.NumberField label={t('amount')} placeholder="0" />
                )}
              </form.AppField>
              <form.AppField name="method">
                {(field) => (
                  <field.SelectField
                    label={t('method')}
                    options={paymentMethodOptions}
                    placeholder={t('method')}
                  />
                )}
              </form.AppField>
              <form.AppField name="reference">
                {(field) => (
                  <field.TextField
                    label={t('reference')}
                    placeholder={t('reference')}
                  />
                )}
              </form.AppField>
            </FormGrid>
          </FormSection>

          <FormActions>
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              {ct('cancel')}
            </Button>
            <form.AppForm>
              <form.SubmitButton>{t('recordPayment')}</form.SubmitButton>
            </form.AppForm>
          </FormActions>
        </FormRoot>
      </DialogContent>
    </Dialog>
  )
}

function RejectPaymentDialog({
  open,
  onOpenChange,
  paymentId,
  onReject,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  paymentId: string | null
  onReject: (paymentId: string, reason: string) => Promise<void>
  isPending: boolean
}) {
  const t = useTranslations('invoices')
  const ct = useTranslations('common')

  const form = useAppForm({
    defaultValues: {
      reason: '',
    },
    onSubmit: async ({ value }) => {
      if (paymentId) {
        await onReject(paymentId, value.reason.trim())
      }
    },
  })

  return (
    <AlertDialog
      open={open}
      onOpenChange={(open_) => {
        if (!open_) {
          onOpenChange(false)
          form.reset()
        }
      }}
    >
      <AlertDialogContent>
        <FormRoot form={form}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('rejectSimple')} {t('payments')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('rejectReasonPlaceholder')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-3">
            <form.AppField name="reason">
              {(field) => (
                <field.TextareaField
                  label={t('rejectReasonPlaceholder')}
                  placeholder={t('rejectReasonPlaceholder')}
                />
              )}
            </form.AppField>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              type="button"
              onClick={() => {
                onOpenChange(false)
                form.reset()
              }}
            >
              {ct('cancel')}
            </AlertDialogCancel>
            <form.AppForm>
              <AlertDialogAction
                type="submit"
                onClick={form.handleSubmit}
                disabled={!form.state.values.reason.trim() || isPending}
                asChild
              >
                <Button
                  variant="default"
                  disabled={!form.state.values.reason.trim() || isPending}
                >
                  {t('rejectSimple')}
                </Button>
              </AlertDialogAction>
            </form.AppForm>
          </AlertDialogFooter>
        </FormRoot>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function InvoiceStatusTimeline({
  invoiceCreatedAt,
  payments,
  invoiceStatus,
}: {
  invoiceCreatedAt: string
  payments: Array<{
    id: string
    amount: number
    status: string
    method: string | null
    proofAssetId: string | null
    receivedAt: string | Date | null
    createdAt: string | Date
    updatedAt: string | Date | null
  }>
  invoiceStatus: string
}) {
  const t = useTranslations('invoices')
  const events: PaymentEvent[] = []

  // Invoice created event
  events.push({
    id: 'created',
    type: 'created',
    createdAt: new Date(invoiceCreatedAt).toISOString(),
    description: t('invoiceCreated'),
  })

  // Process payments to create events
  payments.forEach((pm) => {
    const receivedAt = pm.receivedAt
      ? new Date(pm.receivedAt).toISOString()
      : new Date(pm.createdAt).toISOString()

    // Payment proof submitted
    if (pm.proofAssetId && pm.status !== 'rejected') {
      events.push({
        id: `proof-${pm.id}`,
        type: 'payment_submitted',
        createdAt: receivedAt,
        description: t('paymentProofUploaded'),
        proofAssetId: pm.proofAssetId,
      })
    }

    // Payment confirmed
    if (pm.status === 'confirmed') {
      const updatedAt = pm.updatedAt
        ? new Date(pm.updatedAt).toISOString()
        : receivedAt
      events.push({
        id: `confirmed-${pm.id}`,
        type: 'payment_confirmed',
        createdAt: updatedAt,
        description: `${t('invoicePaid')} — Rp ${pm.amount.toLocaleString('id-ID')}`,
      })
    }
  })

  // Invoice paid event (if fully paid)
  if (invoiceStatus === 'paid') {
    const confirmedPayment = payments.find((p) => p.status === 'confirmed')
    events.push({
      id: 'paid',
      type: 'paid',
      createdAt: confirmedPayment?.updatedAt
        ? new Date(confirmedPayment.updatedAt).toISOString()
        : new Date().toISOString(),
      description: t('invoicePaid'),
    })
  }

  // Invoice void event
  if (invoiceStatus === 'void') {
    events.push({
      id: 'void',
      type: 'void',
      createdAt: new Date().toISOString(),
      description: t('invoiceVoided'),
    })
  }

  // Sort by date
  events.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )

  // Only show timeline if there are events beyond creation
  if (events.length <= 1 && invoiceStatus === 'unpaid') {
    return null
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <p className="font-semibold text-muted-foreground mb-4">
        {t('paymentHistory')}
      </p>
      <div className="space-y-3">
        {events.map((event, i) => {
          const { date, time } = formatDateTime(event.createdAt)

          return (
            <div key={event.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="size-6 flex items-start justify-center shrink-0 mt-0.5">
                  {getEventIcon(event.type)}
                </div>
                {i < events.length - 1 && (
                  <div className="w-px flex-1 bg-border" />
                )}
              </div>
              <div className="pb-3 min-w-0 flex-1">
                <p className="text-[13px] text-muted-foreground">
                  {date} {time}
                </p>
                <p className="text-sm font-medium">{event.description}</p>
                {event.proofAssetId && (
                  <a
                    href={`/api/assets/${event.proofAssetId}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block text-[13px] font-medium text-brand-accent hover:underline"
                  >
                    {t('viewPaymentProof')}
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
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

  const fmt = (n: number) => currencyFormatter.format(n)

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
          <p className="text-lg font-semibold">{fmt(invoice.total)}</p>
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
                  {item.quantity}x @ {fmt(item.unitPrice)}
                </p>
              </div>
              <p className="font-semibold tabular-nums">{fmt(item.total)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end border-t pt-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-lg font-semibold">{fmt(invoice.total)}</p>
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
              {payments
                .filter((pm) => pm.status === 'pending')
                .map((pm) => (
                  <div
                    key={pm.id}
                    className="flex items-center justify-between rounded-lg border bg-card p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{fmt(pm.amount)}</p>
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
                        <CheckCircle2 className="mr-1 size-3" />
                        {t('confirmSimple')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRejectDialogId(pm.id)}
                        disabled={rejectPayment.isPending}
                      >
                        <XCircle className="mr-1 size-3" />
                        {t('rejectSimple')}
                      </Button>
                    </div>
                  </div>
                ))}
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
            <CheckCircle2 className="mr-2 size-4" />
            {t('markAsPaid')}
          </Button>
          <Button
            variant="outline"
            onClick={handleVoid}
            disabled={voidInv.isPending}
          >
            <XCircle className="mr-2 size-4" />
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
