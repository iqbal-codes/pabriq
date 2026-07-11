import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import {
  FormActions,
  FormGrid,
  FormRoot,
  useAppForm,
} from '#/components/app/form'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import type { ShippingAddress } from '#/features/address/model'
import { useCreateInvoice, usePaymentMethods } from '#/features/invoices/hooks'
import {
  encodeBankPaymentSelection,
  parseInvoicePaymentSelection,
} from '#/features/invoices/payment-selection'
import { InvoiceAmountInput } from './invoice-amount-input'

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
  shippingAddress: ShippingAddress | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: OrderSummary
}

export function CreateInvoiceModal({ open, onOpenChange, order }: Props) {
  const t = useTranslations('invoices')
  const pt = useTranslations('production')
  const createInvoice = useCreateInvoice()
  const { data: paymentMethods } = usePaymentMethods()

  const hasPaidInvoices = order.invoicedPercentage > 0

  const [customAmount, setCustomAmount] = useState(order.total)

  const effectivePct = hasPaidInvoices
    ? order.remainingPercentage
    : order.total > 0
      ? Math.round((customAmount / order.total) * 10_000) / 100
      : 0
  const paymentMethodOptions = [
    ...(paymentMethods ?? []).map((pm) => ({
      value: encodeBankPaymentSelection(pm.id),
      label: pm.name,
    })),
    { value: 'midtrans', label: t('midtrans') },
  ]

  const form = useAppForm({
    defaultValues: {
      paymentMethodId: '',
      notes: '',
      hasShippingFee: false,
      manualShippingFee: 0,
      manualShippingDescription: 'Shipping Fee',
    },
    onSubmit: async ({ value }) => {
      let shippingFee: number | undefined
      let shippingFeeDescription: string | undefined

      if (hasPaidInvoices && value.hasShippingFee) {
        if (value.manualShippingFee > 0) {
          shippingFee = value.manualShippingFee
          shippingFeeDescription =
            value.manualShippingDescription || 'Shipping Fee'
        }
      }

      const baseTotal = hasPaidInvoices ? order.remainingAmount : customAmount

      const selection = parseInvoicePaymentSelection(value.paymentMethodId)

      const result = await createInvoice.mutateAsync({
        orderId: order.id,
        percentage: effectivePct,
        customProductTotal: baseTotal,
        customerId: order.customerId ?? '',
        customerName: order.customerName ?? '',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        paymentProvider: selection?.paymentProvider,
        paymentMethodId:
          selection?.paymentProvider === 'bank_transfer'
            ? selection.paymentMethodId
            : null,
        notes: value.notes || undefined,
        lineItems: [],
        shippingFee,
        shippingFeeDescription,
      })
      if (result.ok) {
        toast.success(t('title'))
        onOpenChange(false)
      } else {
        toast.error(result.error ?? t('failed'))
      }
    },
  })

  function computeDisplayShippingFee(
    hasShippingFee: boolean,
    manualShippingFee: number,
  ): number {
    if (!hasPaidInvoices) return 0
    if (hasShippingFee) return manualShippingFee
    return 0
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('createInvoice')}</DialogTitle>
          <DialogDescription>
            {t('orderLabel', { orderNumber: order.orderNumber ?? '—' })}
          </DialogDescription>
        </DialogHeader>

        <FormRoot form={form}>
          <form.Subscribe
            selector={(state) => ({
              hasShippingFee: state.values.hasShippingFee,
              manualShippingFee: state.values.manualShippingFee,
            })}
          >
            {({ hasShippingFee, manualShippingFee }) => {
              const shippingFee = computeDisplayShippingFee(
                hasShippingFee,
                manualShippingFee,
              )
              const baseTotal = hasPaidInvoices
                ? order.remainingAmount
                : customAmount
              const invoiceTotal = baseTotal + shippingFee

              return (
                <>
                  {/* Order total */}
                  <div className="rounded-lg bg-muted p-3 mb-4">
                    <p className="text-sm text-muted-foreground">
                      {t('total')}
                    </p>
                    <p className="text-xl font-bold">
                      {currencyFormatter.format(order.total)}
                    </p>
                  </div>

                  <FormGrid columns={1}>
                    {!hasPaidInvoices ? (
                      <div className="space-y-3">
                        <p className="text-sm font-medium">
                          {t('invoiceAmount')}
                        </p>
                        <InvoiceAmountInput
                          ariaLabel={t('invoiceAmount')}
                          baseAmount={order.total}
                          value={customAmount}
                          onChange={setCustomAmount}
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          {t('remaining')} ({order.remainingPercentage}%)
                        </p>
                        <p className="text-lg font-bold">
                          {currencyFormatter.format(invoiceTotal)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('alreadyInvoiced', {
                            percentage: order.invoicedPercentage,
                            amount: currencyFormatter.format(
                              order.invoicedAmount,
                            ),
                          })}
                        </p>
                      </div>
                    )}

                    {/* ── Shipment method section (settlement invoices only) ── */}
                    {hasPaidInvoices && (
                      <>
                        <form.AppField name="hasShippingFee">
                          {(field) => (
                            <div className="flex items-center gap-2 py-2">
                              <Checkbox
                                id={field.name}
                                checked={field.state.value}
                                onCheckedChange={(checked) =>
                                  field.handleChange(checked === true)
                                }
                              />
                              <Label
                                htmlFor={field.name}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {t('confirmManualShipmentFee')}
                              </Label>
                            </div>
                          )}
                        </form.AppField>

                        {hasShippingFee && (
                          <>
                            <form.AppField name="manualShippingFee">
                              {(field) => (
                                <field.NumberField
                                  label={pt('shipmentFee')}
                                  placeholder="0"
                                />
                              )}
                            </form.AppField>
                            <form.AppField name="manualShippingDescription">
                              {(field) => (
                                <field.TextField
                                  label={pt('shippingFeeDescription')}
                                  placeholder={pt(
                                    'shippingFeeDescriptionPlaceholder',
                                  )}
                                />
                              )}
                            </form.AppField>
                          </>
                        )}
                      </>
                    )}

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

                  <FormActions>
                    <form.AppForm>
                      <form.SubmitButton
                        isPending={createInvoice.isPending}
                        disabled={invoiceTotal <= 0}
                      >
                        {`${t('createInvoice')} — ${currencyFormatter.format(invoiceTotal)}`}
                      </form.SubmitButton>
                    </form.AppForm>
                  </FormActions>
                </>
              )
            }}
          </form.Subscribe>
        </FormRoot>
      </DialogContent>
    </Dialog>
  )
}
