import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'
import { Badge } from '#/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import type { DashboardData } from '#/features/dashboard/hooks'
import { formatCurrency, formatShortDate } from '#/lib/formatters'
import { EmptyCardState } from './empty-card-state'
import { RevenueTooltip } from './revenue-tooltip'
import { TrendBadge } from './trend-badge'

export function RevenueChartSection({
  isLoading,
  data,
  periodLabel,
  locale,
  revenueTitle,
  revenueDescription,
  revenueTrendLabels,
  emptyLabel,
}: {
  isLoading: boolean
  data: DashboardData | undefined
  periodLabel: string
  locale: string
  revenueTitle: string
  revenueDescription: string
  revenueTrendLabels: { up: string; down: string; noChange: string }
  emptyLabel: string
}) {
  const hasRevenue =
    data?.revenueSeries.some((point) => Number(point.revenue) > 0) ?? false

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div>
            <CardTitle>{revenueTitle}</CardTitle>
            <CardDescription>{revenueDescription}</CardDescription>
          </div>
          {!isLoading && data ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-2xl font-semibold tracking-tight">
                {formatCurrency(data.metrics.totalRevenue, locale)}
              </p>
              <TrendBadge
                trend={data.metrics.revenueTrend}
                positiveLabel={revenueTrendLabels.up}
                negativeLabel={revenueTrendLabels.down}
                neutralLabel={revenueTrendLabels.noChange}
              />
            </div>
          ) : null}
        </div>
        <Badge variant="secondary">{periodLabel}</Badge>
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
                      seriesLabel={revenueTitle}
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
          <EmptyCardState label={emptyLabel} />
        )}
      </CardContent>
    </Card>
  )
}
