import { useQuery } from '@tanstack/react-query'
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Package,
  Settings2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'use-intl'
import { AssetFileList } from '#/components/app/asset-file'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { getVisibleDesignName } from '#/features/orders/line-item-display'
import { getAssetsForLineItemFn } from '#/features/orders/server'
import { OrderTimeline } from '#/features/portal/components/order-timeline'
import type { OrderTaskEvent } from '#/features/portal/model'
import {
  useOrderTasksTimeline,
  useStages,
  useTaskByLineItemId,
} from '#/features/production/hooks'
import { getReadyForProductionLabel } from '#/features/production/ready-for-production-label'
import { cn } from '#/lib/utils'
import { currencyFormatter, dateFormatter } from './view-order-utils'

function LineItemRow({
  item,
  orgId,
  orderId,
  timelineEvents,
  firstProductionStageName,
  onAdjustQuantity,
}: {
  item: {
    id: string
    productId: string
    productName: string
    designName: string | null
    notes: string | null
    quantity: number
    unitPrice: number
    total: number
    deadline: Date
    productionDays: number
  }
  orgId: string
  orderId: string
  timelineEvents: OrderTaskEvent[]
  firstProductionStageName: string | undefined
  onAdjustQuantity?: (lineItemId: string) => void
}) {
  const { data: assets } = useQuery({
    queryKey: ['line-item-assets', item.id],
    queryFn: () =>
      getAssetsForLineItemFn({ data: { lineItemId: item.id, orgId } }),
  })
  const t = useTranslations('production')
  const pt = useTranslations('portal')
  const ot = useTranslations('orders')
  const task = useTaskByLineItemId(item.id, orderId)
  const [showTimeline, setShowTimeline] = useState(false)
  const timelineRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!showTimeline) return
    const node = timelineRef.current
    if (!node) return
    requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }, [showTimeline])

  const visibleDesign = getVisibleDesignName(item.designName, item.productName)
  const itemEvents = task
    ? timelineEvents.filter((e) => e.taskId === task.task.id)
    : []

  const deadlineLabel = item.deadline
    ? dateFormatter.format(item.deadline)
    : null

  const stageName = task?.stage?.name ?? null

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      {/* Main content */}
      <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:gap-4 sm:p-5">
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-2 text-base font-semibold leading-tight">
            <span className="min-w-0 truncate">{item.productName}</span>
            {task && (
              <Badge
                variant="secondary"
                className="shrink-0 text-[11px] capitalize"
              >
                {stageName ??
                  (task.task.status === 'ready_for_production'
                    ? getReadyForProductionLabel({
                        firstProductionStageName,
                        readyForProduction: t('readyForProduction'),
                        readyForProductionWithStage: (values) =>
                          t('readyForProductionQueue', values),
                      })
                    : t(
                        task.task.status === 'queued'
                          ? 'statusQueued'
                          : task.task.status === 'completed'
                            ? 'statusCompleted'
                            : 'statusInProgress',
                      ))}
              </Badge>
            )}
            {visibleDesign && (
              <span className="block w-full text-xs font-normal text-muted-foreground mt-0.5">
                {visibleDesign}
              </span>
            )}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground tabular-nums">
              {item.quantity} &times; {currencyFormatter.format(item.unitPrice)}
            </span>
            {onAdjustQuantity && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[11px] font-medium"
                onClick={() => onAdjustQuantity(item.id)}
              >
                <Settings2 className="mr-1 size-3" />
                {ot('adjustQuantity')}
              </Button>
            )}
          </div>
          {item.notes && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {item.notes}
            </p>
          )}
        </div>
        <div className="flex flex-row items-end justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
          <span className="text-base font-semibold tabular-nums">
            {currencyFormatter.format(item.total)}
          </span>
          {item.productionDays > 0 ? (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {pt('itemProductionDaysInline', { days: item.productionDays })}
            </span>
          ) : null}
        </div>
      </div>

      {/* Deadline / production days footer */}
      {(deadlineLabel || item.productionDays > 0) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground sm:px-5">
          {deadlineLabel && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-3.5" />
              {pt('itemDeadlineLabel', { date: deadlineLabel })}
            </span>
          )}
          {item.productionDays > 0 && deadlineLabel ? (
            <span className="hidden sm:inline" aria-hidden>
              ·
            </span>
          ) : null}
          {item.productionDays > 0 ? (
            <span className="sm:hidden">
              {pt('itemProductionDaysInline', { days: item.productionDays })}
            </span>
          ) : null}
        </div>
      )}

      {/* Attachments */}
      {assets && assets.length > 0 && (
        <div className="border-t border-border px-4 py-3 sm:px-5 sm:py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {pt('itemAttachmentsLabel')}
          </p>
          <div className="mt-2">
            <AssetFileList
              assetIds={assets.map((asset) => asset.id)}
              prefetchedAssets={assets}
              layout="grid"
              showSize={false}
              className="grid-cols-3 sm:grid-cols-4 md:grid-cols-5"
            />
          </div>
        </div>
      )}

      {/* Timeline */}
      {task && itemEvents.length > 0 && (
        <>
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
                <OrderTimeline
                  events={itemEvents}
                  firstProductionStageName={firstProductionStageName}
                />
              </div>
            </div>
          </div>
          <div className="border-t border-border">
            <button
              type="button"
              onClick={() => setShowTimeline((prev) => !prev)}
              className="flex w-full items-center justify-center gap-1.5 py-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus:outline-none hover:bg-muted/5 focus-visible:bg-muted/5"
              aria-expanded={showTimeline}
              aria-controls={`timeline-${item.id}`}
            >
              <span>
                {showTimeline ? pt('itemHideTimeline') : pt('itemShowTimeline')}
              </span>
              {showTimeline ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </button>
          </div>
        </>
      )}
    </article>
  )
}

export function OrderLineItemsCard({
  lineItems,
  orgId,
  orderId,
  onAdjustQuantity,
}: {
  lineItems: Array<{
    id: string
    productId: string
    productName: string
    designName: string | null
    notes: string | null
    quantity: number
    unitPrice: number
    total: number
    deadline: Date
    productionDays: number
  }>
  orgId: string
  orderId: string
  onAdjustQuantity?: (lineItemId: string) => void
}) {
  const t = useTranslations('orders')
  const { data: stages } = useStages('production')
  const { data: timelineEvents = [] } = useOrderTasksTimeline(orderId)

  const firstProdStageName = stages
    ?.filter((s) => s.active && s.board === 'production')
    .sort((a, b) => a.orderIndex - b.orderIndex)[0]?.name

  const grandTotal = lineItems.reduce((sum, item) => sum + item.total, 0)

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
          <Package className="size-4 shrink-0 text-muted-foreground" />
          <span>{t('lineItems')}</span>
        </h2>
      </header>
      <div className="space-y-3">
        {lineItems.map((item) => (
          <LineItemRow
            key={item.id}
            item={item}
            orgId={orgId}
            orderId={orderId}
            timelineEvents={timelineEvents}
            onAdjustQuantity={onAdjustQuantity}
            firstProductionStageName={firstProdStageName}
          />
        ))}
      </div>
      <div className="flex justify-end border-t border-border pt-4">
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{t('total')}</p>
          <p className="text-lg font-semibold text-foreground tabular-nums">
            {currencyFormatter.format(grandTotal)}
          </p>
        </div>
      </div>
    </section>
  )
}
