import type { ReactNode } from 'react'
import { Truck } from 'lucide-react'
import { FormGrid, FormSection } from '#/components/app/form'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import type { ShippingAddress } from '#/features/address/model'

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
})

/**
 * Minimal structural type for the form instance used by ShipmentDetailsSection.
 * Defined here to avoid coupling to tanstack/react-form internals.
 */
export interface CompleteProductionForm {
  AppField: React.ComponentType<{
    name: string & Record<never, never>
    children: (field: {
      TextField: React.ComponentType<{
        label: string
        placeholder?: string
      }>
    }) => ReactNode
  }>
  setFieldValue: (name: string, value: string) => void
}

type ShipmentDetailsSectionProps = {
  form: CompleteProductionForm
  order: { shippingAddress: ShippingAddress | null }
  labels: {
    title: string
    address: string
    courier: string
    courierPlaceholder: string
    trackingNumber: string
    trackingNumberPlaceholder: string
    shippingFee: string
    optional: string
    shippingFeeDescription: string
    shippingFeeDescriptionPlaceholder: string
  }
  shippingFeeRaw: string
  setShippingFeeRaw: (value: string) => void
  showShippingDescription: boolean
  setShowShippingDescription: (value: boolean) => void
}

export function ShipmentDetailsSection({
  form,
  order,
  labels,
  shippingFeeRaw,
  setShippingFeeRaw,
  showShippingDescription,
  setShowShippingDescription,
}: ShipmentDetailsSectionProps) {
  return (
    <FormSection title={labels.title}>
      <FormGrid columns={1}>
        {order.shippingAddress && (
          <div className="rounded-lg border p-3 text-sm">
            <p className="font-medium mb-1">{labels.address}</p>
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
            <field.TextField
              label={labels.courier}
              placeholder={labels.courierPlaceholder}
            />
          )}
        </form.AppField>

        <form.AppField name="trackingNumber">
          {(field) => (
            <field.TextField
              label={labels.trackingNumber}
              placeholder={labels.trackingNumberPlaceholder}
            />
          )}
        </form.AppField>

        <div>
          <Label htmlFor="shippingFee" className="text-sm font-medium">
            {labels.shippingFee}{' '}
            <span className="text-muted-foreground font-normal">
              {labels.optional}
            </span>
          </Label>
          <Input
            id="shippingFee"
            type="number"
            value={shippingFeeRaw}
            onChange={(e) => {
              setShippingFeeRaw(e.target.value)
              form.setFieldValue('shippingFee', e.target.value)
              setShowShippingDescription(Number.parseFloat(e.target.value) > 0)
            }}
            placeholder="0"
            min={0}
            className="mt-1"
          />
        </div>

        {showShippingDescription && (
          <form.AppField name="shippingFeeDescription">
            {(field) => (
              <field.TextField
                label={labels.shippingFeeDescription}
                placeholder={labels.shippingFeeDescriptionPlaceholder}
              />
            )}
          </form.AppField>
        )}
      </FormGrid>
    </FormSection>
  )
}

type FinalInvoicePreviewProps = {
  order: { total: number; invoicedAmount: number; remainingAmount: number }
  shippingAmount: number
  invoiceTotal: number
  labels: {
    title: string
    orderTotal: string
    alreadyPaid: string
    remainingPayment: string
    shippingFee: string
    total: string
  }
}

export function FinalInvoicePreview({
  order,
  shippingAmount,
  invoiceTotal,
  labels,
}: FinalInvoicePreviewProps) {
  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 space-y-3">
      <p className="text-sm font-medium text-orange-800 flex items-center gap-2">
        <Truck className="size-4" />
        {labels.title}
      </p>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{labels.orderTotal}</span>
          <span className="font-medium">
            {currencyFormatter.format(order.total)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{labels.alreadyPaid}</span>
          <span className="font-medium text-green-600">
            {currencyFormatter.format(order.invoicedAmount)}
          </span>
        </div>
        <div className="flex justify-between border-t pt-2">
          <span className="text-muted-foreground">
            {labels.remainingPayment}
          </span>
          <span className="font-medium text-orange-600">
            {currencyFormatter.format(order.remainingAmount)}
          </span>
        </div>
        {shippingAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{labels.shippingFee}</span>
            <span className="font-medium">
              +{currencyFormatter.format(shippingAmount)}
            </span>
          </div>
        )}
        <div className="flex justify-between border-t pt-2 mt-2">
          <span className="font-semibold">{labels.total}</span>
          <span className="font-bold text-orange-600 text-lg">
            {currencyFormatter.format(invoiceTotal)}
          </span>
        </div>
      </div>
    </div>
  )
}
