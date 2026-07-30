import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  useGrantPlatformAdmin,
  usePlatformAdmins,
  useRevokePlatformAdmin,
} from '#/features/admin/hooks'
import { formatLongDate } from '#/lib/formatters'

export const Route = createFileRoute('/_admin/admins')({
  component: PlatformAdminsPage,
})

function PlatformAdminsPage() {
  const t = useTranslations('admin')
  const { data: admins, isLoading } = usePlatformAdmins()
  const [showGrantDialog, setShowGrantDialog] = useState(false)

  return (
    <PageContent>
      <PageHeader title={t('platformAdmins')}>
        <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
          <DialogTrigger asChild>
            <Button>{t('grantAdmin')}</Button>
          </DialogTrigger>
          <GrantAdminDialog onClose={() => setShowGrantDialog(false)} />
        </Dialog>
      </PageHeader>
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, i) => i).map((id) => (
                <Skeleton key={id} className="h-12 w-full" />
              ))}
            </div>
          ) : admins && admins.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('userName')}</TableHead>
                  <TableHead>{t('email')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('grantedAt')}</TableHead>
                  <TableHead>{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.userId}>
                    <TableCell className="font-medium">
                      {admin.userName}
                    </TableCell>
                    <TableCell>{admin.userEmail}</TableCell>
                    <TableCell>
                      <Badge variant={admin.isActive ? 'success' : 'secondary'}>
                        {admin.isActive ? t('active') : t('revoked')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatLongDate(admin.grantedAt, 'en')}
                    </TableCell>
                    <TableCell>
                      {admin.isActive && (
                        <RevokeAdminButton userId={admin.userId} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              {t('noAdmins')}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContent>
  )
}

function RevokeAdminButton({ userId }: { userId: string }) {
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

function GrantAdminDialog({ onClose }: { onClose: () => void }) {
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
