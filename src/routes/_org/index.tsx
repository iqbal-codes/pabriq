import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowUpRight,
  CircleDollarSign,
  ClipboardList,
  Hourglass,
  Minus,
  ReceiptText,
  TrendingDown,
  TrendingUp,
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
import type { TaskStageCount } from '#/features/dashboard/model'
import { cn } from '#/lib/utils'

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

function KpiCard({
  title,
  description,
  value,
  icon: Icon,
  trend,
  badgeLabel,
  comparisonLabel,
}: {
  title: string
  description: string
  value: string
  icon: typeof CircleDollarSign
  trend?: { current: number; previous: number; changePercent: number | null }
  badgeLabel?: string
  comparisonLabel?: string
}) {
  const t = useTranslations('dashboard')

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardDescription>{title}</CardDescription>
          <CardTitle className="text-2xl tracking-tight">{value}</CardTitle>
        </div>
        <div className="rounded-lg border bg-muted/40 p-2 text-muted-foreground">
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {trend ? (
          <div className="flex items-center gap-2">
            <TrendBadge
              trend={trend}
              positiveLabel={t('trend.up')}
              negativeLabel={t('trend.down')}
              neutralLabel={t('trend.noChange')}
              compact
            />
            {comparisonLabel ? (
              <span className="text-xs text-muted-foreground">
                {comparisonLabel}
              </span>
            ) : null}
          </div>
        ) : badgeLabel ? (
          <Badge variant="secondary" className="w-fit">
            {badgeLabel}
          </Badge>
        ) : null}
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function TrendBadge({
  trend,
  positiveLabel,
  negativeLabel,
  neutralLabel,
  compact = false,
}: {
  trend: { current: number; previous: number; changePercent: number | null }
  positiveLabel: string
  negativeLabel: string
  neutralLabel: string
  compact?: boolean
}) {
  const value = trend.changePercent

  if (value === null) {
    return (
      <Badge variant="secondary" className="gap-1">
        <TrendingUp className="size-3.5" />
        {positiveLabel}
      </Badge>
    )
  }

  const rounded = Math.abs(value).toFixed(1)

  if (value > 0) {
    return (
      <Badge variant="success" className="gap-1">
        <TrendingUp className="size-3.5" />
        {compact ? `+${rounded}%` : `${positiveLabel} ${rounded}%`}
      </Badge>
    )
  }

  if (value < 0) {
    return (
      <Badge variant="destructive" className="gap-1">
        <TrendingDown className="size-3.5" />
        {compact ? `-${rounded}%` : `${negativeLabel} ${rounded}%`}
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" className="gap-1">
      <Minus className="size-3.5" />
      {compact ? '0%' : neutralLabel}
    </Badge>
  )
}

function RevenueTooltip({
  active,
  payload,
  label,
  locale,
  seriesLabel,
}: {
  active?: boolean
  payload?: Array<{ value?: number }>
  label?: string
  locale: string
  seriesLabel: string
}) {
  if (!active || !payload?.length || !label) {
    return null
  }

  return (
    <div className="min-w-44 rounded-xl border bg-card px-3 py-2 shadow-sm">
      <p className="text-xs text-muted-foreground">
        {formatLongDate(label, locale)}
      </p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="size-2 rounded-full bg-(--color-chart-1)" />
          <span>{seriesLabel}</span>
        </div>
        <span className="text-sm font-semibold">
          {formatCurrency(Number(payload[0]?.value ?? 0), locale)}
        </span>
      </div>
    </div>
  )
}

function KpiCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-8 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-40" />
      </CardContent>
    </Card>
  )
}

function TaskStageList({
  items,
  queueLabel,
  locale,
}: {
  items: TaskStageCount[]
  queueLabel: string
  locale: string
}) {
  const maxCount = Math.max(...items.map((item) => item.count), 1)

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const label = item.id === 'queue' ? queueLabel : item.name
        const width = `${Math.max((item.count / maxCount) * 100, item.count > 0 ? 8 : 0)}%`
        const barColor =
          item.id === 'queue'
            ? 'bg-slate-500'
            : item.board === 'pre_production'
              ? 'bg-sky-600'
              : 'bg-amber-600'

        return (
          <div key={item.id} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <p className="truncate font-medium">{label}</p>
              <Badge variant="secondary">
                {formatNumber(item.count, locale)}
              </Badge>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className={cn('h-2 rounded-full transition-all', barColor)}
                style={{ width }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EmptyCardState({ label }: { label: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
      {label}
    </div>
  )
}

function formatCurrency(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value)
}

function formatShortDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function formatLongDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}
