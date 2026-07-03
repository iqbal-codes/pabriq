import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import {
  FormActions,
  FormGrid,
  FormRoot,
  FormSection,
  useAppForm,
} from '#/components/app/form'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { useCreatePayment } from '#/features/invoices/hooks'

export function RecordPaymentDialog({
  open,
  onOpenChange,
  invoiceId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceId: string
}) {
  const t = useTranslations('invoices')
  const ct = useTranslations('common')
  const createPayment = useCreatePayment()

  const paymentMethodOptions = [
    { value: 'bank_transfer', label: t('bankTransfer') },
    { value: 'payment_gateway', label: t('gateway') },
    { value: 'cash', label: t('paymentCash') },
  ]

  const form = useAppForm({
    defaultValues: {
      amount: '',
      method: 'bank_transfer',
      reference: '',
    },
    onSubmit: async ({ value }) => {
      const amount = Number.parseFloat(value.amount)
      if (!amount || amount <= 0) {
        toast.error(t('invalidAmount'))
        return
      }
      const res = await createPayment.mutateAsync({
        invoiceId,
        amount,
        method: value.method as 'bank_transfer' | 'payment_gateway' | 'cash',
        reference: value.reference || undefined,
      })
      if (res.ok) {
        toast.success(t('paymentRecorded'))
        onOpenChange(false)
      } else {
        toast.error(res.error ?? 'Failed')
      }
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('recordPayment')}</DialogTitle>
        </DialogHeader>

        <FormRoot form={form}>
          <FormSection title="">
            <FormGrid columns={1}>
              <form.AppField name="amount">
                {(field) => (
                  <field.NumberField label={t('amount')} placeholder="0" />
                )}
              </form.AppField>
              <form.AppField name="method">
                {(field) => (
                  <field.SelectField
                    label={t('method')}
                    options={paymentMethodOptions}
                    placeholder={t('method')}
                  />
                )}
              </form.AppField>
              <form.AppField name="reference">
                {(field) => (
                  <field.TextField
                    label={t('reference')}
                    placeholder={t('reference')}
                  />
                )}
              </form.AppField>
            </FormGrid>
          </FormSection>

          <FormActions>
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              {ct('cancel')}
            </Button>
            <form.AppForm>
              <form.SubmitButton isPending={createPayment.isPending}>{t('recordPayment')}</form.SubmitButton>
            </form.AppForm>
          </FormActions>
        </FormRoot>
      </DialogContent>
    </Dialog>
  )
}
