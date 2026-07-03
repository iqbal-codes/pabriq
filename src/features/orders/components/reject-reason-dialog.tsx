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
import { Textarea } from '#/components/ui/textarea'

export function RejectReasonDialog({
  open,
  onOpenChange,
  rejectReason,
  onRejectReasonChange,
  onReject,
  isRejecting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rejectReason: string
  onRejectReasonChange: (value: string) => void
  onReject: () => void
  isRejecting: boolean
}) {
  const t = useTranslations('orders')
  const ct = useTranslations('common')

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('reject')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('rejectReasonPlaceholder')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-3">
          <Textarea
            value={rejectReason}
            onChange={(e) => onRejectReasonChange(e.target.value)}
            placeholder={t('rejectReasonPlaceholder')}
            rows={3}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            {ct('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onReject}
            variant="destructive"
            isLoading={isRejecting}
            disabled={!rejectReason.trim() || isRejecting}
          >
            {t('reject')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
