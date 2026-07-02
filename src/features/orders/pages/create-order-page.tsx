import { useStore } from '@tanstack/react-form'
import { useNavigate, useRouteContext } from '@tanstack/react-router'
import { Copy } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { FormRoot, useAppForm } from '#/components/app/form'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { useCustomersList } from '#/features/customers/hooks'
import { OrderFormFields } from '#/features/orders/components/order-form-fields'
import { defaultOrderValues } from '#/features/orders/components/order-form-types'
import { useCreateDraftOrder } from '#/features/orders/hooks'
import { useProductsList } from '#/features/products/hooks'

const currencyFormatter = new Intl.NumberFormat('en-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
})

export function CreateOrderPage() {
  const navigate = useNavigate()
  const ctx = useRouteContext({ from: '/_org/orders/new' }) as {
    org: { id: string }
  }
  const t = useTranslations('orders')
  const pt = useTranslations('portal')
  const ct = useTranslations('common')
  const createOrder = useCreateDraftOrder()
  const { data: customersData } = useCustomersList({ orgId: ctx.org.id })
  const { data: productsData } = useProductsList({ orgId: ctx.org.id })
  const customers = customersData?.rows ?? []
  const products = productsData?.rows ?? []

  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<{
    id: string
    customerName: string
    total: number
  } | null>(null)
  const [portalUrl, setPortalUrl] = useState<string | null>(null)

  const form = useAppForm({
    defaultValues: defaultOrderValues(),
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

      const result = await createOrder.mutateAsync({
        orgId: ctx.org.id,
        customerId: value.customerId || null,
        notes: value.notes || undefined,
        lineItems: validItems.map((i) => {
          const qty = parseInt(i.quantity, 10) || 1
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
                ? Number.parseFloat(i.unitPrice)
                : undefined,
            name: i.name || undefined,
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

      toast.success(t('orderCreated'))
      const customer = customers.find((c) => c.id === value.customerId)
      setCreatedOrder({
        id: result.order.id,
        customerName: customer?.name ?? t('guestCustomer'),
        total: result.order.total,
      })
      if (result.order.orderToken) {
        setPortalUrl(
          `${window.location.origin}/order/${result.order.orderToken}`,
        )
      }
      setConfirmationOpen(true)
    },
  })

  const handleCopyLink = () => {
    if (portalUrl) {
      navigator.clipboard.writeText(portalUrl)
      toast.success(pt('linkCopied'))
    }
  }

  const handleDismiss = () => {
    setConfirmationOpen(false)
    if (createdOrder) {
      navigate({ to: '/orders/$id', params: { id: createdOrder.id } })
    }
  }

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
        />
      </FormRoot>

      <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('orderCreated')}</AlertDialogTitle>
            <AlertDialogDescription>
              {createdOrder && (
                <div className="mt-2">
                  <p className="font-medium">{createdOrder.customerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {`${t('totalLabel')}: `}
                    {currencyFormatter.format(createdOrder.total)}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {portalUrl && (
            <div className="mt-4 space-y-4">
              <div className="flex gap-2">
                <Input value={portalUrl} readOnly className="flex-1" />
                <Button onClick={handleCopyLink} variant="outline" size="icon">
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <Button variant="outline" onClick={handleDismiss}>
              {ct('close')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContent>
  )
}
