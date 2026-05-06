import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import {
  FormActions,
  FormGrid,
  FormRoot,
  useAppForm,
} from '#/components/app/form'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { authClient } from '#/lib/auth-client'

function getInitials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function ProfilePage({
  user,
}: {
  user: { id: string; name: string; email: string; image: string | null }
}) {
  const t = useTranslations('profile')
  const ct = useTranslations('common')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.image)

  const profileForm = useAppForm({
    defaultValues: { name: user.name },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.updateUser({
        name: value.name,
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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      const { error } = await authClient.updateUser({
        image: dataUrl,
      })
      if (error) {
        toast.error(t('profileSaveFailed'))
      } else {
        setAvatarUrl(dataUrl)
        toast.success(t('profileSaved'))
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>{t('avatar')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarUrl ?? ''} alt={user.name} />
              <AvatarFallback className="text-lg">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              {t('avatar')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <FormRoot form={profileForm}>
        <Card>
          <CardHeader>
            <CardTitle>{t('title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <FormGrid columns={1}>
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
        <FormActions>
          <profileForm.AppForm>
            <profileForm.SubmitButton>{ct('confirm')}</profileForm.SubmitButton>
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
        <FormActions>
          <passwordForm.AppForm>
            <passwordForm.SubmitButton>
              {t('changePassword')}
            </passwordForm.SubmitButton>
          </passwordForm.AppForm>
        </FormActions>
      </FormRoot>
    </div>
  )
}
