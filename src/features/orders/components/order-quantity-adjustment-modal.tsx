import { Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import {
  FormActions,
  FormGrid,
  FormRoot,
  FormSection,
  useAppForm,
} from '#/components/app/form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import type { ProductRow } from '#/features/products/model'
import { useAdjustOrderQuantity } from '#/features/orders/hooks'

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
  lineItems: LineItem[]
  products: ProductRow[]
  onSuccess: () => void
}

export function OrderQuantityAdjustmentModal({
  open,
  onOpenChange,
  orderId,
  lineItems,
  products,
  onSuccess,
}: OrderQuantityAdjustmentModalProps) {
  const t = useTranslations('orders')
  const adjustQuantity = useAdjustOrderQuantity()

  const lineItemOptions = lineItems.map((item) => ({
    value: item.id,
    label: item.designName
      ? `${item.productName} - ${item.designName} (qty: ${item.quantity})`
      : `${item.productName} (qty: ${item.quantity})`,
  }))

  const form = useAppForm({
    defaultValues: {
      lineItemId: lineItems[0]?.id ?? '',
      newQuantity: lineItems[0]?.quantity ?? 1,
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

  const selectedLineItem = lineItems.find(
    (li) => li.id === form.state.values.lineItemId,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="size-5" />
            {t('adjustQuantity')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('adjustQuantityDescription')}
          </p>
        </DialogHeader>

        <FormRoot form={form}>
          <FormSection title={t('selectLineItem')}>
            <FormGrid columns={1}>
              <form.AppField name="lineItemId">
                {(field) => (
                  <field.SelectField
                    label={t('selectLineItem')}
                    options={lineItemOptions}
                    placeholder={t('selectLineItem')}
                  />
                )}
              </form.AppField>
            </FormGrid>
          </FormSection>

          {selectedLineItem && (
            <FormSection title={t('currentQuantity')}>
              <FormGrid columns={1}>
                <div>
                  <p className="text-sm font-medium">{t('currentQuantity')}</p>
                  <p className="text-2xl font-bold font-mono mt-1">
                    {selectedLineItem.quantity}
                  </p>
                </div>
              </FormGrid>
            </FormSection>
          )}

          <FormSection title={t('newQuantity')}>
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
          </FormSection>

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
