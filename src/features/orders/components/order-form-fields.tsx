import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'
import {
  createR2UploaderAdapter,
  getAcceptedMimeTypes,
  getMaxBytes,
  PhotoGridUpload,
} from '#/components/app/asset-upload'
import { FormGrid, FormSection, withForm } from '#/components/app/form'
import { Button } from '#/components/ui/button'
import type { UploadItem } from '#/features/assets/upload-machine'
import { getAssetsForLineItemFn } from '#/features/orders/server'

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
  }>
}

export const defaultOrderValues = (): OrderFormValues => ({
  customerId: '',
  notes: '',
  lineItems: [
    {
      id: crypto.randomUUID(),
      productId: '',
      quantity: '1',
      unitPrice: '',
      name: '',
      notes: '',
    },
  ],
})

export const OrderFormFields = withForm({
  defaultValues: defaultOrderValues(),
  props: {} as {
    customers: Array<{ id: string; name: string; active: boolean }>
    products: Array<{ id: string; name: string; active: boolean }>
    orgId: string
  },
  render: function Render({ form, customers, products, orgId }) {
    const t = useTranslations('orders')

    return (
      <form.Subscribe
        selector={(state) => ({
          lineItems: state.values.lineItems,
          selectedCustomerId: state.values.customerId,
        })}
      >
        {({ lineItems, selectedCustomerId }) => {
          const customerOptions = customers
            .filter(
              (customer) =>
                customer.active || customer.id === selectedCustomerId,
            )
            .map((customer) => ({ value: customer.id, label: customer.name }))

          return (
            <>
              <FormSection title={t('summary')}>
                <FormGrid>
                  <form.AppField name="customerId">
                    {(field) => (
                      <field.SelectField
                        label={t('customer')}
                        placeholder={t('customer')}
                        options={customerOptions}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="notes">
                    {(field) => <field.TextareaField label={t('notes')} />}
                  </form.AppField>
                </FormGrid>
              </FormSection>

              <FormSection title={t('lineItems')}>
                <form.AppField name="lineItems" mode="array">
                  {(lineItemsField) => (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">
                          {t('lineItems')}
                        </h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            lineItemsField.pushValue({
                              id: crypto.randomUUID(),
                              productId: '',
                              quantity: '1',
                              unitPrice: '',
                              name: '',
                              notes: '',
                            })
                          }
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          {t('addLineItem')}
                        </Button>
                      </div>

                      {lineItems.map((item, i) => (
                        <LineItemRow
                          key={item.id}
                          form={form}
                          index={i}
                          item={item}
                          products={products}
                          orgId={orgId}
                        />
                      ))}
                    </div>
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
  orgId,
}: {
  form: FormType
  index: number
  item: OrderFormValues['lineItems'][number]
  products: Array<{ id: string; name: string; active: boolean }>
  orgId: string
}) {
  const t = useTranslations('orders')
  const pt = useTranslations('products')
  const queryClient = useQueryClient()
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([])

  const productOptions = useMemo(
    () =>
      products
        .filter((p) => p.active || p.id === item.productId)
        .map((p) => ({ value: p.id, label: p.name })),
    [products, item.productId],
  )

  const adapter = useMemo(
    () =>
      createR2UploaderAdapter({
        ownerType: 'order',
        ownerId: item.id,
        usage: 'attachment',
      }),
    [item.id],
  )

  const { data: assets } = useQuery({
    queryKey: ['order-attachments', item.id],
    queryFn: () =>
      getAssetsForLineItemFn({ data: { lineItemId: item.id, orgId } }),
  })

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <form.AppField name={`lineItems[${index}].productId`}>
            {(field) => (
              <field.SelectField
                label={pt('title')}
                placeholder={pt('title')}
                options={productOptions}
              />
            )}
          </form.AppField>
        </div>
        <div className="w-24">
          <form.AppField name={`lineItems[${index}].quantity`}>
            {(field) => <field.NumberField label={t('quantity')} />}
          </form.AppField>
        </div>
        <div className="w-28">
          <form.AppField name={`lineItems[${index}].unitPrice`}>
            {(field) => <field.NumberField label={t('unitPrice')} />}
          </form.AppField>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() =>
            form.setFieldValue(
              'lineItems',
              form.state.values.lineItems.filter((_, idx) => idx !== index),
            )
          }
          disabled={form.state.values.lineItems.length <= 1}
          className="mt-5"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <form.AppField name={`lineItems[${index}].name`}>
          {(field) => <field.TextField label={t('lineItemName')} />}
        </form.AppField>
        <form.AppField name={`lineItems[${index}].notes`}>
          {(field) => <field.TextareaField label={t('lineItemNotes')} />}
        </form.AppField>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">{t('attachments')}</div>
        {assets?.map((asset) => (
          <div key={asset.id} className="flex items-center gap-2">
            <AssetImage
              assetId={asset.id}
              assetKind={asset.mimeType.startsWith('image/') ? 'image' : 'file'}
              className="size-12 rounded object-cover"
            />
            <span className="text-sm">{asset.originalFilename}</span>
          </div>
        ))}
        <PhotoGridUpload
          items={uploadItems}
          onItemsChange={setUploadItems}
          config={{ ownerType: 'order', ownerId: item.id, usage: 'attachment' }}
          adapter={adapter}
          acceptedMimeTypes={getAcceptedMimeTypes('attachment')}
          maxBytes={getMaxBytes('attachment')}
          onUploadComplete={() => {
            setUploadItems([])
            void queryClient.invalidateQueries({
              queryKey: ['order-attachments', item.id],
            })
          }}
        />
      </div>
    </div>
  )
}
