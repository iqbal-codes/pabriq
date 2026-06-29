import type { LucideIcon } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { TrendBadge } from './trend-badge'

export function KpiCard({
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
  icon: LucideIcon
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
