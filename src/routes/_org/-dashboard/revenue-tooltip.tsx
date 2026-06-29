import { formatCurrency, formatLongDate } from '#/lib/formatters'

export function RevenueTooltip({
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
