import { useStore } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { FormRoot, useAppForm } from '#/components/app/form'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { useCustomersList } from '#/features/customers/hooks'
import {
  defaultOrderValues,
  OrderFormFields,
} from '#/features/orders/components/order-form-fields'
import { useCreateDraftOrder } from '#/features/orders/hooks'
import { useProductsList } from '#/features/products/hooks'
import { Route } from '#/routes/_org/orders/new'

export function CreateOrderPage() {
  const navigate = useNavigate()
  const ctx = Route.useRouteContext() as { org: { id: string } }
  const t = useTranslations('orders')
  const ct = useTranslations('common')
  const createOrder = useCreateDraftOrder()
  const { data: customersData } = useCustomersList({ orgId: ctx.org.id })
  const { data: productsData } = useProductsList({ orgId: ctx.org.id })
  const customers = customersData?.rows ?? []
  const products = productsData?.rows ?? []

  const form = useAppForm({
    defaultValues: defaultOrderValues(),
    onSubmit: async ({ value }) => {
      const validItems = value.lineItems.filter((i) => i.productId)
      if (validItems.length === 0 || !value.customerId) return

      const result = await createOrder.mutateAsync({
        orgId: ctx.org.id,
        customerId: value.customerId,
        notes: value.notes || undefined,
        lineItems: validItems.map((i) => ({
          id: i.id,
          productId: i.productId,
          quantity: parseInt(i.quantity, 10) || 1,
          unitPrice: i.unitPrice ? Number.parseFloat(i.unitPrice) : undefined,
          name: i.name || undefined,
          notes: i.notes || undefined,
        })),
      })

      toast.success(t('orderCreated'))
      navigate({ to: '/orders/$id', params: { id: result.order.id } })
    },
  })

  const isSubmitting = useStore(form.store, (s) => s.isSubmitting)

  return (
    <PageContent>
      <PageHeader
        title={t('createOrder')}
        backAction={{ label: ct('back'), href: '/orders' }}
        primaryAction={{
          label: t('save'),
          isLoading: isSubmitting,
          onClick: () => form.handleSubmit(),
        }}
      />
      <FormRoot form={form}>
        <OrderFormFields
          form={form}
          customers={customers}
          products={products}
          orgId={ctx.org.id}
        />
      </FormRoot>
    </PageContent>
  )
}
