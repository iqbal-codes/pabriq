import { useStore } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { FormRoot, useAppForm } from '#/components/app/form'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { CustomerFormFields } from '#/features/customers/components/customer-form-fields'
import { useCustomer, useUpdateCustomer } from '#/features/customers/hooks'
import type { CustomerInput } from '#/features/customers/model'
import { customerFormSchema } from '#/lib/validation-schemas'
import { Route } from '#/routes/_org/customers/$id/edit'

export function EditCustomerPage() {
  const navigate = useNavigate()
  const customer = useCustomer(Route.useParams().id).data
  const t = useTranslations('customers')
  const ct = useTranslations('common')
  const updateCustomer = useUpdateCustomer()

  const form = useAppForm({
    defaultValues: {
      name: customer?.name ?? '',
      email: customer?.email ?? '',
      phone: customer?.phone ?? '',
      notes: customer?.notes ?? '',
      active: customer?.active ?? true,
      photoAssetId: customer?.photoAssetId ?? null,
    } satisfies CustomerInput,
    validators: {
      onChange: customerFormSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      if (!formApi.state.isValid) return
      const result = await updateCustomer.mutateAsync({
        ...value,
        id: customer?.id ?? '',
      })
      if (result.ok) {
        toast.success(t('customerUpdated'))
        navigate({ to: '/customers' })
      } else {
        const msg =
          result.error === 'nameRequired' ? t('nameRequired') : result.error
        toast.error(msg)
      }
    },
  })

  const isSubmitting = useStore(form.store, (state) => state.isSubmitting)

  if (!customer) {
    return (
      <PageContent>
        <p>{t('noCustomers')}</p>
      </PageContent>
    )
  }

  return (
    <PageContent>
      <PageHeader
        title={t('editCustomer')}
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
