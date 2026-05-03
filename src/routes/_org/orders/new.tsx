import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Plus, Trash2 } from 'lucide-react'
import { useTranslations } from 'use-intl'
import {
  FormGrid,
  FormRoot,
  FormSection,
  useAppForm,
} from '#/components/app/form'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { Button } from '#/components/ui/button'
import { useCustomersList } from '#/features/customers/hooks'
import { useCreateDraftOrder } from '#/features/orders/hooks'
import { useProductsList } from '#/features/products/hooks'

export const Route = createFileRoute('/_org/orders/new')({
  beforeLoad: () => ({
    breadcrumb: 'createOrder',
    pageTitle: 'createOrder',
  }),
  component: CreateOrder,
})

function CreateOrder() {
  const ctx = Route.useRouteContext() as { org: { id: string } }
  const { data: customersData } = useCustomersList({ orgId: ctx.org.id })
  const { data: productsData } = useProductsList({ orgId: ctx.org.id })
  const customers = customersData?.rows ?? []
  const products = productsData?.rows ?? []
  const navigate = useNavigate()
  const t = useTranslations('orders')
  const pt = useTranslations('products')

  const createOrder = useCreateDraftOrder()

  const form = useAppForm({
    defaultValues: {
      customerId: '',
      notes: '',
      lineItems: [{ productId: '', quantity: '1' }],
    },
    onSubmit: async ({ value }) => {
      const validItems = value.lineItems.filter(
        (i) => i.productId && i.quantity,
      )
      if (validItems.length === 0 || !value.customerId) return

      await createOrder.mutateAsync({
        orgId: ctx.org.id,
        customerId: value.customerId,
        notes: value.notes || undefined,
        lineItems: validItems.map((i) => ({
          productId: i.productId,
          quantity: parseInt(i.quantity, 10) || 1,
        })),
      })
      navigate({ to: '/orders' })
    },
  })

  return (
    <PageContent>
      <PageHeader
        title={t('createOrder')}
        primaryAction={{
          label: t('save'),
          onClick: () => form.handleSubmit(),
        }}
      />
      <FormRoot form={form}>
        <FormSection title={t('createOrder')}>
          <FormGrid>
            <form.AppField name="customerId">
              {(field) => (
                <field.SelectField
                  label={t('customer')}
                  placeholder={t('customer')}
                  options={customers.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                />
              )}
            </form.AppField>
            <form.AppField name="notes">
              {(field) => <field.TextareaField label={t('notes')} />}
            </form.AppField>
          </FormGrid>

          <form.AppField name="lineItems" mode="array">
            {(lineItemsField) => (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">{t('lineItems')}</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      lineItemsField.pushValue({
                        productId: '',
                        quantity: '1',
                      })
                    }
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t('addLineItem')}
                  </Button>
                </div>
                {lineItemsField.state.value.map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: index is stable key for TanStack Form array
                  <div key={i} className="flex items-end gap-3">
                    <div className="flex-1">
                      <form.AppField name={`lineItems[${i}].productId`}>
                        {(field) => (
                          <field.SelectField
                            label={pt('title')}
                            placeholder={t('customer')}
                            options={products.map((p) => ({
                              value: p.id,
                              label: p.name,
                            }))}
                          />
                        )}
                      </form.AppField>
                    </div>
                    <div className="w-24">
                      <form.AppField name={`lineItems[${i}].quantity`}>
                        {(field) => <field.NumberField label={t('quantity')} />}
                      </form.AppField>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => lineItemsField.removeValue(i)}
                      disabled={lineItemsField.state.value.length <= 1}
                      className="mb-0.5"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </form.AppField>
        </FormSection>
      </FormRoot>
    </PageContent>
  )
}
