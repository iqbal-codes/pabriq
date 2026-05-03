import { useStore } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { FormRoot, useAppForm } from '#/components/app/form'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { CustomerFormFields } from '#/features/customers/components/customer-form-fields'
import type { Customer, CustomerInput } from '#/features/customers/model'
import { updateCustomerFn } from '#/features/customers/server'
import { customerFormSchema } from '#/lib/validation-schemas'
import { Route } from '#/routes/_org/customers/$id/edit'

export function EditCustomerPage() {
  const navigate = useNavigate()
  const customer = Route.useLoaderData() as Customer | null
  const t = useTranslations('customers')

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
      const result = await updateCustomerFn({
        data: { ...value, id: customer?.id ?? '' },
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
