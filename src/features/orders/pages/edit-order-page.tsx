import { useStore } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { FormRoot, useAppForm } from '#/components/app/form'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { useCustomersList } from '#/features/customers/hooks'
import { OrderFormFields } from '#/features/orders/components/order-form-fields'
import { useOrder, useUpdateDraftOrder } from '#/features/orders/hooks'
import { useProductsList } from '#/features/products/hooks'
import { Route } from '#/routes/_org/orders/$id/edit'

export function EditOrderPage() {
  const { id } = Route.useParams()
  const ctx = Route.useRouteContext() as { org: { id: string } }
  const navigate = useNavigate()
  const t = useTranslations('orders')
  const ct = useTranslations('common')
  const { data } = useOrder({ id, orgId: ctx.org.id })
  const { data: customersData } = useCustomersList({ orgId: ctx.org.id })
  const { data: productsData } = useProductsList({ orgId: ctx.org.id })
  const updateOrder = useUpdateDraftOrder()
  const customers = customersData?.rows ?? []
  const products = productsData?.rows ?? []

  const form = useAppForm({
    defaultValues: {
      customerId: data?.order.customerId ?? '',
      notes: data?.order.notes ?? '',
      lineItems:
        data?.lineItems.map((li) => ({
          id: li.id,
          productId: li.productId,
          quantity: String(li.quantity),
          unitPrice: String(li.unitPrice),
          name: li.name ?? '',
          notes: li.notes ?? '',
          attachments: [] as string[],
        })) ?? [],
    },
    onSubmit: async ({ value }) => {
      const validItems = value.lineItems.filter((i) => i.productId)
      if (validItems.length === 0) return

      await updateOrder.mutateAsync({
        id,
        orgId: ctx.org.id,
        customerId: value.customerId || null,
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

      toast.success(t('orderUpdated'))
      navigate({ to: '/orders/$id', params: { id } })
    },
  })

  const isSubmitting = useStore(form.store, (s) => s.isSubmitting)

  if (!data) {
    return (
      <PageContent>
        <p>{t('noOrders')}</p>
      </PageContent>
    )
  }

  return (
    <PageContent>
      <PageHeader
        title={t('editOrder')}
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
