import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { FormGrid, FormRoot, useAppForm } from '#/components/app/form'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import {
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
} from '#/features/invoices/hooks'
import type { PaymentMethod } from '#/features/invoices/model'

type PaymentMethodFormValues = {
  name: string
  type: string
  bankName: string
  accountNumber: string
  accountHolder: string
  instructions: string
  isDefault: boolean
  active: boolean
}

function getPaymentMethodDefaults(
  editingMethod: PaymentMethod | null,
): PaymentMethodFormValues {
  if (!editingMethod) {
    return {
      name: '',
      type: 'bank_transfer',
      bankName: '',
      accountNumber: '',
      accountHolder: '',
      instructions: '',
      isDefault: false,
      active: true,
    }
  }
  return {
    name: editingMethod.name,
    type: editingMethod.type,
    bankName: editingMethod.bankName ?? '',
    accountNumber: editingMethod.accountNumber ?? '',
    accountHolder: editingMethod.accountHolder ?? '',
    instructions: editingMethod.instructions ?? '',
    isDefault: editingMethod.isDefault,
    active: editingMethod.active,
  }
}

type PaymentMethodFormContentProps = {
  editingMethod: PaymentMethod | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function PaymentMethodFormContent({
  editingMethod,
  onOpenChange,
  onSaved,
}: PaymentMethodFormContentProps) {
  const t = useTranslations('settings')
  const ct = useTranslations('common')
  const createPaymentMethod = useCreatePaymentMethod()
  const updatePaymentMethod = useUpdatePaymentMethod()
  const isSavingPaymentMethod = createPaymentMethod.isPending || updatePaymentMethod.isPending

  const form = useAppForm({
    defaultValues: getPaymentMethodDefaults(editingMethod),
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

  return (
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

        <form.Subscribe selector={(state) => state.values.type}>
          {(type) =>
            type === 'bank_transfer' ? (
              <>
                <form.AppField name="bankName">
                  {(field) => <field.TextField label={t('bankName')} />}
                </form.AppField>

                <form.AppField name="accountNumber">
                  {(field) => <field.TextField label={t('accountNumber')} />}
                </form.AppField>

                <form.AppField name="accountHolder">
                  {(field) => <field.TextField label={t('accountHolder')} />}
                </form.AppField>
              </>
            ) : null
          }
        </form.Subscribe>

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
        <Button variant="outline" onClick={() => handleClose(false)} disabled={isSavingPaymentMethod}>
          {ct('cancel')}
        </Button>
        <form.AppForm>
          <form.SubmitButton isPending={isSavingPaymentMethod}>
            {editingMethod ? t('editPaymentMethod') : t('addPaymentMethod')}
          </form.SubmitButton>
        </form.AppForm>
      </div>
    </FormRoot>
  )
}
