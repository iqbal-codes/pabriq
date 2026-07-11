import { useEffect, useMemo, useRef } from 'react'
import { useTranslations } from 'use-intl'
import { FormGrid, withForm } from '#/components/app/form'
import { formatNumber } from '#/components/app/form/form-utils'
import { Skeleton } from '#/components/ui/skeleton'
import { Switch } from '#/components/ui/switch'
import {
  useCalculateProductPrice,
  useProductAddons,
} from '#/features/products/hooks'
import type { ProductRow } from '#/features/products/model'
import type { OrderFormValues } from './order-form-types'
import { defaultOrderValues } from './order-form-types'

const PRICE_RECALCULATION_DEBOUNCE_MS = 300

export const OrderLineItemRow = withForm({
  defaultValues: defaultOrderValues(),
  props: {} as {
    index: number
    item: OrderFormValues['lineItems'][number]
    products: ProductRow[]
  },
  render: function Render({ form, index, item, products }) {
    const t = useTranslations('orders')
    const { isPending: isCalculatingPrice, mutateAsync: calculatePrice } =
      useCalculateProductPrice()
    const isFirstRender = useRef(true)
    const initialPriceExists = useRef(
      !!(item.unitPrice && parseFloat(String(item.unitPrice)) > 0),
    )

    const product = useMemo(
      () => products.find((p) => p.id === item.productId),
      [products, item.productId],
    )

    const { data: addons = [] } = useProductAddons(item.productId)

    const addonOptions = useMemo(
      () =>
        addons.map((a) => ({
          value: a.id,
          label: `${a.name} (+ Rp ${formatNumber(a.unitSurcharge)}/pcs)`,
        })),
      [addons],
    )

    const isNegotiated =
      !item.isRepeatOrder &&
      product?.negotiateAboveQuantity != null &&
      parseInt(String(item.quantity), 10) > product.negotiateAboveQuantity

    const exceedsProductionCap =
      product?.maxProductionQuantity != null &&
      parseInt(String(item.quantity), 10) > product.maxProductionQuantity

    const displayPrice = item.unitPrice
      ? `Rp ${formatNumber(String(item.unitPrice))}`
      : 'Rp 0'
    const qtyNum = parseInt(String(item.quantity), 10) || 0
    const priceNum = parseFloat(String(item.unitPrice)) || 0
    const subtotal = qtyNum * priceNum
    const addonIdsKey = item.addonIds.join(',')
    const selectedAddonIds = useMemo(
      () => (addonIdsKey ? addonIdsKey.split(',') : undefined),
      [addonIdsKey],
    )

    useEffect(() => {
      if (isFirstRender.current) {
        isFirstRender.current = false
        if (initialPriceExists.current) {
          return
        }
      }

      let isCurrent = true

      const timer = window.setTimeout(() => {
        async function updatePrice(): Promise<void> {
          if (!item.productId || qtyNum <= 0) return

          const result = await calculatePrice({
            productId: item.productId,
            quantity: qtyNum,
            pricingMode: product?.pricingMode,
            isRepeatOrder: item.isRepeatOrder,
            addonIds: selectedAddonIds,
          })

          if (isCurrent && result.ok) {
            form.setFieldValue(
              `lineItems[${index}].unitPrice`,
              String(result.unitPrice),
            )
          }
        }

        updatePrice()
      }, PRICE_RECALCULATION_DEBOUNCE_MS)

      return () => {
        isCurrent = false
        window.clearTimeout(timer)
      }
    }, [
      calculatePrice,
      form,
      index,
      item.isRepeatOrder,
      item.productId,
      product?.pricingMode,
      qtyNum,
      selectedAddonIds,
    ])

    return (
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('productName')}:
          </span>
          <span className="text-sm font-medium text-foreground">
            {product?.name ?? item.productId}
          </span>
        </div>
        <div className="flex gap-3">
          <FormGrid columns={3}>
            <form.AppField name={`lineItems[${index}].designName`}>
              {(field) => (
                <field.TextField
                  label={t('designName')}
                  placeholder={t('designNamePlaceholder')}
                  optional
                />
              )}
            </form.AppField>
            <form.AppField
              name={`lineItems[${index}].quantity`}
              validators={{
                onChange: ({ value }) => {
                  const p = products.find((pr) => pr.id === item.productId)
                  const minQty = item.isRepeatOrder
                    ? (p?.repeatOrderMinQuantity ?? p?.minQuantity)
                    : p?.minQuantity
                  if (minQty && Number(value) < minQty) {
                    return t('minQtyError', { min: minQty })
                  }
                  if (p?.maxQuantity && Number(value) > p.maxQuantity) {
                    return t('maxQtyError', { max: p.maxQuantity })
                  }
                  return undefined
                },
              }}
            >
              {(field) => (
                <field.NumberField
                  label={t('quantity')}
                  onBlurValue={({ rawValue }) => {
                    const quantity = rawValue ? Number(rawValue) : 0
                    if (item.productId && quantity > 0) {
                      // Handle manual deadline
                      const p = products.find((pr) => pr.id === item.productId)
                      if (
                        p?.maxProductionQuantity != null &&
                        quantity > p.maxProductionQuantity
                      ) {
                        form.setFieldValue(
                          `lineItems[${index}].manualDeadline`,
                          true,
                        )
                      } else if (
                        item.manualDeadline &&
                        p?.maxProductionQuantity != null &&
                        quantity <= p.maxProductionQuantity
                      ) {
                        form.setFieldValue(
                          `lineItems[${index}].manualDeadline`,
                          false,
                        )
                        form.setFieldValue(`lineItems[${index}].deadline`, '')
                      }
                    }
                  }}
                />
              )}
            </form.AppField>
            {isNegotiated ? (
              <form.AppField name={`lineItems[${index}].unitPrice`}>
                {(field) => (
                  <field.NumberField label={t('hargaNego')} optional />
                )}
              </form.AppField>
            ) : (
              <div className="flex flex-col flex-1">
                <span className="text-sm font-medium shrink h-4.25">
                  {t('unitPrice')}
                </span>
                {isCalculatingPrice ? (
                  <Skeleton className="mt-2 h-8 w-full" />
                ) : (
                  <p className="mt-2 rounded-md border bg-muted px-2 py-1.25 text-sm h-8">
                    {displayPrice}
                  </p>
                )}
              </div>
            )}
          </FormGrid>
        </div>

        {/* Repeat Order Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <span className="text-sm font-medium">{t('repeatOrder')}</span>
          </div>
          <Switch
            checked={item.isRepeatOrder}
            onCheckedChange={(checked) => {
              form.setFieldValue(`lineItems[${index}].isRepeatOrder`, checked)
            }}
          />
        </div>

        {/* Addon Selection */}
        {addonOptions.length > 0 && (
          <form.AppField name={`lineItems[${index}].addonIds`}>
            {(field) => (
              <field.CheckboxGroupField
                label={t('addons')}
                options={addonOptions}
                optional
              />
            )}
          </form.AppField>
        )}

        {/* Manual Deadline */}
        {exceedsProductionCap && (
          <div className="space-y-1">
            <form.AppField name={`lineItems[${index}].deadline`}>
              {(field) => <field.DateField label={t('manualDeadline')} />}
            </form.AppField>
            <p className="text-xs text-muted-foreground">
              {t('quantityExceedsProductionCap')}
            </p>
          </div>
        )}

        <form.AppField name={`lineItems[${index}].notes`}>
          {(field) => (
            <field.TextareaField label={t('specification')} optional />
          )}
        </form.AppField>
        <form.AppField name={`lineItems[${index}].attachments`}>
          {(field) => (
            <field.FileUploadField
              label={t('attachments')}
              ownerId={item.id}
              optional
            />
          )}
        </form.AppField>

        <div className="text-right text-sm text-muted-foreground">
          {t('lineSubtotal')}: Rp {formatNumber(subtotal)}
        </div>
      </div>
    )
  },
})
