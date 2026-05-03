import { useTranslations } from 'use-intl'
import { FormGrid, FormSection, withForm } from '#/components/app/form'

export const CustomerFormFields = withForm({
  defaultValues: {
    name: '',
    email: '',
    phone: '',
    notes: '',
    active: true as boolean,
    photoAssetId: null as string | null,
    address: {
      areaId: '',
      areaName: '',
      streetAddress: '',
    },
  },
  render: function Render({ form }) {
    const t = useTranslations('customers')
    const at = useTranslations('address')

    return (
      <>
        <FormSection title={t('customerInfo')}>
          <FormGrid columns={1}>
            <form.AppField name="photoAssetId">
              {(field) => <field.PhotoUploadField label={t('photo')} />}
            </form.AppField>
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
          </FormGrid>
        </FormSection>
        <FormSection title={at('title')}>
          <FormGrid columns={1}>
            <form.AppField name="address">
              {(field) => <field.AddressField />}
            </form.AppField>
          </FormGrid>
        </FormSection>
      </>
    )
  },
})
