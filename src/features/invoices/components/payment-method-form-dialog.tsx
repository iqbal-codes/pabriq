import { useEffect } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { FormGrid, FormRoot, useAppForm } from '#/components/app/form'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import {
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
} from '#/features/invoices/hooks'
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
  const ct = useTranslations('common')
  const createPaymentMethod = useCreatePaymentMethod()
  const updatePaymentMethod = useUpdatePaymentMethod()

  const form = useAppForm({
    defaultValues: {
      name: '',
      type: 'bank_transfer' as string,
      bankName: '',
      accountNumber: '',
      accountHolder: '',
      instructions: '',
      isDefault: false,
      active: true,
    },
    onSubmit: async ({ value }) => {
      const derivedName =
        value.type === 'bank_transfer'
          ? [value.bankName, value.accountNumber].filter(Boolean).join(' - ') ||
            t('bankTransfer')
          : t('paymentGateway')
      const payload = {
        name: derivedName,
        type: value.type,
        bankName: value.bankName || null,
        accountNumber: value.accountNumber || null,
        accountHolder: value.accountHolder || null,
        instructions: value.instructions || null,
        isDefault: value.isDefault,
        active: value.active,
      }
      if (editingMethod) {
        const result = await updatePaymentMethod.mutateAsync({
          id: editingMethod.id,
          ...payload,
        })
        if (!result.ok) {
          toast.error(result.error)
          return
        }
      } else {
        const result = await createPaymentMethod.mutateAsync(payload)
        if (!result.ok) {
          toast.error(result.error)
          return
        }
      }
      toast.success(t('saved'))
      onOpenChange(false)
      form.reset()
      onSaved()
    },
  })

  function handleClose(open_: boolean) {
    if (!open_) {
      form.reset()
    }
    onOpenChange(open_)
  }

  // Populate form fields when editing an existing method
  useEffect(() => {
    if (editingMethod && open) {
      form.setFieldValue('type', editingMethod.type)
      form.setFieldValue('bankName', editingMethod.bankName ?? '')
      form.setFieldValue('accountNumber', editingMethod.accountNumber ?? '')
      form.setFieldValue('accountHolder', editingMethod.accountHolder ?? '')
      form.setFieldValue('instructions', editingMethod.instructions ?? '')
      form.setFieldValue('isDefault', editingMethod.isDefault)
      form.setFieldValue('active', editingMethod.active)
    }
  }, [editingMethod, open, form])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingMethod ? t('editPaymentMethod') : t('addPaymentMethod')}
          </DialogTitle>
        </DialogHeader>
        <FormRoot form={form}>
          <FormGrid columns={1}>
            <form.AppField name="type">
              {(field) => (
                <field.SelectField
                  label={ct('type')}
                  options={[
                    { value: 'bank_transfer', label: t('bankTransfer') },
                    { value: 'payment_gateway', label: t('paymentGateway') },
                  ]}
                />
              )}
            </form.AppField>

            <form.AppField name="bankName">
              {(field) => <field.TextField label={t('bankName')} />}
            </form.AppField>

            <form.AppField name="accountNumber">
              {(field) => <field.TextField label={t('accountNumber')} />}
            </form.AppField>

            <form.AppField name="accountHolder">
              {(field) => <field.TextField label={t('accountHolder')} />}
            </form.AppField>

            <form.AppField name="instructions">
              {(field) => <field.TextareaField label={t('instructions')} />}
            </form.AppField>

            <form.AppField name="isDefault">
              {(field) => (
                <div className="flex items-center justify-between">
                  <Label>{t('defaultPayment')}</Label>
                  <Switch
                    checked={field.state.value}
                    onCheckedChange={(v) => field.handleChange(v)}
                  />
                </div>
              )}
            </form.AppField>

            <form.AppField name="active">
              {(field) => (
                <div className="flex items-center justify-between">
                  <Label>{ct('status')}</Label>
                  <Switch
                    checked={field.state.value}
                    onCheckedChange={(v) => field.handleChange(v)}
                  />
                </div>
              )}
            </form.AppField>
          </FormGrid>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleClose(false)}>
              {ct('cancel')}
            </Button>
            <form.AppForm>
              <form.SubmitButton>
                {editingMethod ? t('editPaymentMethod') : t('addPaymentMethod')}
              </form.SubmitButton>
            </form.AppForm>
          </div>
        </FormRoot>
      </DialogContent>
    </Dialog>
  )
}
