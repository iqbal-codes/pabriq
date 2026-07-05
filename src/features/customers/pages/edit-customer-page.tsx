import { useNavigate, useParams } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { FormActions, FormRoot, useAppForm } from '#/components/app/form'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { CustomerFormFields } from '#/features/customers/components/customer-form-fields'
import { useCustomer, useUpdateCustomer } from '#/features/customers/hooks'
import { customerFormSchema } from '#/lib/validation-schemas'

export function EditCustomerPage() {
  const navigate = useNavigate()
  const { id } = useParams({ from: '/_org/customers/$id/edit' })
  const customer = useCustomer(id).data
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
      isWni: customer?.isWni ?? true,
      photoAssetId: customer?.photoAssetId ?? null,
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
      />
      <h1 className="text-2xl font-semibold tracking-tight md:hidden">
        {t('editCustomer')}
      </h1>
      <FormRoot form={form}>
        <CustomerFormFields form={form} />
        <FormActions align="stacked">
          <form.AppForm>
            <form.SubmitButton>{t('save')}</form.SubmitButton>
          </form.AppForm>
        </FormActions>
      </FormRoot>
    </PageContent>
  )
}
