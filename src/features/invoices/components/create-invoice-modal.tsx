import { Minus, Plus } from 'lucide-react'
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
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { useCreateInvoice, usePaymentMethods } from '#/features/invoices/hooks'

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
})

type OrderSummary = {
  id: string
  orderNumber: string | null
  total: number
  invoicedPercentage: number
  invoicedAmount: number
  remainingPercentage: number
  remainingAmount: number
  customerId: string | null
  customerName: string | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: OrderSummary
}

export function CreateInvoiceModal({ open, onOpenChange, order }: Props) {
  const t = useTranslations('invoices')
  const createInvoice = useCreateInvoice()
  const { data: paymentMethods } = usePaymentMethods()

  const hasPaidInvoices = order.invoicedPercentage > 0

  const [mode, setMode] = useState<'full' | 'remaining' | 'custom'>(
    hasPaidInvoices ? 'remaining' : 'full',
  )
  const [customPct, setCustomPct] = useState(50)

  const effectivePct =
    mode === 'remaining'
      ? order.remainingPercentage
      : mode === 'custom'
        ? customPct
        : 100

  const invoiceTotal =
    Math.round(((order.total * effectivePct) / 100) * 100) / 100

  const paymentMethodOptions = (paymentMethods ?? []).map((pm) => ({
    value: pm.id,
    label: pm.name,
  }))

  const form = useAppForm({
    defaultValues: {
      paymentMethodId: '',
      notes: '',
    },
    onSubmit: async ({ value }) => {
      const result = await createInvoice.mutateAsync({
        orderId: order.id,
        percentage: effectivePct,
        customerId: order.customerId ?? '',
        customerName: order.customerName ?? '',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        paymentMethodId: value.paymentMethodId,
        notes: value.notes || undefined,
        lineItems: [],
      })
      if (result.ok) {
        toast.success(t('title'))
        onOpenChange(false)
      } else {
        toast.error(result.error ?? 'Failed')
      }
    },
  })

  const fmt = (n: number) => currencyFormatter.format(n)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('createInvoice')}</DialogTitle>
          Order #{order.orderNumber ?? '—'}
        </DialogHeader>

        <FormRoot form={form}>
          {/* Order total */}
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm text-muted-foreground">{t('total')}</p>
            <p className="text-xl font-bold">{fmt(order.total)}</p>
          </div>

          {/* Invoice amount selector */}
          <FormSection title="">
            <FormGrid columns={1}>
              <div>
                <p className="text-sm font-medium mb-1">Invoice amount</p>
                <div className="flex flex-wrap gap-2">
                  {!hasPaidInvoices && (
                    <Button
                      type="button"
                      variant={mode === 'full' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMode('full')}
                    >
                      Full (100%)
                    </Button>
                  )}
                  {hasPaidInvoices && order.remainingPercentage > 0 && (
                    <Button
                      type="button"
                      variant={mode === 'remaining' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMode('remaining')}
                    >
                      Remaining ({order.remainingPercentage}%)
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant={mode === 'custom' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMode('custom')}
                  >
                    Custom
                  </Button>
                </div>

                {mode === 'custom' && (
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => setCustomPct((p) => Math.max(5, p - 5))}
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-16 text-center font-medium tabular-nums">
                      {customPct}%
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => setCustomPct((p) => Math.min(100, p + 5))}
                    >
                      <Plus className="size-3" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      (5% steps)
                    </span>
                  </div>
                )}

                <p className="mt-2 text-lg font-bold">{fmt(invoiceTotal)}</p>
                {hasPaidInvoices && (
                  <p className="text-xs text-muted-foreground">
                    Previously invoiced: {order.invoicedPercentage}% (
                    {fmt(order.invoicedAmount)})
                  </p>
                )}
              </div>

              <form.AppField name="paymentMethodId">
                {(field) => (
                  <field.SelectField
                    label={t('paymentMethod')}
                    options={paymentMethodOptions}
                    placeholder={t('paymentMethod')}
                  />
                )}
              </form.AppField>

              <form.AppField name="notes">
                {(field) => <field.TextareaField label={t('notes')} />}
              </form.AppField>
            </FormGrid>
          </FormSection>

          <FormActions>
            <form.AppForm>
              <form.SubmitButton
                disabled={createInvoice.isPending || invoiceTotal <= 0}
              >
                {`${t('createInvoice')} — ${fmt(invoiceTotal)}`}
              </form.SubmitButton>
            </form.AppForm>
          </FormActions>
        </FormRoot>
      </DialogContent>
    </Dialog>
  )
}
