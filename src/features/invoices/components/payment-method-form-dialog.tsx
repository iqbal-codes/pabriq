import { useTranslations } from 'use-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { PaymentMethodFormContent } from '#/features/invoices/components/payment-method-form-content'
import type { PaymentMethod } from '#/features/invoices/model'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingMethod: PaymentMethod | null
  onSaved: () => void
}

export function PaymentMethodFormDialog({
  open,
  onOpenChange,
  editingMethod,
  onSaved,
}: Props) {
  const t = useTranslations('settings')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingMethod ? t('editPaymentMethod') : t('addPaymentMethod')}
          </DialogTitle>
        </DialogHeader>
        {open && (
          <PaymentMethodFormContent
            key={editingMethod?.id ?? 'new'}
            editingMethod={editingMethod}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
