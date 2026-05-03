import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import {
  FormGrid,
  FormRoot,
  FormSection,
  useAppForm,
} from '#/components/app/form'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import type { CustomerInput } from '#/features/customers/model'
import { createCustomerFn } from '#/features/customers/server'

export const Route = createFileRoute('/_org/customers/new')({
  beforeLoad: () => ({
    breadcrumb: 'createCustomer',
    pageTitle: 'createCustomer',
  }),
  component: CreateCustomer,
})

function CreateCustomer() {
  const navigate = useNavigate()
  const t = useTranslations('customers')

  const form = useAppForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      notes: '',
      active: true,
      photoAssetId: null as string | null,
    } satisfies CustomerInput,
    onSubmit: async ({ value }) => {
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

  return (
    <PageContent>
      <PageHeader
        title={t('createCustomer')}
        primaryAction={{
          label: t('save'),
          onClick: () => form.handleSubmit(),
        }}
      />
      <FormRoot form={form}>
        <FormSection title={t('createCustomer')}>
          <FormGrid>
            <form.AppField name="name">
              {(field) => <field.TextField label={t('name')} />}
            </form.AppField>
            <form.AppField name="email">
              {(field) => <field.EmailField label={t('email')} />}
            </form.AppField>
            <form.AppField name="phone">
              {(field) => <field.PhoneField label={t('phone')} />}
            </form.AppField>
            <form.AppField name="notes">
              {(field) => <field.TextareaField label={t('notes')} />}
            </form.AppField>
            <form.AppField name="photoAssetId">
              {(field) => <field.PhotoUploadField label={t('photo')} />}
            </form.AppField>
          </FormGrid>
        </FormSection>
      </FormRoot>
    </PageContent>
  )
}
