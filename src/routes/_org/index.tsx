import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowUpRight,
  CircleDollarSign,
  ClipboardList,
  Hourglass,
  ReceiptText,
} from 'lucide-react'
import { useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import {
  type DashboardPeriod,
  useDashboardData,
} from '#/features/dashboard/hooks'
import { getReadyForProductionLabel } from '#/features/production/ready-for-production-label'
import { formatCurrency, formatNumber } from '#/lib/formatters'
import { EmptyCardState } from './-dashboard/empty-card-state'
import { KpiCard } from './-dashboard/kpi-card'
import { KpiCardSkeleton } from './-dashboard/kpi-card-skeleton'
import { RecentOrdersCard } from './-dashboard/recent-orders-card'
import { RevenueChartSection } from './-dashboard/revenue-chart-section'
import { TaskStageList } from './-dashboard/task-stage-list'

export const Route = createFileRoute('/_org/')({
  beforeLoad: () => ({
    breadcrumb: 'dashboard',
    pageTitle: 'dashboard',
  }),
  component: OrgDashboard,
})

function OrgDashboard() {
  const locale = useLocale()
  const t = useTranslations('dashboard')
  const pt = useTranslations('production')
  const ot = useTranslations('orders')
  const [period, setPeriod] = useState<DashboardPeriod>('thisMonth')
  const { data, isLoading } = useDashboardData(period)

  const periodLabels: Record<DashboardPeriod, string> = {
    '7d': t('period.7d'),
    '30d': t('period.30d'),
    thisMonth: t('period.thisMonth'),
    lastMonth: t('period.lastMonth'),
  }

  const totalTasks =
    data?.taskStages.reduce((sum, item) => sum + item.count, 0) ?? 0
  const firstProductionStageName = data?.taskStages.find(
    (item) => item.board === 'production' && item.id !== 'done',
  )?.name
  const readyForProductionLabel = getReadyForProductionLabel({
    firstProductionStageName,
    readyForProduction: pt('readyForProduction'),
    readyForProductionWithStage: (values) =>
      pt('readyForProductionQueue', values),
  })

  return (
    <PageContent className="max-w-7xl">
      <PageHeader title={t('title')} description={t('description')} />

      <div className="flex flex-wrap gap-2">
        {(Object.keys(periodLabels) as DashboardPeriod[]).map((value) => (
          <Button
            key={value}
            variant={period === value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod(value)}
          >
            {periodLabels[value]}
          </Button>
        ))}
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isLoading || !data ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              title={t('kpi.revenue')}
              description={t('kpi.revenueDesc')}
              value={formatCurrency(data.metrics.totalRevenue, locale)}
              icon={CircleDollarSign}
              trend={data.metrics.revenueTrend}
              comparisonLabel={t('trend.vsPreviousPeriod')}
            />
            <KpiCard
              title={t('kpi.orders')}
              description={t('kpi.ordersDesc')}
              value={formatNumber(data.metrics.totalOrders, locale)}
              icon={ClipboardList}
              trend={data.metrics.ordersTrend}
              comparisonLabel={t('trend.vsPreviousPeriod')}
            />
            <KpiCard
              title={t('kpi.overdueInvoices')}
              description={t('kpi.overdueInvoicesDesc')}
              value={formatNumber(data.metrics.overdueInvoices, locale)}
              icon={ReceiptText}
              badgeLabel={t('trend.live')}
            />
            <KpiCard
              title={t('kpi.pendingApprovals')}
              description={t('kpi.pendingApprovalsDesc')}
              value={formatNumber(data.metrics.pendingApprovals, locale)}
              icon={Hourglass}
              badgeLabel={t('trend.live')}
            />
          </>
        )}
      </section>

      <RevenueChartSection
        isLoading={isLoading}
        data={data}
        periodLabel={periodLabels[period]}
        locale={locale}
        revenueTitle={t('sections.revenue')}
        revenueDescription={t('sections.revenueDesc')}
        revenueTrendLabels={{
          up: t('trend.up'),
          down: t('trend.down'),
          noChange: t('trend.noChange'),
        }}
        emptyLabel={t('emptyRevenue')}
      />

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{t('sections.taskStages')}</CardTitle>
              <CardDescription>{t('sections.taskStagesDesc')}</CardDescription>
            </div>
            <div className="flex items-center gap-2 self-start">
              {!isLoading && data ? (
                <Badge variant="secondary">
                  {formatNumber(totalTasks, locale)} {t('taskCountSuffix')}
                </Badge>
              ) : null}
              <Button variant="ghost" size="sm" asChild>
                <Link to="/production">
                  {t('viewAll')}
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((item) => (
                  <Skeleton key={item} className="h-12 w-full" />
                ))}
              </div>
            ) : data.taskStages.length === 0 ? (
              <EmptyCardState label={t('emptyTaskStages')} />
            ) : (
              <TaskStageList
                items={data.taskStages}
                locale={locale}
                queueLabel={pt('queue')}
                readyForProductionLabel={readyForProductionLabel}
                doneLabel={pt('done')}
              />
            )}
          </CardContent>
        </Card>

        <RecentOrdersCard
          isLoading={isLoading}
          orders={data?.recentOrders}
          locale={locale}
          title={t('sections.recentOrders')}
          description={t('sections.recentOrdersDesc')}
          viewAllLabel={t('viewAll')}
          emptyLabel={t('noRecentOrders')}
          orderFallbackLabel={t('orderFallback')}
          guestCustomerLabel={ot('guestCustomer')}
        />
      </section>
    </PageContent>
  )
}
