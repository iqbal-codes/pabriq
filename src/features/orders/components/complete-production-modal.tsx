import { Truck } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import {
  FormActions,
  FormGrid,
  FormRoot,
  FormSection,
  useAppForm,
} from '#/components/app/form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import type { ShippingAddress } from '#/features/address/model'
import { usePaymentMethods } from '#/features/invoices/hooks'
import {
  encodeBankPaymentSelection,
  parseInvoicePaymentSelection,
} from '#/features/invoices/payment-selection'
import { useCompleteProduction } from '#/features/orders/hooks'
import { useOrgSettings } from '#/features/settings/hooks'
import {
  type CompleteProductionForm,
  FinalInvoicePreview,
  ShipmentDetailsSection,
} from './complete-production-form-sections'

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

export function CompleteProductionModal({ open, onOpenChange, order }: Props) {
  const t = useTranslations('production')
  const it = useTranslations('invoices')
  const completeProduction = useCompleteProduction()
  const { data: paymentMethods } = usePaymentMethods()
  const { data: orgSettings } = useOrgSettings()

  const paymentMethodOptions = [
    ...(paymentMethods ?? []).map((pm) => ({
      value: encodeBankPaymentSelection(pm.id),
      label: pm.name,
    })),
    ...(orgSettings?.hasMidtransCredentials
      ? [{ value: 'midtrans', label: it('midtrans') }]
      : []),
  ]

  const form = useAppForm({
    defaultValues: {
      courier: '',
      trackingNumber: '',
      shippingFee: 0,
      shippingFeeDescription: 'Shipping Fee',
      paymentMethodId: '',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      notes: '',
    },
    onSubmit: async ({ value }) => {
      const shippingAmount = value.shippingFee || 0
      const invoiceTotal = order.remainingAmount + shippingAmount
      const isInvoiceNeeded = invoiceTotal > 0

      if (isInvoiceNeeded && !value.paymentMethodId) {
        toast.error(t('paymentMethodRequired'))
        return
      }

      if (value.courier && !value.trackingNumber) {
        toast.error(t('trackingNumberRequired'))
        return
      }

      const selection = parseInvoicePaymentSelection(value.paymentMethodId)

      const result = await completeProduction.mutateAsync({
        id: order.id,
        courier: value.courier || undefined,
        trackingNumber: value.trackingNumber || undefined,
        shippingFee: shippingAmount > 0 ? shippingAmount : undefined,
        shippingFeeDescription:
          shippingAmount > 0 ? value.shippingFeeDescription : undefined,
        invoiceDueDate: isInvoiceNeeded ? value.dueDate : undefined,
        invoicePaymentProvider: isInvoiceNeeded
          ? selection?.paymentProvider
          : undefined,
        invoicePaymentMethodId:
          isInvoiceNeeded &&
          selection &&
          selection.paymentProvider === 'bank_transfer'
            ? (selection.paymentMethodId ?? undefined)
            : undefined,
        invoiceNotes: isInvoiceNeeded && value.notes ? value.notes : undefined,
      })

      if (result.ok) {
        toast.success(t('markAsShipped'))
        onOpenChange(false)
      } else {
        toast.error(result.error ?? t('completeProductionFailed'))
      }
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="size-5" />
            {t('completeProduction')}
          </DialogTitle>
          {t('orderNumberLabel')}
          {order.orderNumber ?? '—'}
        </DialogHeader>

        {/* Task Completion Status */}
        <div className="rounded-lg border border-success/30 bg-success/10 p-3">
          <p className="text-sm font-medium text-success flex items-center gap-2">
            <span className="size-2 rounded-full bg-success" />
            {t('allTasksCompleted')}
          </p>
        </div>

        <FormRoot form={form}>
          <form.Subscribe selector={(state) => state.values.shippingFee}>
            {(shippingFee) => {
              const shippingAmount = shippingFee || 0
              const invoiceTotal = order.remainingAmount + shippingAmount

              return (
                <>
                  <ShipmentDetailsSection
                    form={form as unknown as CompleteProductionForm}
                    order={order}
                    labels={{
                      title: t('shipmentDetails'),
                      address: t('shipmentAddress'),
                      courier: t('courier'),
                      courierPlaceholder: t('courierPlaceholder'),
                      trackingNumber: t('trackingNumber'),
                      trackingNumberPlaceholder: t('trackingNumberPlaceholder'),
                      shippingFee: t('shipmentFee'),
                      optional: t('optional'),
                      shippingFeeDescription: t('shippingFeeDescription'),
                      shippingFeeDescriptionPlaceholder: t(
                        'shippingFeeDescriptionPlaceholder',
                      ),
                    }}
                    shippingAmount={shippingAmount}
                  />

                  {/* Payment Details */}
                  {invoiceTotal > 0 && (
                    <FormSection title={t('payment')}>
                      <FormGrid columns={1}>
                        <form.AppField name="paymentMethodId">
                          {(field) => (
                            <field.SelectField
                              label={it('paymentMethod')}
                              options={paymentMethodOptions}
                              placeholder={it('paymentMethod')}
                            />
                          )}
                        </form.AppField>

                        <form.AppField name="notes">
                          {(field) => (
                            <field.TextareaField label={it('notes')} />
                          )}
                        </form.AppField>
                      </FormGrid>
                    </FormSection>
                  )}

                  {invoiceTotal > 0 && (
                    <FinalInvoicePreview
                      order={order}
                      shippingAmount={shippingAmount}
                      invoiceTotal={invoiceTotal}
                      labels={{
                        title: t('finalInvoice'),
                        orderTotal: t('orderTotal'),
                        alreadyPaid: t('alreadyPaid'),
                        remainingPayment: t('remainingPayment'),
                        shippingFee: t('shipmentFee'),
                        total: t('total'),
                      }}
                    />
                  )}

                  <FormActions>
                    <form.AppForm>
                      <form.SubmitButton
                        isPending={completeProduction.isPending}
                      >
                        {invoiceTotal > 0
                          ? t('createInvoiceAndShip')
                          : t('markAsShipped')}
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
