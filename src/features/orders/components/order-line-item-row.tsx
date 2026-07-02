import { useMemo } from 'react'
import { useTranslations } from 'use-intl'
import { FormGrid, withForm } from '#/components/app/form'
import { formatNumber } from '#/components/app/form/form-utils'
import { Skeleton } from '#/components/ui/skeleton'
import { useCalculateProductPrice } from '#/features/products/hooks'
import type { ProductRow } from '#/features/products/model'
import type { OrderFormValues } from './order-form-types'
import { defaultOrderValues } from './order-form-types'

export const OrderLineItemRow = withForm({
  defaultValues: defaultOrderValues(),
  props: {} as {
    index: number
    item: OrderFormValues['lineItems'][number]
    products: ProductRow[]
  },
  render: function Render({ form, index, item, products }) {
    const t = useTranslations('orders')
    const calculateProductPrice = useCalculateProductPrice()

    const product = useMemo(
      () => products.find((p) => p.id === item.productId),
      [products, item.productId],
    )

    const displayPrice = item.unitPrice
      ? `Rp ${formatNumber(item.unitPrice)}`
      : 'Rp 0'
    const qtyNum = parseInt(item.quantity, 10) || 0
    const priceNum = parseFloat(item.unitPrice) || 0
    const subtotal = qtyNum * priceNum

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
                />
              )}
            </form.AppField>
            <form.AppField
              name={`lineItems[${index}].quantity`}
              validators={{
                onChange: ({ value }) => {
                  const p = products.find((pr) => pr.id === item.productId)
                  if (p?.minQuantity && Number(value) < p.minQuantity) {
                    return t('minQtyError', { min: p.minQuantity })
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
                  onBlurValue={async ({ rawValue }) => {
                    const quantity = rawValue ? Number(rawValue) : 0
                    if (item.productId && quantity > 0) {
                      const result = await calculateProductPrice.mutateAsync({
                        productId: item.productId,
                        quantity,
                        pricingMode: product?.pricingMode,
                      })
                      if (
                        result.ok &&
                        String(result.unitPrice) !== item.unitPrice
                      ) {
                        form.setFieldValue(
                          `lineItems[${index}].unitPrice`,
                          String(result.unitPrice),
                        )
                      }
                    }
                  }}
                />
              )}
            </form.AppField>
            <div className="flex flex-col flex-1 mt-1">
              <span className="text-sm font-medium">{t('unitPrice')}</span>
              {calculateProductPrice.isPending ? (
                <Skeleton className="mt-1 h-9 w-full" />
              ) : (
                <p className="mt-1 rounded-md border bg-muted px-3 py-2 text-sm h-9">
                  {displayPrice}
                </p>
              )}
            </div>
          </FormGrid>
        </div>
        <form.AppField name={`lineItems[${index}].notes`}>
          {(field) => <field.TextareaField label={t('specification')} />}
        </form.AppField>
        <form.AppField name={`lineItems[${index}].attachments`}>
          {(field) => <field.FileUploadField label={t('attachments')} />}
        </form.AppField>

        <div className="text-right text-sm text-muted-foreground">
          {t('lineSubtotal')}: Rp {formatNumber(subtotal)}
        </div>
      </div>
    )
  },
})
