import { useStore } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { FormRoot, useAppForm } from '#/components/app/form'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { CustomerFormFields } from '#/features/customers/components/customer-form-fields'
import type { CustomerInput } from '#/features/customers/model'
import { createCustomerFn } from '#/features/customers/server'
import { customerFormSchema } from '#/lib/validation-schemas'

export function CreateCustomerPage() {
  const navigate = useNavigate()
  const t = useTranslations('customers')

  const form = useAppForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      notes: '',
      active: true as boolean,
      photoAssetId: null as string | null,
    } satisfies CustomerInput,
    validators: {
      onChange: customerFormSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      if (!formApi.state.isValid) return
      const result = await createCustomerFn({ data: value })
      if (result.ok) {
        toast.success(t('customerCreated'))
        navigate({ to: '/customers' })
      } else {
        const msg =
          result.error === 'nameRequired' ? t('nameRequired') : result.error
        toast.error(msg)
      }
    },
  })

  const isSubmitting = useStore(form.store, (state) => state.isSubmitting)

  return (
    <PageContent>
      <PageHeader
        title={t('createCustomer')}
        primaryAction={{
          label: t('save'),
          isLoading: isSubmitting,
          onClick: () => form.handleSubmit(),
        }}
      />
      <FormRoot form={form}>
        <CustomerFormFields form={form} />
      </FormRoot>
    </PageContent>
  )
}
