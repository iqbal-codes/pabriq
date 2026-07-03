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

export function RemoveMemberDialog({
  open,
  onOpenChange,
  onConfirm,
  isRemoving = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isRemoving?: boolean
}) {
  const t = useTranslations('members')
  const ct = useTranslations('common')

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('remove')}</AlertDialogTitle>
          <AlertDialogDescription>{t('removeConfirm')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemoving}>
            {ct('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            isLoading={isRemoving}
            disabled={isRemoving}
            onClick={onConfirm}
          >
            {t('remove')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
