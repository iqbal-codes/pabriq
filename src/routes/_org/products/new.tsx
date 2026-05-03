import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslations } from 'use-intl'
import { useAppForm } from '#/components/app/form/form-context'
import {
  FormGrid,
  FormRoot,
  FormSection,
} from '#/components/app/form/form-layout'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { Separator } from '#/components/ui/separator'
import { useCreateProduct } from '#/features/products/hooks'

export const Route = createFileRoute('/_org/products/new')({
  beforeLoad: () => ({
    breadcrumb: 'newProduct',
    pageTitle: 'newProduct',
  }),
  component: NewProductPage,
})

function NewProductPage() {
  const t = useTranslations('products')
  const navigate = useNavigate()
  const createProduct = useCreateProduct()

  const form = useAppForm({
    defaultValues: {
      name: '',
      description: '',
      productionNotes: '',
      basePrice: 0,
      productionDays: 1,
      minQuantity: 1,
      maxQuantity: undefined as number | undefined,
    },
    onSubmit: async ({ value }) => {
      await createProduct.mutateAsync(value)
      navigate({ to: '/products' })
    },
  })

  return (
    <PageContent>
      <PageHeader
        title={t('createTitle')}
        primaryAction={{
          label: t('createProduct'),
          onClick: () => form.handleSubmit(),
        }}
      />
      <FormRoot form={form}>
        <FormSection title={'Product Information'}>
          <FormGrid columns={1}>
            <form.AppField name="name">
              {(field) => (
                <field.TextField
                  label={t('name')}
                  placeholder={t('namePlaceholder')}
                />
              )}
            </form.AppField>
            <form.AppField name="description">
              {(field) => (
                <field.TextareaField
                  label={t('description')}
                  placeholder={t('descriptionPlaceholder')}
                />
              )}
            </form.AppField>
          </FormGrid>
        </FormSection>
        <Separator />
        <FormSection title={t('productionNotes')}>
          <FormGrid columns={1}>
            <form.AppField name="productionNotes">
              {(field) => (
                <field.TextareaField
                  label={t('productionNotes')}
                  placeholder={t('productionNotesPlaceholder')}
                />
              )}
            </form.AppField>
          </FormGrid>
        </FormSection>
        <Separator />
        <FormSection title={'Pricing & Orders'}>
          <FormGrid columns={2}>
            <form.AppField name="basePrice">
              {(field) => <field.NumberField label={t('basePrice')} />}
            </form.AppField>
            <form.AppField name="productionDays">
              {(field) => <field.NumberField label={t('productionDays')} />}
            </form.AppField>
            <form.AppField name="minQuantity">
              {(field) => <field.NumberField label={t('minQuantity')} />}
            </form.AppField>
            <form.AppField name="maxQuantity">
              {(field) => <field.NumberField label={t('maxQuantity')} />}
            </form.AppField>
          </FormGrid>
        </FormSection>
      </FormRoot>
    </PageContent>
  )
}
