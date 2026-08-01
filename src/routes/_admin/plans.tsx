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
import { orgStatusBadgeVariant } from '#/features/admin/badge-variants'
import { useAdminSubscriptions, usePlans } from '#/features/admin/hooks'
import { formatLongDate, formatNumber } from '#/lib/formatters'
import { CreatePlanDialog } from './-create-plan-dialog'

export const Route = createFileRoute('/_admin/plans')({
  component: PlansPage,
})

function PlansPage() {
  const t = useTranslations('admin')
  const locale = useLocale()
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const { data: plans, isLoading } = usePlans()
  const { data: subscriptions } = useAdminSubscriptions()

  return (
    <PageContent>
      <PageHeader title={t('plans')}>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>{t('createPlan')}</Button>
          </DialogTrigger>
          <CreatePlanDialog onClose={() => setShowCreateDialog(false)} />
        </Dialog>
      </PageHeader>
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => i).map((id) => (
                <Skeleton key={id} className="h-12 w-full" />
              ))}
            </div>
          ) : plans && plans.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('planName')}</TableHead>
                  <TableHead>{t('version')}</TableHead>
                  <TableHead>{t('subscribers')}</TableHead>
                  <TableHead>{t('monthlyPrice')}</TableHead>
                  <TableHead>{t('annualPrice')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('created')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{plan.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {plan.slug}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>v{plan.version}</TableCell>
                    <TableCell>{plan.subscriberCount}</TableCell>
                    <TableCell>
                      Rp {formatNumber(plan.monthlyPriceCents, locale)}
                    </TableCell>
                    <TableCell>
                      Rp {formatNumber(plan.annualPriceCents, locale)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={plan.active ? 'success' : 'secondary'}>
                        {plan.active ? t('active') : t('inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatLongDate(plan.createdAt.toISOString(), locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              {t('noPlans')}
            </div>
          )}
        </CardContent>
      </Card>

      <PageHeader title={t('subscriptions')} className="mt-8" />
      <Card>
        <CardContent className="pt-6">
          {subscriptions && subscriptions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('orgName')}</TableHead>
                  <TableHead>{t('plan')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('billingCadence')}</TableHead>
                  <TableHead>{t('trialEnds')}</TableHead>
                  <TableHead>{t('periodEnds')}</TableHead>
                  <TableHead>{t('created')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{sub.orgName}</div>
                        <div className="text-xs text-muted-foreground">
                          {sub.orgSlug}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {sub.planName} v{sub.planVersion}
                    </TableCell>
                    <TableCell>
                      <Badge variant={orgStatusBadgeVariant(sub.status)}>
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{sub.billingCadence}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sub.trialEndsAt
                        ? formatLongDate(sub.trialEndsAt, locale)
                        : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sub.currentPeriodEndsAt
                        ? formatLongDate(sub.currentPeriodEndsAt, locale)
                        : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatLongDate(sub.createdAt, locale)}
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
