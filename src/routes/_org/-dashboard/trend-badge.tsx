import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { Badge } from '#/components/ui/badge'

export function TrendBadge({
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
