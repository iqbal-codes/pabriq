import { createFileRoute } from '@tanstack/react-router'
import { useLocale, useTranslations } from 'use-intl'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { useAdminMigrations } from '#/features/admin/hooks'
import { formatLongDate } from '#/lib/formatters'

export const Route = createFileRoute('/_admin/migrations')({
  component: MigrationsPage,
})

function MigrationsPage() {
  const t = useTranslations('admin')
  const locale = useLocale()
  const { data: migrations, isLoading } = useAdminMigrations()

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'success' as const
      case 'failed':
        return 'destructive' as const
      case 'pending_review':
        return 'warning' as const
      default:
        return 'secondary' as const
    }
  }

  return (
    <PageContent>
      <PageHeader title={t('migrations')} />
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => i).map((id) => (
                <Skeleton key={id} className="h-12 w-full" />
              ))}
            </div>
          ) : migrations && migrations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('orgName')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('reviewedBy')}</TableHead>
                  <TableHead>{t('reviewedAt')}</TableHead>
                  <TableHead>{t('failureReason')}</TableHead>
                  <TableHead>{t('created')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {migrations.map((mig) => (
                  <TableRow key={mig.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{mig.orgName}</div>
                        <div className="text-xs text-muted-foreground">
                          {mig.orgSlug}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(mig.status)}>
                        {mig.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{mig.reviewedBy ?? '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {mig.reviewedAt
                        ? formatLongDate(mig.reviewedAt, locale)
                        : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {mig.failureReason ?? '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatLongDate(mig.createdAt, locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              {t('noMigrations')}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContent>
  )
}
