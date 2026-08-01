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
import { BILLING_EVENT_TYPES } from '#/db/schema'
import { useAdminBillingEvents } from '#/features/admin/hooks'
import { formatLongDate } from '#/lib/formatters'

export const Route = createFileRoute('/_admin/billing-events')({
  component: BillingEventsPage,
})

function BillingEventsPage() {
  const t = useTranslations('admin')
  const locale = useLocale()
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('')
  const [page, setPage] = useState(0)
  const pageSize = 50

  const { data, isLoading } = useAdminBillingEvents({
    limit: pageSize,
    offset: page * pageSize,
    eventType: eventTypeFilter || undefined,
  })

  return (
    <PageContent>
      <PageHeader title={t('billingEvents')} />
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex gap-4 items-center">
            <Select
              value={eventTypeFilter}
              onValueChange={(value) => {
                setEventTypeFilter(value)
                setPage(0)
              }}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder={t('billingEventType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('allActions')}</SelectItem>
                {BILLING_EVENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
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
                    <TableHead>{t('billingEventType')}</TableHead>
                    <TableHead>{t('organization')}</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>{t('timestamp')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="font-mono text-xs"
                        >
                          {event.eventType}
                        </Badge>
                      </TableCell>
                      <TableCell>{event.orgName ?? '-'}</TableCell>
                      <TableCell className="text-sm">
                        {event.previousStatus || event.newStatus ? (
                          <span className="font-mono text-xs">
                            {event.previousStatus ?? '-'} &rarr;{' '}
                            {event.newStatus ?? '-'}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatLongDate(event.createdAt, locale)}
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
              {t('noData')}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContent>
  )
}
