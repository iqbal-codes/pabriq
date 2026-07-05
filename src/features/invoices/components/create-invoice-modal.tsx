import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import {
  FormActions,
  FormGrid,
  FormRoot,
  useAppForm,
} from '#/components/app/form'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { useCalculateShippingRates } from '#/features/address/hooks'
import type { ShippingAddress, ShippingRate } from '#/features/address/model'
import { useCreateInvoice, usePaymentMethods } from '#/features/invoices/hooks'
import { useOrgSettings } from '#/features/settings/hooks'
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

function rateKey(rate: ShippingRate): string {
  return `${rate.courierCode}-${rate.serviceCode}`
}

function rateLabel(rate: ShippingRate): string {
  const price = currencyFormatter.format(rate.price)
  const etd = rate.estimatedDays ? ` - ETD: ${rate.estimatedDays}` : ''
  return `${rate.courierName} - ${rate.serviceName} (${price})${etd}`
}

export function CreateInvoiceModal({ open, onOpenChange, order }: Props) {
  const t = useTranslations('invoices')
  const pt = useTranslations('production')
  const at = useTranslations('address')
  const createInvoice = useCreateInvoice()
  const { data: paymentMethods } = usePaymentMethods()
  const { data: orgSettings } = useOrgSettings()
  const calculateRates = useCalculateShippingRates()

  const hasPaidInvoices = order.invoicedPercentage > 0

  const [customAmount, setCustomAmount] = useState(order.total)
  const [rates, setRates] = useState<ShippingRate[]>([])

  const originAreaId = orgSettings?.address?.areaId ?? null
  const destinationAreaId = order.shippingAddress?.areaId ?? null
  const canCalculateBiteship = Boolean(originAreaId && destinationAreaId)

  const effectivePct = hasPaidInvoices
    ? order.remainingPercentage
    : order.total > 0
      ? Math.round((customAmount / order.total) * 10_000) / 100
      : 0

  const paymentMethodOptions = (paymentMethods ?? []).map((pm) => ({
    value: pm.id,
    label: pm.name,
  }))

  const form = useAppForm({
    defaultValues: {
      paymentMethodId: '',
      notes: '',
      shipmentMethod: 'manual' as 'biteship' | 'manual' | 'pickup',
      packageWeightKg: 1,
      selectedRateKey: '',
      manualShippingFee: 0,
      manualShippingDescription: 'Shipping Fee',
    },
    onSubmit: async ({ value }) => {
      let shippingFee: number | undefined
      let shippingFeeDescription: string | undefined
      let courier: string | undefined

      if (hasPaidInvoices) {
        const method = value.shipmentMethod as 'biteship' | 'manual' | 'pickup'

        if (method === 'biteship') {
          const selectedRate = rates.find(
            (r) => rateKey(r) === value.selectedRateKey,
          )
          if (!selectedRate) {
            toast.error(t('selectShipmentRateRequired'))
            return
          }
          shippingFee = selectedRate.price
          shippingFeeDescription = `${selectedRate.courierName} ${selectedRate.serviceName}`
          courier = selectedRate.courierName
        } else if (method === 'manual') {
          if (value.manualShippingFee > 0) {
            shippingFee = value.manualShippingFee
            shippingFeeDescription =
              value.manualShippingDescription || 'Shipping Fee'
          }
        }
        // pickup: no shipping fields
      }

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
        shippingFee,
        shippingFeeDescription,
        courier,
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
    shipmentMethod: string,
    selectedRateKey: string,
    manualShippingFee: number,
  ): number {
    if (!hasPaidInvoices) return 0
    if (shipmentMethod === 'pickup') return 0
    if (shipmentMethod === 'biteship') {
      const rate = rates.find((r) => rateKey(r) === selectedRateKey)
      return rate?.price ?? 0
    }
    if (shipmentMethod === 'manual') return manualShippingFee
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
              shipmentMethod: state.values.shipmentMethod,
              selectedRateKey: state.values.selectedRateKey,
              manualShippingFee: state.values.manualShippingFee,
            })}
          >
            {({ shipmentMethod, selectedRateKey, manualShippingFee }) => {
              const shippingFee = computeDisplayShippingFee(
                shipmentMethod,
                selectedRateKey,
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
                        <p className="text-lg font-bold">
                          {currencyFormatter.format(invoiceTotal)}
                        </p>
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
                        <form.AppField name="shipmentMethod">
                          {(field) => (
                            <field.RadioCardField
                              label={t('shipmentMethod')}
                              cols={3}
                              options={[
                                {
                                  value: 'biteship',
                                  label: t('shipmentMethodBiteship'),
                                },
                                {
                                  value: 'manual',
                                  label: t('shipmentMethodManual'),
                                },
                                {
                                  value: 'pickup',
                                  label: t('shipmentMethodPickup'),
                                },
                              ]}
                            />
                          )}
                        </form.AppField>

                        {/* Biteship method UI */}
                        {shipmentMethod === 'biteship' && (
                          <>
                            {!originAreaId && (
                              <p className="text-sm text-destructive">
                                {at('orgAddressRequired')}
                              </p>
                            )}
                            {!destinationAreaId && (
                              <p className="text-sm text-destructive">
                                {at('areaNotSupported')}
                              </p>
                            )}
                            {canCalculateBiteship && (
                              <>
                                <form.AppField name="packageWeightKg">
                                  {(field) => (
                                    <field.NumberField
                                      label={t('packageWeightKg')}
                                    />
                                  )}
                                </form.AppField>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={async () => {
                                    if (!originAreaId || !destinationAreaId)
                                      return

                                    const weightKg =
                                      form.getFieldValue('packageWeightKg')
                                    const result =
                                      await calculateRates.mutateAsync({
                                        originAreaId,
                                        destinationAreaId,
                                        weightGrams: Math.round(
                                          (weightKg || 1) * 1000,
                                        ),
                                        orderValue: order.remainingAmount,
                                      })
                                    if (result.ok) {
                                      setRates(result.rates)
                                    } else {
                                      const knownErrorKeys: Record<
                                        string,
                                        true
                                      > = {
                                        biteshipApiKeyMissing: true,
                                        biteshipRateCalculationFailed: true,
                                      }
                                      const message = knownErrorKeys[
                                        result.error
                                      ]
                                        ? t(
                                            result.error as 'biteshipRateCalculationFailed',
                                          )
                                        : result.error
                                      toast.error(message)
                                    }
                                  }}
                                  disabled={
                                    calculateRates.isPending ||
                                    !canCalculateBiteship
                                  }
                                >
                                  {calculateRates.isPending
                                    ? '...'
                                    : t('calculateShipmentFee')}
                                </Button>
                              </>
                            )}
                            {calculateRates.isPending && rates.length === 0 && (
                              <p className="text-sm text-muted-foreground">
                                Loading rates...
                              </p>
                            )}
                            {!calculateRates.isPending &&
                              rates.length === 0 &&
                              canCalculateBiteship && (
                                <p className="text-sm text-muted-foreground">
                                  {t('noShipmentRatesFound')}
                                </p>
                              )}
                            {rates.length > 0 && (
                              <form.AppField name="selectedRateKey">
                                {(field) => (
                                  <field.SelectField
                                    label={t('shipmentRate')}
                                    options={rates.map((r) => ({
                                      value: rateKey(r),
                                      label: rateLabel(r),
                                    }))}
                                    placeholder={t('shipmentRate')}
                                  />
                                )}
                              </form.AppField>
                            )}
                          </>
                        )}

                        {/* Manual method UI */}
                        {shipmentMethod === 'manual' && (
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

                        {/* Pickup method UI */}
                        {shipmentMethod === 'pickup' && (
                          <p className="text-sm text-muted-foreground">
                            {t('customerPickupNoShipping')}
                          </p>
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
