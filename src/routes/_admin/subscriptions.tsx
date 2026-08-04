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
import { orgStatusBadgeVariant } from '#/features/admin/badge-variants'
import { useAdminSubscriptions } from '#/features/admin/hooks'
import { formatLongDate } from '#/lib/formatters'

export const Route = createFileRoute('/_admin/subscriptions')({
  component: SubscriptionsPage,
})

function SubscriptionsPage() {
  const t = useTranslations('admin')
  const locale = useLocale()
  const { data, isLoading } = useAdminSubscriptions()

  return (
    <PageContent>
      <PageHeader title={t('subscriptions')} />
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => i).map((id) => (
                <Skeleton key={id} className="h-12 w-full" />
              ))}
            </div>
          ) : data && data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('organization')}</TableHead>
                  <TableHead>{t('planName')}</TableHead>
                  <TableHead>{t('version')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('billingCadence')}</TableHead>
                  <TableHead>{t('trialEnds')}</TableHead>
                  <TableHead>{t('periodEnds')}</TableHead>
                  <TableHead>{t('created')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {subscription.orgName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {subscription.orgSlug}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div>{subscription.planName}</div>
                        <div className="text-xs text-muted-foreground">
                          {subscription.planSlug}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>v{subscription.planVersion}</TableCell>
                    <TableCell>
                      <Badge
                        variant={orgStatusBadgeVariant(subscription.status)}
                      >
                        {subscription.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {subscription.billingCadence}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {subscription.trialEndsAt
                        ? formatLongDate(subscription.trialEndsAt, locale)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {subscription.currentPeriodEndsAt
                        ? formatLongDate(
                            subscription.currentPeriodEndsAt,
                            locale,
                          )
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatLongDate(subscription.createdAt, locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              {t('noSubscriptions')}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContent>
  )
}
