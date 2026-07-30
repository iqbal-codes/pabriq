import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { useRevokePlatformAdmin } from '#/features/admin/hooks'

export function RevokeAdminButton({ userId }: { userId: string }) {
  const t = useTranslations('admin')
  const revokeMutation = useRevokePlatformAdmin()
  const [open, setOpen] = useState(false)

  const handleRevoke = async () => {
    const result = await revokeMutation.mutateAsync({ userId })
    if (result.ok) {
      toast.success(t('adminRevoked'))
      setOpen(false)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          {t('revoke')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('revokeAdmin')}</DialogTitle>
          <DialogDescription>{t('revokeAdminDesc')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleRevoke}
            disabled={revokeMutation.isPending}
          >
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
