import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowUpRight,
  CircleDollarSign,
  ClipboardList,
  Hourglass,
  ReceiptText,
} from 'lucide-react'
import { useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'
import { useLocale, useTranslations } from 'use-intl'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { StatusBadge } from '#/components/status-badge'
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
import {
  formatCurrency,
  formatLongDate,
  formatNumber,
  formatShortDate,
} from '#/lib/formatters'
import { EmptyCardState } from './-dashboard/empty-card-state'
import { KpiCard } from './-dashboard/kpi-card'
import { KpiCardSkeleton } from './-dashboard/kpi-card-skeleton'
import { RevenueTooltip } from './-dashboard/revenue-tooltip'
import { TaskStageList } from './-dashboard/task-stage-list'
import { TrendBadge } from './-dashboard/trend-badge'

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

  const hasRevenue =
    data?.revenueSeries.some((point) => Number(point.revenue) > 0) ?? false
  const totalTasks =
    data?.taskStages.reduce((sum, item) => sum + item.count, 0) ?? 0

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

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div>
              <CardTitle>{t('sections.revenue')}</CardTitle>
              <CardDescription>{t('sections.revenueDesc')}</CardDescription>
            </div>
            {!isLoading && data ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-2xl font-semibold tracking-tight">
                  {formatCurrency(data.metrics.totalRevenue, locale)}
                </p>
                <TrendBadge
                  trend={data.metrics.revenueTrend}
                  positiveLabel={t('trend.up')}
                  negativeLabel={t('trend.down')}
                  neutralLabel={t('trend.noChange')}
                />
              </div>
            ) : null}
          </div>
          <Badge variant="secondary">{periodLabels[period]}</Badge>
        </CardHeader>
        <CardContent className="pt-2">
          {isLoading || !data ? (
            <Skeleton className="h-80 w-full" />
          ) : hasRevenue ? (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.revenueSeries}
                  margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="dashboard-revenue-fill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--color-chart-1)"
                        stopOpacity={0.28}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-chart-1)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    minTickGap={24}
                    tickFormatter={(value) => formatShortDate(value, locale)}
                  />
                  <Tooltip
                    cursor={false}
                    content={
                      <RevenueTooltip
                        locale={locale}
                        seriesLabel={t('sections.revenue')}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2.5}
                    fill="url(#dashboard-revenue-fill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyCardState label={t('emptyRevenue')} />
          )}
        </CardContent>
      </Card>

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
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{t('sections.recentOrders')}</CardTitle>
              <CardDescription>
                {t('sections.recentOrdersDesc')}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/orders">
                {t('viewAll')}
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((item) => (
                  <Skeleton key={item} className="h-16 w-full" />
                ))}
              </div>
            ) : data.recentOrders.length === 0 ? (
              <EmptyCardState label={t('noRecentOrders')} />
            ) : (
              <div className="space-y-3">
                {data.recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    to="/orders/$id"
                    params={{ id: order.id }}
                    className="block rounded-xl border p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium">
                            {order.orderNumber ?? t('orderFallback')}
                          </p>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="truncate text-sm text-muted-foreground">
                          {order.customerName ?? ot('guestCustomer')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatLongDate(
                            order.createdAt.toISOString(),
                            locale,
                          )}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold">
                        {formatCurrency(order.total, locale)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </PageContent>
  )
}
