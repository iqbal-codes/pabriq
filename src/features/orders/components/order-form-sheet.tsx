import { Copy } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import {
  FormActions,
  FormRoot,
  FormSheet,
  useAppForm,
} from '#/components/app/form'
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
import type { CustomerRow } from '#/features/customers/model'
import { OrderCreationMissionOverlay } from '#/features/orders/components/order-creation-mission-overlay'
import { OrderFormFields } from '#/features/orders/components/order-form-fields'
import type { OrderFormValues } from '#/features/orders/components/order-form-types'
import { defaultOrderValues } from '#/features/orders/components/order-form-types'
import {
  useCreateDraftOrder,
  useOrder,
  useOrderCreationReadiness,
  useUpdateDraftOrder,
} from '#/features/orders/hooks'
import { useProductsList } from '#/features/products/hooks'
import type { ProductRow } from '#/features/products/model'
import { buildPortalUrl } from '#/lib/domain-routing'
import { orderFormSchema } from '#/lib/validation-schemas'

export type OrderFormSheetMode =
  | { type: 'create' }
  | { type: 'edit'; id: string }

export type OrderFormSheetProps = {
  mode: OrderFormSheetMode
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (orderId?: string) => void
}

const currencyFormatter = new Intl.NumberFormat('en-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
})

interface OrderFormSheetInnerProps {
  mode: OrderFormSheetMode
  orgId: string
  onOpenChange: (open: boolean) => void
  onSaved: (orderId?: string) => void
  customers: CustomerRow[]
  products: ProductRow[]
  initialValues?: OrderFormValues
  orderId?: string
}

