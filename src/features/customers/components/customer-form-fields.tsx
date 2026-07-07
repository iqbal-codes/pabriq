import { useStore } from '@tanstack/react-form'
import { useTranslations } from 'use-intl'
import { FormGrid, FormSection, withForm } from '#/components/app/form'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Switch } from '#/components/ui/switch'

export const CustomerFormFields = withForm({
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
  render: function Render({ form }) {
    const t = useTranslations('customers')
    const at = useTranslations('address')
    const isWni = useStore(form.store, (state) => state.values.isWni)

    return (
      <div className="space-y-6">
        <FormSection title={t('customerInfo')} titleHidden>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('customerInfo')}</CardTitle>
            </CardHeader>
            <CardContent>
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
                  {(field) => (
                    <field.TextareaField label={t('notes')} optional />
                  )}
                </form.AppField>
              </FormGrid>
            </CardContent>
          </Card>
        </FormSection>
        <FormSection title={at('title')} titleHidden>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{at('title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <FormGrid columns={1}>
                <form.AppField name="isWni">
                  {(field) => (
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm font-medium">
                        {field.state.value ? at('isWni') : at('isWna')}
                      </span>
                      <Switch
                        checked={field.state.value}
                        onCheckedChange={(checked) => {
                          field.handleChange(checked)
                          if (!checked) {
                            form.setFieldValue('address', {
                              ...form.state.values.address,
                              areaId: '',
                              areaName: '',
                            })
                          }
                        }}
                      />
                    </div>
                  )}
                </form.AppField>
                <form.AppField name="address">
                  {(field) => <field.AddressField showAreaSearch={isWni} />}
                </form.AppField>
              </FormGrid>
            </CardContent>
          </Card>
        </FormSection>
      </div>
    )
  },
})
