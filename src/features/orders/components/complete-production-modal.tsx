import { Truck } from 'lucide-react'
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
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import type { ShippingAddress } from '#/features/address/model'
import { useCompleteProduction } from '#/features/orders/hooks'
import { usePaymentMethods } from '#/features/invoices/hooks'

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

  const [showShippingDesc, setShowShippingDesc] = useState(false)
  const [shippingFeeRaw, setShippingFeeRaw] = useState('')

  const paymentMethodOptions = (paymentMethods ?? []).map((pm) => ({
    value: pm.id,
    label: pm.name,
  }))

  const form = useAppForm({
    defaultValues: {
      courier: '',
      trackingNumber: '',
      shippingFee: '',
      shippingFeeDescription: 'Shipping Fee',
      paymentMethodId: '',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      notes: '',
    },
    onSubmit: async ({ value }) => {
      if (!value.paymentMethodId) {
        toast.error('Please select a payment method')
        return
      }

      const shippingAmount = Number.parseFloat(value.shippingFee) || 0
      const invoiceTotal = order.remainingAmount + shippingAmount

      if (invoiceTotal <= 0) {
        toast.error('Invoice amount must be greater than 0')
        return
      }

      const result = await completeProduction.mutateAsync({
        id: order.id,
        courier: value.courier || undefined,
        trackingNumber: value.trackingNumber || undefined,
        shippingFee: shippingAmount > 0 ? shippingAmount : undefined,
        shippingFeeDescription: shippingAmount > 0 ? value.shippingFeeDescription : undefined,
        invoicePercentage: 100, // Always pay remaining 100%
        invoiceDueDate: value.dueDate,
        invoicePaymentMethodId: value.paymentMethodId,
        invoiceNotes: value.notes || undefined,
      })

      if (result.ok) {
        toast.success(t('markAsShipped'))
        onOpenChange(false)
      } else {
        toast.error(result.error ?? 'Failed')
      }
    },
  })

  const shippingAmount = Number.parseFloat(shippingFeeRaw) || 0
  const invoiceTotal = order.remainingAmount + shippingAmount

  const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(n)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="size-5" />
            {t('completeProduction')}
          </DialogTitle>
          Order #{order.orderNumber ?? '—'}
        </DialogHeader>

        {/* Task Completion Status */}
        <div className="rounded-lg bg-green-50 border border-green-200 p-3">
          <p className="text-sm font-medium text-green-800 flex items-center gap-2">
            <span className="size-2 rounded-full bg-green-500" />
            {t('allTasksCompleted')}
          </p>
        </div>

        <FormRoot form={form}>
          {/* Shipment Details */}
          <FormSection title={t('shipmentDetails')}>
            <FormGrid columns={1}>
              {/* Shipping Address Display */}
              {order.shippingAddress && (
                <div className="rounded-lg border p-3 text-sm">
                  <p className="font-medium mb-1">{t('shipmentAddress')}</p>
                  <p className="text-muted-foreground">
                    {order.shippingAddress.streetAddress}
                    {order.shippingAddress.areaName && (
                      <>, {order.shippingAddress.areaName}</>
                    )}
                  </p>
                </div>
              )}

              <form.AppField name="courier">
                {(field) => (
                  <field.TextField label={t('courier')} placeholder={t('courierPlaceholder')} />
                )}
              </form.AppField>

              <form.AppField name="trackingNumber">
                {(field) => (
                  <field.TextField label={t('trackingNumber')} placeholder={t('trackingNumberPlaceholder')} />
                )}
              </form.AppField>

              <div>
                <Label htmlFor="shippingFee" className="text-sm font-medium">
                  {t('shipmentFee')} <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="shippingFee"
                  type="number"
                  value={shippingFeeRaw}
                  onChange={(e) => {
                    setShippingFeeRaw(e.target.value)
                    form.setFieldValue('shippingFee', e.target.value)
                    setShowShippingDesc(Number.parseFloat(e.target.value) > 0)
                  }}
                  placeholder="0"
                  min={0}
                  className="mt-1"
                />
              </div>

              {showShippingDesc && (
                <form.AppField name="shippingFeeDescription">
                  {(field) => (
                    <field.TextField label="Description" placeholder="e.g., Shipping Fee" />
                  )}
                </form.AppField>
              )}
            </FormGrid>
          </FormSection>

          {/* Payment Details */}
          <FormSection title="Payment">
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

              <form.AppField name="dueDate">
                {(field) => (
                  <field.TextField label={it('dueDate')} />
                )}
              </form.AppField>

              <form.AppField name="notes">
                {(field) => (
                  <field.TextareaField label={it('notes')} />
                )}
              </form.AppField>
            </FormGrid>
          </FormSection>

          {/* Final Invoice Preview */}
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 space-y-3">
            <p className="text-sm font-medium text-orange-800 flex items-center gap-2">
              <Truck className="size-4" />
              Final Invoice
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Total</span>
                <span className="font-medium">{fmt(order.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Already Paid</span>
                <span className="font-medium text-green-600">{fmt(order.invoicedAmount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">{t('remainingPayment')}</span>
                <span className="font-medium text-orange-600">{fmt(order.remainingAmount)}</span>
              </div>
              {shippingAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping Fee</span>
                  <span className="font-medium">+{fmt(shippingAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-orange-600 text-lg">{fmt(invoiceTotal)}</span>
              </div>
            </div>
          </div>

          <FormActions>
            <form.AppForm>
              <form.SubmitButton
                disabled={completeProduction.isPending || invoiceTotal <= 0}
              >
                {t('createInvoiceAndShip')}
              </form.SubmitButton>
            </form.AppForm>
          </FormActions>
        </FormRoot>
      </DialogContent>
    </Dialog>
  )
}