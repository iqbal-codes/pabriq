import { CalendarClock, ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { AssetFileList } from '#/components/app/asset-file'
import { Badge } from '#/components/ui/badge'
import { getVisibleDesignName } from '#/features/orders/line-item-display'
import { formatCurrency, formatLongDate } from '#/lib/formatters'
import { cn } from '#/lib/utils'
import type { OrderTaskEvent, PortalLineItem } from '../model'
import { OrderTimeline } from './order-timeline'

function getItemStatus(
  events: OrderTaskEvent[],
  fallbackStageName: string | null,
  t: (key: string, params?: Record<string, string>) => string,
): string | null {
  if (events.length === 0) return fallbackStageName
  const latest = events[0]
  if (latest.type === 'completed') return t('timelineStatusCompleted')
  if (latest.type === 'board_transition' && latest.toStageName) {
    return t('timelineStatusInProgress', { stage: latest.toStageName })
  }
  if (
    (latest.type === 'stage_transition' || latest.type === 'moved_to_stage') &&
    latest.toStageName
  ) {
    return t('timelineStatusInProgress', { stage: latest.toStageName })
  }
  if (latest.type === 'created' && latest.toStageName) {
    return t('timelineStatusInProgress', { stage: latest.toStageName })
  }
  return fallbackStageName
}

type LineItemTaskCardProps = {
  item: PortalLineItem
  events: OrderTaskEvent[]
  defaultExpanded?: boolean
  token?: string
}

export function LineItemTaskCard({
  item,
  events,
  defaultExpanded = false,
  token,
}: LineItemTaskCardProps) {
  const t = useTranslations('portal')
  const locale = useLocale()

  const itemEvents = events
    .filter((e) => e.taskId === item.taskId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

  const [showTimeline, setShowTimeline] = useState(defaultExpanded)
  const timelineRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!showTimeline) return
    const node = timelineRef.current
    if (!node) return
    // Allow the panel to render, then nudge it on-screen if expanded programmatically.
    requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }, [showTimeline])

  const statusText = getItemStatus(
    itemEvents,
    item.currentStageName,
    t as (key: string, params?: Record<string, string>) => string,
  )

  const deadlineLabel = item.deadline
    ? formatLongDate(String(item.deadline), locale)
    : null

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:gap-4 sm:p-5">
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-2 text-base font-semibold leading-tight">
            {statusText ? (
              <Badge variant="secondary" className="capitalize shrink-0">
                {statusText}
              </Badge>
            ) : null}
            <span className="min-w-0 truncate">{item.productName}</span>
            {getVisibleDesignName(item.designName, item.productName) && (
              <span className="block w-full text-xs font-normal text-muted-foreground mt-1">
                {getVisibleDesignName(item.designName, item.productName)}
              </span>
            )}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            <span>{item.quantity}</span>
            {' × '}
            <span>{formatCurrency(item.unitPrice, locale)}</span>
          </p>
          {item.notes ? (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {item.notes}
            </p>
          ) : null}
        </div>
        <div className="flex flex-row items-end justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
          <span className="text-base font-semibold tabular-nums">
            {formatCurrency(item.total, locale)}
          </span>
          {item.productionDays > 0 ? (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {t('itemProductionDaysInline', { days: item.productionDays })}
            </span>
          ) : null}
        </div>
      </div>

      {(deadlineLabel || item.productionDays > 0) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground sm:px-5">
          {deadlineLabel ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-3.5" />
              {t('itemDeadlineLabel', { date: deadlineLabel })}
            </span>
          ) : null}
          {item.productionDays > 0 && deadlineLabel ? (
            <span className="hidden sm:inline" aria-hidden>
              ·
            </span>
          ) : null}
          {item.productionDays > 0 ? (
            <span className="sm:hidden">
              {t('itemProductionDaysInline', { days: item.productionDays })}
            </span>
          ) : null}
        </div>
      )}

      {item.assetIds.length > 0 ? (
        <div className="border-t border-border px-4 py-3 sm:px-5 sm:py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('itemAttachmentsLabel')}
          </p>
          <div className="mt-2">
            <AssetFileList
              assetIds={item.assetIds}
              layout="list"
              token={token}
            />
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          'grid transition-all duration-200 ease-out',
          showTimeline
            ? 'grid-rows-[1fr] border-t border-border'
            : 'grid-rows-[0fr] border-t border-transparent',
        )}
      >
        <div className="overflow-hidden">
          <div
            ref={timelineRef}
            id={`timeline-${item.id}`}
            className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5"
          >
            <OrderTimeline events={itemEvents} token={token} />
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <button
          type="button"
          onClick={() => setShowTimeline((prev) => !prev)}
          className="w-full py-3 hover:bg-muted/5 focus-visible:bg-muted/5 transition-colors focus:outline-none text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5"
          aria-expanded={showTimeline}
          aria-controls={`timeline-${item.id}`}
        >
          <span>
            {showTimeline ? t('itemHideTimeline') : t('itemShowTimeline')}
          </span>
          {showTimeline ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
        </button>
      </div>
    </article>
  )
}

// Back-compat re-export so any external caller still resolves.
export { LineItemTaskCard as default }
