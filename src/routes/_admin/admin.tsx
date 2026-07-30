import { createFileRoute } from '@tanstack/react-router'
import { useLocale, useTranslations } from 'use-intl'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { useAdminDashboardMetrics } from '#/features/admin/hooks'
import { formatNumber } from '#/lib/formatters'

export const Route = createFileRoute('/_admin/admin')({
  component: AdminDashboardPage,
})

function AdminDashboardPage() {
  const t = useTranslations('admin')
  const locale = useLocale()
  const { data, isLoading } = useAdminDashboardMetrics()

  if (isLoading) {
    return (
      <PageContent>
        <PageHeader title={t('dashboard')} />
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => i).map((id) => (
              <Card key={id}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => i).map((id) => (
              <Card key={id}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </PageContent>
    )
  }

  if (!data) {
    return (
      <PageContent>
        <PageHeader title={t('dashboard')} />
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          {t('noData')}
        </div>
      </PageContent>
    )
  }

  return (
    <PageContent>
      <PageHeader title={t('dashboard')} />

      {/* Top row: 3 headline metrics */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <MetricCard
          title={t('totalOrganizations')}
          value={formatNumber(data.totalOrganizations, locale)}
          badge={t('active')}
          badgeVariant="success"
        />
        <MetricCard
          title={t('activeSubscriptions')}
          value={formatNumber(data.activeSubscriptions, locale)}
          badge={`${formatNumber(data.trialingOrgs, locale)} ${t('trialingOrgs')}`}
          badgeVariant="warning"
        />
        <MetricCard
          title={t('pendingMigrations')}
          value={formatNumber(data.pendingMigrations, locale)}
          badge={data.pendingMigrations > 0 ? t('needsAttention') : t('none')}
          badgeVariant={
            data.pendingMigrations > 0 ? 'destructive' : 'secondary'
          }
        />
      </div>

      {/* Middle row: Production health + Quality */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {t('productionBottlenecks')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">
              {formatNumber(data.productionBottleneckCount, locale)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('ordersThisMonth')}:{' '}
              {formatNumber(data.totalOrdersThisMonth, locale)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {t('qualityHolds')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {formatNumber(data.qualityHoldsCount, locale)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('recentSignups')}: {formatNumber(data.recentSignups, locale)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Financial summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            {t('unpaidInvoicesTotal')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            Rp {formatNumber(data.unpaidInvoicesTotal, locale)}
          </div>
        </CardContent>
      </Card>
    </PageContent>
  )
}

function MetricCard({
  title,
  value,
  badge,
  badgeVariant,
}: {
  title: string
  value: string
  badge?: string
  badgeVariant?: 'success' | 'warning' | 'destructive' | 'secondary'
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-3xl font-bold">{value}</div>
          {badge && badgeVariant && (
            <Badge variant={badgeVariant}>{badge}</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
