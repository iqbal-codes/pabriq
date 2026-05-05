import { useStore } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { FormRoot, useAppForm } from '#/components/app/form'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { CustomerFormFields } from '#/features/customers/components/customer-form-fields'
import { useCreateCustomer } from '#/features/customers/hooks'
import { customerFormSchema } from '#/lib/validation-schemas'

export function CreateCustomerPage() {
  const navigate = useNavigate()
  const t = useTranslations('customers')
  const ct = useTranslations('common')
  const createCustomer = useCreateCustomer()

  const form = useAppForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      notes: '',
      active: true as boolean,
      isWni: true as boolean,
      photoAssetId: null as string | null,
      address: {
        areaId: '',
        areaName: '',
        streetAddress: '',
      },
    },
    validators: {
      onChange: customerFormSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      if (!formApi.state.isValid) return
      const result = await createCustomer.mutateAsync(value)
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
        backAction={{ label: ct('back'), href: '/customers' }}
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
