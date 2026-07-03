import { useTranslations } from 'use-intl'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'

export function PaymentMethodDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isDeleting: boolean
}) {
  const t = useTranslations('settings')
  const ct = useTranslations('common')

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deletePaymentMethod')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('deletePaymentMethodConfirm')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {ct('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            isLoading={isDeleting}
            disabled={isDeleting}
            onClick={onConfirm}
          >
            {t('deletePaymentMethod')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
