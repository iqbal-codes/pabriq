import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { Dialog, DialogTrigger } from '#/components/ui/dialog'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { usePlatformAdmins } from '#/features/admin/hooks'
import { formatLongDate } from '#/lib/formatters'
import { GrantAdminDialog } from './-grant-admin-dialog'
import { RevokeAdminButton } from './-revoke-admin-button'

export const Route = createFileRoute('/_admin/admins')({
  component: PlatformAdminsPage,
})

function PlatformAdminsPage() {
  const t = useTranslations('admin')
  const locale = useLocale()
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
                      {formatLongDate(admin.grantedAt, locale)}
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
