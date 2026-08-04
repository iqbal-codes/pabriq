import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import {
  FormActions,
  FormGrid,
  FormRoot,
  useAppForm,
} from '#/components/app/form'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { useInviteMember } from '#/features/members/hooks'
import type { InviteMemberRole } from '#/features/members/model'

const BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://app.pabriq.com'
    : 'http://localhost:3001'

export function InviteMemberDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations('members')
  const ct = useTranslations('common')
  const inviteMember = useInviteMember()

  const form = useAppForm({
    defaultValues: { email: '', role: 'member' as InviteMemberRole },
    onSubmit: async ({ value }) => {
      const result = await inviteMember.mutateAsync({
        email: value.email,
        role: value.role,
      })
      if (result.ok && result.mode === 'operator-account') {
        const credentials = `${t('email')}: ${result.email}\n${t('defaultPassword')}: ${result.password}`
        onOpenChange(false)
        form.reset()
        try {
          await navigator.clipboard.writeText(credentials)
          toast.success(t('operatorCredentialsCopied'))
        } catch {
          toast.success(
            t('operatorAccountCreated', {
              email: result.email,
              password: result.password,
            }),
          )
        }
      } else if (result.ok) {
        const inviteUrl = `${BASE_URL}/invite/accept?id=${result.invitationId}`
        onOpenChange(false)
        form.reset()
        try {
          await navigator.clipboard.writeText(inviteUrl)
          toast.success(t('inviteLinkCopied'))
        } catch {
          toast.success(t('inviteSent'))
        }
      } else {
        toast.error(result.error)
      }
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('invite')}</DialogTitle>
          <DialogDescription>{t('inviteDesc')}</DialogDescription>
        </DialogHeader>
        <FormRoot form={form}>
          <FormGrid columns={1}>
            <form.AppField name="email">
              {(field) => <field.EmailField label={t('email')} />}
            </form.AppField>
            <form.AppField name="role">
              {(field) => (
                <field.SelectField
                  label={t('role')}
                  options={[
                    { value: 'admin', label: t('adminRole') },
                    { value: 'member', label: t('memberRole') },
                    { value: 'operator', label: t('operatorRole') },
                  ]}
                />
              )}
            </form.AppField>
          </FormGrid>
          <FormActions>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {ct('cancel')}
            </Button>
            <form.AppForm>
              <form.SubmitButton isPending={inviteMember.isPending}>
                {t('invite')}
              </form.SubmitButton>
            </form.AppForm>
          </FormActions>
        </FormRoot>
      </DialogContent>
    </Dialog>
  )
}
