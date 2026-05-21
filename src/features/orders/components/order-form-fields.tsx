import { Plus, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'
import { FormGrid, FormSection, withForm } from '#/components/app/form'
import { formatNumber } from '#/components/app/form/form-utils'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import type { CustomerRow } from '#/features/customers/model'
import { useProductPrice } from '#/features/products/hooks'
import type { ProductRow } from '#/features/products/model'
import { CreateCustomerDialog } from './create-customer-dialog'
import { ProductSelectDialog } from './product-select-dialog'

export type OrderFormValues = {
  customerId: string
  notes: string
  lineItems: Array<{
    id: string
    productId: string
    quantity: string
    unitPrice: string
    name: string
    notes: string
    attachments: string[]
  }>
}

export const defaultOrderValues = (): OrderFormValues => ({
  customerId: '',
  notes: '',
  lineItems: [],
})

export const OrderFormFields = withForm({
  defaultValues: defaultOrderValues(),
  props: {} as {
    customers: CustomerRow[]
    products: ProductRow[]
    orgId: string
  },
  render: function Render({ form, customers, products, orgId: _orgId }) {
    const t = useTranslations('orders')

    function handleAddProduct(product: ProductRow, unitPrice: string) {
      form.setFieldValue('lineItems', [
        ...form.state.values.lineItems,
        {
          id: crypto.randomUUID(),
          productId: product.id,
          quantity: String(product.minQuantity),
          unitPrice,
          name: product.name,
          notes: '',
          attachments: [],
        },
      ])
    }

    function handleCustomerSelect(customerId: string) {
      form.setFieldValue('customerId', customerId)
    }

    return (
      <form.Subscribe
        selector={(state) => ({
          lineItems: state.values.lineItems,
          selectedCustomerId: state.values.customerId,
        })}
      >
        {({ lineItems, selectedCustomerId }) => {
          const customerOptions: Array<{ value: string; label: string }> = []
          for (const customer of customers) {
            if (customer.active || customer.id === selectedCustomerId) {
              customerOptions.push({
                value: customer.id,
                label: customer.name,
                ...customer,
              })
            }
          }

          const total = lineItems.reduce((sum, item) => {
            const qty = parseInt(item.quantity, 10) || 0
            const price = parseFloat(item.unitPrice) || 0
            return sum + qty * price
          }, 0)

          return (
            <>
              <FormSection title={t('summary')}>
                <FormGrid columns={1}>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <form.AppField name="customerId">
                        {(field) => (
                          <field.ComboboxField
                            label={t('customer')}
                            placeholder={t('customer')}
                            options={customerOptions}
                            itemRender={(option) => {
                              const customer = option as unknown as CustomerRow
                              return (
                                <div className="flex flex-row items-center gap-2">
                                  <AssetImage
                                    assetId={customer.photoAssetId}
                                    assetKind="image"
                                    className="rounded-full"
                                  />
                                  <div className="flex flex-col">
                                    <span>{customer.name}</span>
                                    <span className="text-muted-foreground">
                                      {customer.phone}
                                    </span>
                                  </div>
                                </div>
                              )
                            }}
                          />
                        )}
                      </form.AppField>
                    </div>
                    <CreateCustomerDialog
                      onSelect={handleCustomerSelect}
                      trigger={
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0"
                        >
                          <UserPlus className="size-4" />
                        </Button>
                      }
                    />
                  </div>
                  <form.AppField name="notes">
                    {(field) => <field.TextareaField label={t('notes')} />}
                  </form.AppField>
                </FormGrid>
              </FormSection>

              <FormSection
                title={t('lineItems')}
                action={
                  <ProductSelectDialog
                    products={products}
                    onSelect={handleAddProduct}
                    trigger={
                      <Button type="button" variant="outline" size="sm">
                        <Plus className="mr-1 size-4" />
                        {t('addItem')}
                      </Button>
                    }
                  />
                }
              >
                <form.AppField name="lineItems" mode="array">
                  {() => (
                    <>
                      {lineItems.map((item, i) => (
                        <LineItemRow
                          key={item.id}
                          form={form}
                          index={i}
                          item={item}
                          products={products}
                        />
                      ))}

                      {lineItems.length > 0 && (
                        <div className="flex justify-end border-t pt-4">
                          <div className="text-right">
                            <span className="text-sm text-muted-foreground">
                              {t('orderTotal')}
                            </span>
                            <p className="text-xl font-semibold">
                              Rp {formatNumber(total)}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </form.AppField>
              </FormSection>
            </>
          )
        }}
      </form.Subscribe>
    )
  },
})

type FormType = Parameters<typeof OrderFormFields>[0]['form']

function LineItemRow({
  form,
  index,
  item,
  products,
}: {
  form: FormType
  index: number
  item: OrderFormValues['lineItems'][number]
  products: ProductRow[]
}) {
  const t = useTranslations('orders')

  const product = useMemo(
    () => products.find((p) => p.id === item.productId),
    [products, item.productId],
  )

  const [committedQty, setCommittedQty] = useState(
    () => parseInt(item.quantity, 10) || 0,
  )

  const { isFetching, data: priceResult } = useProductPrice(
    item.productId,
    committedQty,
    product?.pricingMode,
  )

  useEffect(() => {
    if (!priceResult?.ok) return
    const newPrice = String(priceResult.unitPrice)
    if (newPrice !== item.unitPrice) {
      form.setFieldValue(`lineItems[${index}].unitPrice`, newPrice)
    }
  }, [priceResult, form, index, item.unitPrice])

  const displayPrice = item.unitPrice
    ? `Rp ${formatNumber(item.unitPrice)}`
    : 'Rp 0'
  const qtyNum = parseInt(item.quantity, 10) || 0
  const priceNum = parseFloat(item.unitPrice) || 0
  const subtotal = qtyNum * priceNum

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex gap-3">
        <FormGrid columns={3}>
          <form.AppField name={`lineItems[${index}].name`}>
            {(field) => (
              <field.TextField
                label={t('lineItemName')}
                placeholder={product?.name ?? ''}
              />
            )}
          </form.AppField>
          <form.AppField
            name={`lineItems[${index}].quantity`}
            validators={{
              onChange: ({ value }) => {
                const p = products.find((pr) => pr.id === item.productId)
                if (p?.maxQuantity != null && Number(value) > p.maxQuantity) {
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
                  const qty = rawValue ? Number(rawValue) : 0
                  setCommittedQty(qty)
                }}
              />
            )}
          </form.AppField>
          <div className="flex flex-col flex-1 mt-1">
            <span className="text-sm font-medium">{t('unitPrice')}</span>
            {isFetching ? (
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
}
