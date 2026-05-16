import { Banknote, CheckCircle2, ExternalLink, XCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
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

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
})

import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
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
  useInvoiceBalance,
  useInvoicePayments,
  useMarkInvoicePaid,
  useRejectPayment,
  useVoidInvoice,
} from '#/features/invoices/hooks'
import { Route } from '#/routes/_org/invoices/$id/index'

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

export function InvoiceDetailPage() {
  const { id } = Route.useParams()
  const t = useTranslations('invoices')
  const st = useTranslations('status')

  const { data: result } = useInvoice(id)
  const { data: payments } = useInvoicePayments(id)
  const { data: balance } = useInvoiceBalance(id)
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

  const { invoice, lineItems, paymentMethod } = result
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

  return (
    <PageContent>
      <PageHeader title={`${t('viewInvoice')} — ${invoice.invoiceNumber}`} />

      <div className="mb-4 flex items-center gap-2">
        <StatusBadge status={invoice.status} />
        {invoice.percentage && (
          <Badge variant="secondary">{invoice.percentage}%</Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('customer')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{invoice.customerName}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('total')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-bold">{fmt(invoice.total)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('dueDate')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{invoice.dueDate}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('paymentMethod')}</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentMethod ? (
              <div>
                <p className="font-medium">{paymentMethod.name}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">&mdash;</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t('lineItems')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {lineItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity}x @ {fmt(item.unitPrice)}
                  </p>
                </div>
                <p className="font-semibold tabular-nums">{fmt(item.total)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Section */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="size-5" />
            {t('payments')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {balance && (
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted p-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('total')}</p>
                <p className="font-semibold">{fmt(balance.total)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('paidAmount')}
                </p>
                <p className="font-semibold text-success">
                  {fmt(balance.confirmedAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('pendingAmount')}
                </p>
                <p className="font-semibold text-warning">
                  {fmt(balance.pendingAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('remaining')}
                </p>
                <p className="font-semibold">{fmt(balance.remaining)}</p>
              </div>
            </div>
          )}

          {payments && payments.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {t('paymentHistory')}
              </p>
              {payments.map((pm) => (
                <div
                  key={pm.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{fmt(pm.amount)}</p>
                      <Badge
                        variant={
                          pm.status === 'rejected' ? 'destructive' : 'secondary'
                        }
                      >
                        {pm.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {pm.method}
                      {pm.reference ? ` — ${pm.reference}` : ''}
                    </p>
                    {pm.receivedAt && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(pm.receivedAt).toLocaleDateString('id-ID')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {pm.proofAssetId && (
                      <Button variant="ghost" size="icon-sm" asChild>
                        <a
                          href={`/api/assets/${pm.proofAssetId}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      </Button>
                    )}
                    {pm.status === 'pending' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConfirmPayment(pm.id)}
                          disabled={confirmPayment.isPending}
                        >
                          <CheckCircle2 className="mr-1 size-3" />
                          {t('confirmSimple')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRejectDialogId(pm.id)}
                        >
                          <XCircle className="mr-1 size-3" />
                          {t('rejectSimple')}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {canModify && (
            <div className="flex flex-wrap items-center gap-2">
              <RecordPaymentDialog
                open={recordDialogOpen}
                onOpenChange={setRecordDialogOpen}
                invoiceId={id}
              />

              <Button
                variant="default"
                size="sm"
                onClick={handleMarkPaid}
                disabled={markPaid.isPending}
              >
                <CheckCircle2 className="mr-2 size-4" />
                {t('markAsPaid')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleVoid}
                disabled={voidInv.isPending}
              >
                <XCircle className="mr-2 size-4" />
                {t('voidInvoice')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
