import type * as React from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import {
  FormActions,
  FormRoot,
  FormSheet,
  useAppForm,
} from '#/components/app/form'
import { Button } from '#/components/ui/button'
import { CustomerFormFields } from '#/features/customers/components/customer-form-fields'
import {
  useCreateCustomer,
  useCustomerMaybe,
  useUpdateCustomer,
} from '#/features/customers/hooks'
import type { Customer } from '#/features/customers/model'
import { customerFormSchema } from '#/lib/validation-schemas'

export type CustomerFormSheetMode =
  | { type: 'create' }
  | { type: 'edit'; id: string }

export type CustomerFormSheetProps = {
  mode: CustomerFormSheetMode
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

interface CustomerFormSheetInnerProps {
  mode: CustomerFormSheetMode
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  customer?: Customer
}

function CustomerFormSheetInner({
  mode,
  onOpenChange,
  onSaved,
  customer,
}: CustomerFormSheetInnerProps) {
  const t = useTranslations('customers')
  const ct = useTranslations('common')
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()

  const isEdit = mode.type === 'edit'
  const title = isEdit ? t('editCustomer') : t('createCustomer')
  const submitLabel = t('save')

  const form = useAppForm({
    defaultValues: {
      name: customer?.name ?? '',
      email: customer?.email ?? '',
      phone: customer?.phone ?? '',
      notes: customer?.notes ?? '',
      active: customer?.active ?? true,
      isWni: customer?.isWni ?? true,
      photoAssetId: customer?.photoAssetId ?? (null as string | null),
      address: customer?.address ?? {
        areaId: '',
        areaName: '',
        streetAddress: '',
      },
    },
    validators: {
      onChange: customerFormSchema,
      onSubmit: customerFormSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      if (!formApi.state.isValid) return

      if (isEdit && customer) {
        const result = await updateCustomer.mutateAsync({
          ...value,
          id: customer.id,
        })
        if (result.ok) {
          toast.success(t('customerUpdated'))
          onSaved()
        } else {
          const msg =
            result.error === 'nameRequired' ? t('nameRequired') : result.error
          toast.error(msg)
        }
      } else {
        const result = await createCustomer.mutateAsync(value)
        if (result.ok) {
          toast.success(t('customerCreated'))
          onSaved()
        } else {
          const msg =
            result.error === 'nameRequired' ? t('nameRequired') : result.error
          toast.error(msg)
        }
      }
    },
  })

  return (
    <FormSheet open={true} onOpenChange={onOpenChange} title={title}>
      <FormRoot form={form} className="flex min-h-0 flex-1 flex-col space-y-0">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <CustomerFormFields form={form} />
        </div>
        <FormActions
          align="stacked"
          className="border-t bg-background px-5 py-4"
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {ct('cancel')}
          </Button>
          <form.AppForm>
            <form.SubmitButton>{submitLabel}</form.SubmitButton>
          </form.AppForm>
        </FormActions>
      </FormRoot>
    </FormSheet>
  )
}

export function CustomerFormSheet({
  mode,
  open,
  onOpenChange,
  onSaved,
}: CustomerFormSheetProps): React.ReactNode {
  const t = useTranslations('customers')
  const ct = useTranslations('common')

  const isEdit = mode.type === 'edit'
  const customerId = isEdit ? mode.id : ''

  const customerQuery = useCustomerMaybe(customerId)

  if (!open) {
    return null
  }

  if (isEdit) {
    if (customerQuery.isLoading) {
      return (
        <FormSheet
          open={open}
          onOpenChange={onOpenChange}
          title={t('editCustomer')}
        >
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">{ct('loading')}...</p>
          </div>
        </FormSheet>
      )
    }

    const customer = customerQuery.data
    if (!customer) {
      return (
        <FormSheet
          open={open}
          onOpenChange={onOpenChange}
          title={t('editCustomer')}
        >
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">{t('noCustomers')}</p>
          </div>
        </FormSheet>
      )
    }

    return (
      <CustomerFormSheetInner
        mode={mode}
        onOpenChange={onOpenChange}
        onSaved={onSaved}
        customer={customer}
      />
    )
  }

  return (
    <CustomerFormSheetInner
      mode={mode}
      onOpenChange={onOpenChange}
      onSaved={onSaved}
    />
  )
}
