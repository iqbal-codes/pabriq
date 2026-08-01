import { Link } from '@tanstack/react-router'
import { AlertTriangle, Settings2 } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Progress } from '#/components/ui/progress'
import { Skeleton } from '#/components/ui/skeleton'
import type { SubscriptionWithUsage } from '#/features/dashboard/server'
import { formatNumber } from '#/lib/formatters'
import { cn } from '#/lib/utils'

const RESOURCE_LABELS = ['orders', 'products', 'customers', 'members'] as const
type ResourceLabel = (typeof RESOURCE_LABELS)[number]

function getUsagePercent(current: number, limit: number | null): number | null {
  if (limit === null) return null
  if (limit === 0) return 0
  return Math.min(Math.round((current / limit) * 100), 100)
}

function getLimitVariant(
  pct: number | null,
): 'success' | 'warning' | 'destructive' {
  if (pct === null) return 'success'
  if (pct >= 100) return 'destructive'
  if (pct >= 80) return 'warning'
  return 'success'
}

export function SubscriptionLimitCard({
  data,
  isLoading,
}: {
  data: SubscriptionWithUsage | undefined
  isLoading: boolean
}) {
  const t = useTranslations('admin')
  const st = useTranslations('sidebar')

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {RESOURCE_LABELS.map((r) => (
            <Skeleton key={r} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!data?.subscription) {
    return null
  }

  const { subscription, usage } = data
  const entitlements = subscription.plan.entitlements

  const resources: Array<{
    key: ResourceLabel
    current: number
    limit: number | null
    pct: number | null
  }> = [
    {
      key: 'orders',
      current: usage.orders,
      limit: entitlements.maxOrders,
      pct: getUsagePercent(usage.orders, entitlements.maxOrders),
    },
    {
      key: 'products',
      current: usage.products,
      limit: entitlements.maxProducts,
      pct: getUsagePercent(usage.products, entitlements.maxProducts),
    },
    {
      key: 'customers',
      current: usage.customers,
      limit: entitlements.maxCustomers,
      pct: getUsagePercent(usage.customers, entitlements.maxCustomers),
    },
    {
      key: 'members',
      current: usage.members,
      limit: entitlements.maxMembers,
      pct: getUsagePercent(usage.members, entitlements.maxMembers),
    },
  ]

  const atLimit = resources.some((r) => r.pct !== null && r.pct >= 100)
  const approachingLimit = resources.some(
    (r) => r.pct !== null && r.pct >= 80 && r.pct < 100,
  )
  const showWarning = atLimit || approachingLimit

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium">
            {t('subscriptionLimit')}
          </CardTitle>
          <CardDescription>
            {t('subscriptionPlan')}: {subscription.plan.name} v
            {subscription.plan.version}
            {showWarning ? (
              <Badge
                variant={atLimit ? 'destructive' : 'warning'}
                className="ml-2"
              >
                <AlertTriangle className="mr-1 size-3" />
                {atLimit ? t('atLimit') : t('approachingLimit')}
              </Badge>
            ) : null}
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/settings">
            <Settings2 className="size-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {resources.map((r) => {
          const variant = getLimitVariant(r.pct)
          return (
            <div key={r.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {r.key === 'members' ? 'Members' : st(r.key)}
                </span>
                <span>
                  {formatNumber(r.current, 'en')}
                  {r.limit !== null ? (
                    <>
                      {' '}
                      {t('of')} {formatNumber(r.limit, 'en')} {t('used')}
                    </>
                  ) : (
                    <> {t('used')}</>
                  )}
                </span>
              </div>
              {r.limit !== null ? (
                <Progress
                  value={r.pct ?? 0}
                  className={cn(
                    'h-2',
                    variant === 'destructive' && 'text-destructive',
                    variant === 'warning' && 'text-amber-500',
                    variant === 'success' && 'text-emerald-500',
                  )}
                />
              ) : (
                <Progress value={0} className="h-2" />
              )}
            </div>
          )
        })}
        {showWarning ? (
          <p className="pt-1 text-xs text-muted-foreground">
            {t('upgradePrompt')}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
