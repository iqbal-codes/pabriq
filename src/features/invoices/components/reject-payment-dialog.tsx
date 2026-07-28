import { useForm } from '@tanstack/react-form'
import { AlertCircle } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { z } from 'zod'
import { FormError } from '#/components/app/form/form-error'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { useRejectPayment } from '#/features/invoices/hooks'

type RejectPaymentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  paymentId: string
  onSuccess?: () => void
}

export function RejectPaymentDialog({
  open,
  onOpenChange,
  paymentId,
  onSuccess,
}: RejectPaymentDialogProps) {
  const t = useTranslations('invoices')
  const ct = useTranslations('common')
  const rejectMutation = useRejectPayment()

  const formSchema = z.object({
    reason: z.string().trim().min(1, t('rejectionReasonRequired')),
  })

  const form = useForm({
    defaultValues: {
      reason: '',
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      const res = await rejectMutation.mutateAsync({
        paymentId,
        reason: value.reason,
      })
      if (res.ok) {
        form.reset()
        onOpenChange(false)
        onSuccess?.()
      }
    },
  })

  const handleOpenChange = (nextOpen: boolean) => {
    if (rejectMutation.isPending) return
    if (!nextOpen) {
      form.reset()
      rejectMutation.reset()
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <AlertCircle className="size-5" aria-hidden="true" />
            {t('rejectPayment')}
          </DialogTitle>
          <DialogDescription>{t('rejectPaymentDesc')}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void form.handleSubmit()
          }}
          className="space-y-4 py-2"
        >
          {rejectMutation.isError && (
            <FormError
              message={
                rejectMutation.error instanceof Error
                  ? rejectMutation.error.message
                  : 'An unknown error occurred'
              }
            />
          )}

          {rejectMutation.data?.ok === false && (
            <FormError message={rejectMutation.data.error} />
          )}

          <form.Field name="reason">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched &&
                Boolean(field.state.meta.errors.length)
              return (
                <div className="space-y-1.5">
                  <Label
                    htmlFor="rejection-reason-input"
                    className="text-xs font-medium"
                  >
                    {t('rejectionReason')}{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="rejection-reason-input"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder={t('rejectReasonPlaceholder')}
                    rows={3}
                    aria-invalid={isInvalid}
                    className="text-xs"
                  />
                  {isInvalid && (
                    <p className="text-xs font-medium text-destructive">
                      {field.state.meta.errors.join(', ')}
                    </p>
                  )}
                </div>
              )
            }}
          </form.Field>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={rejectMutation.isPending}
              onClick={() => handleOpenChange(false)}
            >
              {ct('cancel')}
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  isLoading={isSubmitting || rejectMutation.isPending}
                  disabled={
                    !canSubmit || isSubmitting || rejectMutation.isPending
                  }
                >
                  {t('confirmRejection')}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
