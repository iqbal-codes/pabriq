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

export function CancelInvitationDialog({
  open,
  onOpenChange,
  onConfirm,
  isCancelling = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isCancelling?: boolean
}) {
  const t = useTranslations('members')
  const ct = useTranslations('common')

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('cancelInvite')}</AlertDialogTitle>
          <AlertDialogDescription>{t('cancelConfirm')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCancelling}>{ct('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            isLoading={isCancelling}
            disabled={isCancelling}
            onClick={onConfirm}
          >
            {t('cancelInvite')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
