import { useTranslations } from 'use-intl'
import { FormRoot, useAppForm } from '#/components/app/form'
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

export function RejectPaymentDialog({
  open,
  onOpenChange,
  paymentId,
  onReject,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  paymentId: string | null
  onReject: (paymentId: string, reason: string) => Promise<void>
  isPending: boolean
}) {
  const t = useTranslations('invoices')
  const ct = useTranslations('common')

  const form = useAppForm({
    defaultValues: {
      reason: '',
    },
    onSubmit: async ({ value }) => {
      if (paymentId) {
        await onReject(paymentId, value.reason.trim())
      }
    },
  })

  return (
    <AlertDialog
      open={open}
      onOpenChange={(open_) => {
        if (!open_) {
          onOpenChange(false)
          form.reset()
        }
      }}
    >
      <AlertDialogContent>
        <FormRoot form={form}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('rejectSimple')} {t('payments')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('rejectReasonPlaceholder')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-3">
            <form.AppField name="reason">
              {(field) => (
                <field.TextareaField
                  label={t('rejectReasonPlaceholder')}
                  placeholder={t('rejectReasonPlaceholder')}
                />
              )}
            </form.AppField>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              type="button"
              onClick={() => {
                onOpenChange(false)
                form.reset()
              }}
            >
              {ct('cancel')}
            </AlertDialogCancel>
            <form.AppForm>
              <AlertDialogAction
                type="submit"
                onClick={form.handleSubmit}
                variant="destructive"
                isLoading={isPending}
                disabled={!form.state.values.reason.trim() || isPending}
              >
                {t('rejectSimple')}
              </AlertDialogAction>
            </form.AppForm>
          </AlertDialogFooter>
        </FormRoot>
      </AlertDialogContent>
    </AlertDialog>
  )
}
