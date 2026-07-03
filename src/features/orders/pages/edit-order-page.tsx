import { useStore } from '@tanstack/react-form'
import { useNavigate, useParams, useRouteContext } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { FormRoot, useAppForm } from '#/components/app/form'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { useCustomersList } from '#/features/customers/hooks'
import { OrderFormFields } from '#/features/orders/components/order-form-fields'
import type { OrderFormValues } from '#/features/orders/components/order-form-types'
import { useOrder, useUpdateDraftOrder } from '#/features/orders/hooks'
import { useProductsList } from '#/features/products/hooks'

export function EditOrderPage() {
  const { id } = useParams({ from: '/_org/orders/$id/edit' })
  const ctx = useRouteContext({ from: '/_org/orders/$id/edit' }) as {
    org: { id: string }
  }
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
      address: {
        areaId: data?.order.shippingAddress?.areaId ?? '',
        areaName: data?.order.shippingAddress?.areaName ?? '',
        streetAddress: data?.order.shippingAddress?.streetAddress ?? '',
      },
      lineItems:
        data?.lineItems.map((li) => ({
          id: li.id,
          productId: li.productId,
          quantity: String(li.quantity),
          unitPrice: String(li.unitPrice),
          designName: li.designName ?? '',
          notes: li.notes ?? '',
          attachments: [] as string[],
          addonIds:
            (li.selectedAddons
              ?.map((a) => a.productAddonId)
              .filter(Boolean) as string[]) ?? [],
          isRepeatOrder: li.isRepeatOrder ?? false,
          deadline:
            li.manualDeadline && li.deadline
              ? new Date(li.deadline).toISOString().split('T')[0]
              : '',
          manualDeadline: li.manualDeadline ?? false,
        })) ?? [],
    } as OrderFormValues,
    onSubmit: async ({ value }) => {
      const validItems = value.lineItems.filter((i) => i.productId)
      if (validItems.length === 0) return

      // Validate manual deadlines before submit
      for (const i of validItems) {
        if (i.manualDeadline && !i.deadline) {
          toast.error(t('manualDeadlineRequired'))
          return
        }
      }

      await updateOrder.mutateAsync({
        id,
        orgId: ctx.org.id,
        customerId: value.customerId || null,
        notes: value.notes || undefined,
        lineItems: validItems.map((i) => {
          const qty = parseInt(String(i.quantity), 10) || 1
          const prod = products.find((p) => p.id === i.productId)
          const isNegotiated =
            prod?.negotiateAboveQuantity != null &&
            qty > prod.negotiateAboveQuantity
          return {
            id: i.id,
            productId: i.productId,
            quantity: qty,
            unitPrice:
              isNegotiated && i.unitPrice
                ? Number.parseFloat(String(i.unitPrice))
                : undefined,
            designName: i.designName || undefined,
            notes: i.notes || undefined,
            addonIds: i.addonIds.length > 0 ? i.addonIds : undefined,
            isRepeatOrder: i.isRepeatOrder || undefined,
            deadline: i.deadline
              ? new Date(`${i.deadline}T00:00:00`)
              : undefined,
            manualDeadline: i.manualDeadline || undefined,
          }
        }),
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
        />
      </FormRoot>
    </PageContent>
  )
}
