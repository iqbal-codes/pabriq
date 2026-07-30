import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { useAuditEvents } from '#/features/admin/hooks'
import { formatLongDate } from '#/lib/formatters'

const ACTION_TYPES = [
  'organization.created',
  'organization.updated',
  'organization.suspended',
  'organization.restored',
  'plan.created',
  'plan.updated',
  'plan.versioned',
  'subscription.changed',
  'subscription.canceled',
  'subscription.suspended',
  'subscription.restored',
  'trial.started',
  'trial.extended',
  'exception.granted',
  'exception.revoked',
  'retention.applied',
  'export.created',
  'migration.reviewed',
  'migration.accepted',
  'member.role_changed',
  'admin.action',
] as const

export const Route = createFileRoute('/_admin/audit')({
  component: AuditLogPage,
})

function AuditLogPage() {
  const t = useTranslations('admin')
  const locale = useLocale()
  const [actionFilter, setActionFilter] = useState<string>('')
  const [page, setPage] = useState(0)
  const pageSize = 50

  const { data, isLoading } = useAuditEvents({
    limit: pageSize,
    offset: page * pageSize,
    action: actionFilter || undefined,
  })

  return (
    <PageContent>
      <PageHeader title={t('auditLog')} />
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex gap-4 items-center">
            <Select
              value={actionFilter}
              onValueChange={(value) => {
                setActionFilter(value)
                setPage(0)
              }}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder={t('allActions')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('allActions')}</SelectItem>
                {ACTION_TYPES.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => i).map((id) => (
                <Skeleton key={id} className="h-12 w-full" />
              ))}
            </div>
          ) : data && data.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('timestamp')}</TableHead>
                    <TableHead>{t('actor')}</TableHead>
                    <TableHead>{t('action')}</TableHead>
                    <TableHead>{t('organization')}</TableHead>
                    <TableHead>{t('reason')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatLongDate(event.createdAt, locale)}
                      </TableCell>
                      <TableCell>{event.actorName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {event.action}
                        </Badge>
                      </TableCell>
                      <TableCell>{event.organizationName ?? '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                        {event.reason ?? '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  {t('previous')}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t('page', { page: page + 1 })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data || data.length < pageSize}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t('next')}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              {t('noAuditEvents')}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContent>
  )
}
