import { useTranslations } from 'use-intl'
import { FormGrid, FormSection, withForm } from '#/components/app/form'

export const ProductFormFields = withForm({
  defaultValues: {
    name: '',
    description: '',
    productionNotes: '',
    basePrice: 0,
    productionDays: 1,
    minQuantity: 1,
    maxQuantity: undefined as number | undefined,
  },
  render: function Render({ form }) {
    const t = useTranslations('products')

    return (
      <>
        <FormSection title={t('productInfo')}>
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
            <form.AppField name="productionDays">
              {(field) => <field.NumberField label={t('productionDays')} />}
            </form.AppField>
          </FormGrid>
        </FormSection>
        <FormSection title={t('pricingAndOrders')}>
          <FormGrid columns={3}>
            <form.AppField name="basePrice">
              {(field) => <field.NumberField label={t('basePrice')} />}
            </form.AppField>
            <form.AppField name="minQuantity">
              {(field) => <field.NumberField label={t('minQuantity')} />}
            </form.AppField>
            <form.AppField name="maxQuantity">
              {(field) => <field.NumberField label={t('maxQuantity')} />}
            </form.AppField>
          </FormGrid>
        </FormSection>
      </>
    )
  },
})