function OrderFormSheetInner({
  mode,
  orgId,
  onOpenChange,
  onSaved,
  customers,
  products,
  initialValues,
  orderId,
}: OrderFormSheetInnerProps) {
  const t = useTranslations('orders')
  const pt = useTranslations('portal')
  const ct = useTranslations('common')
  const createOrder = useCreateDraftOrder()
  const updateOrder = useUpdateDraftOrder()

  const isEdit = mode.type === 'edit'
  const title = isEdit ? t('editOrder') : t('createOrder')
  const submitLabel = t('save')

  const [confirmationOpen, setConfirmationOpen] = React.useState(false)
  const [createdOrder, setCreatedOrder] = React.useState<{
    id: string
    customerName: string
    total: number
  } | null>(null)
  const [portalUrl, setPortalUrl] = React.useState<string | null>(null)

  const form = useAppForm({
    defaultValues: initialValues ?? defaultOrderValues(),
    validators: {
      onChange: orderFormSchema,
      onSubmit: orderFormSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      if (!formApi.state.isValid) return
      const validItems = value.lineItems.filter((i) => i.productId)

      if (isEdit && orderId) {
        // Validate manual deadlines before submit
        for (const i of validItems) {
          if (i.manualDeadline && !i.deadline) {
            toast.error(t('manualDeadlineRequired'))
            return
          }
        }

        await updateOrder.mutateAsync({
          id: orderId,
          orgId,
          customerId: value.customerId || null,
          notes: value.notes || undefined,
          deadline: value.deadline
            ? new Date(`${value.deadline}T00:00:00`)
            : undefined,
          manualDeadline: value.manualDeadline || undefined,
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
        onSaved(orderId)
      } else {
        try {
          const result = await createOrder.mutateAsync({
            orgId,
            customerId: value.customerId || null,
            notes: value.notes || undefined,
            deadline: value.deadline
              ? new Date(`${value.deadline}T00:00:00`)
              : undefined,
            manualDeadline: value.manualDeadline || undefined,
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

          toast.success(t('orderCreated'))
          const customer = customers.find((c) => c.id === value.customerId)
          setCreatedOrder({
            id: result.order.id,
            customerName: customer?.name ?? t('guestCustomer'),
            total: result.order.total,
          })
          if (result.order.orderToken) {
            setPortalUrl(buildPortalUrl(result.order.orderToken))
          }
          setConfirmationOpen(true)
        } catch {
          toast.error(t('createOrderFailed'))
          return
        }
      }
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
      onSaved(createdOrder.id)
    } else {
      onSaved()
    }
  }

  return (
    <>
      <FormSheet open={true} onOpenChange={onOpenChange} title={title}>
        <FormRoot
          form={form}
          className="flex min-h-0 flex-1 flex-col space-y-0"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <OrderFormFields
              form={form}
              customers={customers}
              products={products}
            />
          </div>
          <FormActions
            align="stacked"
            className="border-t bg-background px-5 py-4"
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {ct('cancel')}
            </Button>
            <form.AppForm>
              <form.SubmitButton>{submitLabel}</form.SubmitButton>
            </form.AppForm>
          </FormActions>
        </FormRoot>
      </FormSheet>

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
    </>
  )
}

export function OrderFormSheet({
  mode,
  orgId,
  open,
  onOpenChange,
  onSaved,
}: OrderFormSheetProps): React.ReactNode {
  const t = useTranslations('orders')
  const ct = useTranslations('common')

  const isEdit = mode.type === 'edit'
  const orderId = isEdit ? mode.id : ''

  const readinessQuery = useOrderCreationReadiness()
  const orderQuery = useOrder({ id: orderId, orgId })
  const customersQuery = useCustomersList({ orgId })
  const productsQuery = useProductsList({ orgId })

  const customers = customersQuery.data?.rows ?? []
  const products = productsQuery.data?.rows ?? []

  if (!open) {
    return null
  }

  // CREATE MODE: check readiness
  if (!isEdit) {
    if (
      readinessQuery.isLoading ||
      !readinessQuery.data ||
      !readinessQuery.data.isReady
    ) {
      return (
        <FormSheet
          open={open}
          onOpenChange={onOpenChange}
          title={t('createOrder')}
        >
          <div className="flex-1 overflow-y-auto min-h-0">
            <OrderCreationMissionOverlay
              readiness={
                readinessQuery.isLoading ? null : (readinessQuery.data ?? null)
              }
            />
          </div>
        </FormSheet>
      )
    }

    if (customersQuery.isLoading || productsQuery.isLoading) {
      return (
        <FormSheet
          open={open}
          onOpenChange={onOpenChange}
          title={t('createOrder')}
        >
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">{ct('loading')}...</p>
          </div>
        </FormSheet>
      )
    }

    return (
      <OrderFormSheetInner
        mode={mode}
        orgId={orgId}
        onOpenChange={onOpenChange}
        onSaved={onSaved}
        customers={customers}
        products={products}
      />
    )
  }

  // EDIT MODE: load order details
  if (isEdit) {
    if (
      orderQuery.isLoading ||
      customersQuery.isLoading ||
      productsQuery.isLoading
    ) {
      return (
        <FormSheet
          open={open}
          onOpenChange={onOpenChange}
          title={t('editOrder')}
        >
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">{ct('loading')}...</p>
          </div>
        </FormSheet>
      )
    }

    const orderData = orderQuery.data
    if (!orderData) {
      return (
        <FormSheet
          open={open}
          onOpenChange={onOpenChange}
          title={t('editOrder')}
        >
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">{t('noOrders')}</p>
          </div>
        </FormSheet>
      )
    }

    // Map orderData values into OrderFormValues format
    const initialValues: OrderFormValues = {
      customerId: orderData.order.customerId ?? '',
      notes: orderData.order.notes ?? '',
      address: {
        areaId: orderData.order.shippingAddress?.areaId ?? '',
        areaName: orderData.order.shippingAddress?.areaName ?? '',
        streetAddress: orderData.order.shippingAddress?.streetAddress ?? '',
      },
      deadline: orderData.order.deadline
        ? new Date(orderData.order.deadline).toISOString().split('T')[0]
        : '',
      manualDeadline: orderData.order.manualDeadline ?? false,
      lineItems:
        orderData.lineItems.map((li) => ({
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
    }

    return (
      <OrderFormSheetInner
        mode={mode}
        orgId={orgId}
        onOpenChange={onOpenChange}
        onSaved={onSaved}
        customers={customers}
        products={products}
        initialValues={initialValues}
        orderId={orderId}
      />
    )
  }

  return null
}
