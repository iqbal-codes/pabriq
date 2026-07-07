import { Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import {
  FormActions,
  FormGrid,
  FormRoot,
  useAppForm,
} from '#/components/app/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { useAdjustOrderQuantity } from '#/features/orders/hooks'
import type { ProductRow } from '#/features/products/model'
import { currencyFormatter } from './view-order-utils'

type LineItem = {
  id: string
  productId: string
  productName: string
  designName: string | null
  quantity: number
  unitPrice: number
  total: number
  isRepeatOrder: boolean
}
type OrderQuantityAdjustmentModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  selectedLineItemId: string | null
  lineItems: LineItem[]
  products: ProductRow[]
  onSuccess: () => void
}

export function OrderQuantityAdjustmentModal({
  open,
  onOpenChange,
  orderId,
  selectedLineItemId,
  lineItems,
  products,
  onSuccess,
}: OrderQuantityAdjustmentModalProps) {
  const t = useTranslations('orders')
  const adjustQuantity = useAdjustOrderQuantity()

  const selectedLineItem = lineItems.find((li) => li.id === selectedLineItemId)

  const form = useAppForm({
    defaultValues: {
      lineItemId: selectedLineItemId ?? '',
      newQuantity: selectedLineItem?.quantity ?? 1,
      reason: '',
    },
    onSubmit: async ({ value }) => {
      const selectedLineItem = lineItems.find(
        (li) => li.id === value.lineItemId,
      )
      if (!selectedLineItem) {
        return
      }

      const product = products.find((p) => p.id === selectedLineItem.productId)
      if (!product) {
        return
      }

      const minQty = selectedLineItem.isRepeatOrder
        ? (product.repeatOrderMinQuantity ?? product.minQuantity)
        : product.minQuantity

      if (value.newQuantity < minQty) {
        return
      }

      if (product.maxQuantity && value.newQuantity > product.maxQuantity) {
        return
      }

      const result = await adjustQuantity.mutateAsync({
        orderId,
        lineItemId: value.lineItemId,
        quantity: value.newQuantity,
        reason: value.reason,
      })

      if (result.ok) {
        toast.success(t('quantityAdjusted'))
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(result.error ?? 'Failed to adjust quantity')
      }
    },
    validators: {
      onSubmit: ({ value }) => {
        const selectedLineItem = lineItems.find(
          (li) => li.id === value.lineItemId,
        )
        if (!selectedLineItem) {
          return { form: 'Invalid line item' }
        }

        const product = products.find(
          (p) => p.id === selectedLineItem.productId,
        )
        if (!product) {
          return { form: 'Product not found' }
        }

        const minQty = selectedLineItem.isRepeatOrder
          ? (product.repeatOrderMinQuantity ?? product.minQuantity)
          : product.minQuantity

        if (value.newQuantity < minQty) {
          return {
            form: selectedLineItem.isRepeatOrder
              ? `Quantity below repeat order minimum of ${minQty}`
              : `Quantity below minimum of ${minQty}`,
          }
        }

        if (product.maxQuantity && value.newQuantity > product.maxQuantity) {
          return {
            form: `Max quantity is ${product.maxQuantity}`,
          }
        }

        return undefined
      },
    },
  })

  // selectedLineItem is resolved above

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="size-5" />
            {t('adjustQuantity')}
          </DialogTitle>
          <DialogDescription>
            {t('adjustQuantityDescription')}
          </DialogDescription>
        </DialogHeader>

        <FormRoot form={form}>
          <div className="space-y-4">
            {selectedLineItem && (
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  {t('selectLineItem')}
                </span>
                <p className="text-sm font-semibold text-foreground">
                  {selectedLineItem.productName}
                </p>
                {selectedLineItem.designName && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedLineItem.designName}
                  </p>
                )}
                <div className="mt-3 grid grid-cols-2 gap-4 border-t border-border/50 pt-3">
                  <div>
                    <span className="text-xs text-muted-foreground block">
                      {t('currentQuantity')}
                    </span>
                    <span className="text-lg font-bold font-mono mt-0.5 block text-foreground">
                      {selectedLineItem.quantity}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">
                      {t('unitPrice')}
                    </span>
                    <span className="text-lg font-semibold font-mono mt-0.5 block text-foreground">
                      {currencyFormatter.format(selectedLineItem.unitPrice)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <FormGrid columns={1}>
            <form.AppField name="newQuantity">
              {(field) => <field.NumberField label={t('newQuantity')} />}
            </form.AppField>

            <form.AppField name="reason">
              {(field) => (
                <field.TextareaField
                  label={t('adjustmentReason')}
                  placeholder={t('adjustmentReasonPlaceholder')}
                />
              )}
            </form.AppField>
          </FormGrid>
          <FormActions>
            <form.AppForm>
              <form.SubmitButton isPending={adjustQuantity.isPending}>
                {t('adjustQuantity')}
              </form.SubmitButton>
            </form.AppForm>
          </FormActions>
        </FormRoot>
      </DialogContent>
    </Dialog>
  )
}
