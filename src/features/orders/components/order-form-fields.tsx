import { Plus, UserPlus } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'
import { FormGrid, FormSection, withForm } from '#/components/app/form'
import { formatNumber } from '#/components/app/form/form-utils'
import { Button } from '#/components/ui/button'
import type { CustomerRow } from '#/features/customers/model'
import type { ProductRow } from '#/features/products/model'
import { CreateCustomerDialog } from './create-customer-dialog'
import { defaultOrderValues } from './order-form-types'
import { OrderLineItemRow } from './order-line-item-row'
import { ProductSelectDialog } from './product-select-dialog'

export const OrderFormFields = withForm({
  defaultValues: defaultOrderValues(),
  props: {} as {
    customers: CustomerRow[]
    products: ProductRow[]
  },
  render: function Render({ form, customers, products }) {
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
                label: customer.phone
                  ? `${customer.name} (${customer.phone})`
                  : customer.name,
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
                        <OrderLineItemRow
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
