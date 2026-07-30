import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { useGrantPlatformAdmin } from '#/features/admin/hooks'

export function GrantAdminDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations('admin')
  const grantMutation = useGrantPlatformAdmin()
  const [email, setEmail] = useState('')

  const handleGrant = async () => {
    const result = await grantMutation.mutateAsync({ email })
    if (result.ok) {
      toast.success(t('adminGranted'))
      onClose()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t('grantAdmin')}</DialogTitle>
        <DialogDescription>{t('grantAdminDesc')}</DialogDescription>
      </DialogHeader>
      <Input
        type="email"
        placeholder={t('emailPlaceholder')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button
          onClick={handleGrant}
          disabled={!email.trim() || grantMutation.isPending}
        >
          {t('grant')}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
