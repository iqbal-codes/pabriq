import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import {
  FormActions,
  FormGrid,
  FormRoot,
  useAppForm,
} from '#/components/app/form'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { authClient } from '#/lib/auth-client'

export function ProfilePage({
  user,
}: {
  user: { id: string; name: string; email: string; image: string | null }
}) {
  const t = useTranslations('profile')
  const ct = useTranslations('common')

  const profileForm = useAppForm({
    defaultValues: { name: user.name, image: user.image },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.updateUser({
        name: value.name,
        image: value.image,
      })
      if (error) {
        toast.error(t('profileSaveFailed'))
      } else {
        toast.success(t('profileSaved'))
      }
    },
  })

  const passwordForm = useAppForm({
    defaultValues: { currentPassword: '', newPassword: '' },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.changePassword({
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
      })
      if (error) {
        toast.error(t('passwordChangeFailed'))
      } else {
        toast.success(t('passwordChanged'))
        passwordForm.reset()
      }
    },
  })

  return (
    <>
      <PageHeader title={t('title')} />
      <div className="space-y-8">
        <FormRoot form={profileForm}>
          <Card>
            <CardContent>
              <FormGrid columns={1}>
                <profileForm.AppField name="image">
                  {(field) => (
                    <field.PhotoUploadField
                      label={t('avatar')}
                      maxFiles={1}
                      multiple={false}
                      ownerType="customer"
                      usage="profile"
                    />
                  )}
                </profileForm.AppField>
                <profileForm.AppField name="name">
                  {(field) => <field.TextField label={t('name')} />}
                </profileForm.AppField>
                <div>
                  <span className="text-sm font-medium">{t('email')}</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {user.email}
                  </p>
                </div>
              </FormGrid>
            </CardContent>
          </Card>
          <FormActions align="stacked">
            <profileForm.AppForm>
              <profileForm.SubmitButton>
                {ct('confirm')}
              </profileForm.SubmitButton>
            </profileForm.AppForm>
          </FormActions>
        </FormRoot>

        <FormRoot form={passwordForm}>
          <Card>
            <CardHeader>
              <CardTitle>{t('changePassword')}</CardTitle>
            </CardHeader>
            <CardContent>
              <FormGrid columns={1}>
                <passwordForm.AppField name="currentPassword">
                  {(field) => (
                    <field.PasswordField label={t('currentPassword')} />
                  )}
                </passwordForm.AppField>
                <passwordForm.AppField name="newPassword">
                  {(field) => <field.PasswordField label={t('newPassword')} />}
                </passwordForm.AppField>
                <p className="text-xs text-muted-foreground -mt-2">
                  {t('newPasswordDesc')}
                </p>
              </FormGrid>
            </CardContent>
          </Card>
          <FormActions align="stacked">
            <passwordForm.AppForm>
              <passwordForm.SubmitButton>
                {t('changePassword')}
              </passwordForm.SubmitButton>
            </passwordForm.AppForm>
          </FormActions>
        </FormRoot>
      </div>
    </>
  )
}
