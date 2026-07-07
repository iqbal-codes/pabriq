import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import {
  FormActions,
  FormGrid,
  FormRoot,
  useAppForm,
} from '#/components/app/form'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { Card, CardContent } from '#/components/ui/card'
import { useOrgSettings, useUpdateOrgSettings } from '#/features/settings/hooks'

export function InvoicingSettingsPage() {
  const t = useTranslations('settings')
  const { data: settings, isLoading } = useOrgSettings()
  const updateOrgSettings = useUpdateOrgSettings()

  const form = useAppForm({
    defaultValues: {
      lateFeePerDay: settings?.lateFeePerDay ?? 0,
    },
    onSubmit: async ({ value }) => {
      const result = await updateOrgSettings.mutateAsync({
        name: settings?.name ?? '',
        lateFeePerDay: value.lateFeePerDay,
      })
      if (result.ok) {
        toast.success(t('saved'))
      } else {
        toast.error(t('saveFailed'))
      }
    },
  })

  if (isLoading) return null

  return (
    <>
      <PageHeader title={t('invoicing')} />
      <FormRoot form={form}>
        <Card>
          <CardContent>
            <FormGrid columns={1}>
              <form.AppField name="lateFeePerDay">
                {(field) => <field.NumberField label={t('lateFeePerDay')} />}
              </form.AppField>
              <p className="text-sm text-muted-foreground">
                {t('lateFeePerDayDescription')}
              </p>
            </FormGrid>
          </CardContent>
        </Card>
        <FormActions align="stacked">
          <form.AppForm>
            <form.SubmitButton>{t('save')}</form.SubmitButton>
          </form.AppForm>
        </FormActions>
      </FormRoot>
    </>
  )
}
