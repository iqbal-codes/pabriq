import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { AssetFileList } from '#/components/app/asset-file'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { getVisibleDesignName } from '#/features/orders/line-item-display'
import { getAssetsForLineItemFn } from '#/features/orders/server'
import { OrderTimeline } from '#/features/portal/components/order-timeline'
import type { OrderTaskEvent } from '#/features/portal/model'
import {
  useOrderTasksTimeline,
  useTaskByLineItemId,
} from '#/features/production/hooks'
import { cn } from '#/lib/utils'
import { currencyFormatter } from './view-order-utils'

function LineItemRow({
  item,
  orgId,
  orderId,
  timelineEvents,
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
  }
  orgId: string
  orderId: string
  timelineEvents: OrderTaskEvent[]
}) {
  const { data: assets } = useQuery({
    queryKey: ['line-item-assets', item.id],
    queryFn: () =>
      getAssetsForLineItemFn({ data: { lineItemId: item.id, orgId } }),
  })
  const t = useTranslations('production')
  const pt = useTranslations('portal')
  const task = useTaskByLineItemId(item.id, orderId)
  const [showTimeline, setShowTimeline] = useState(false)

  const visibleDesign = getVisibleDesignName(item.designName, item.productName)
  const itemEvents = task
    ? timelineEvents.filter((e) => e.taskId === task.task.id)
    : []

  return (
    <div className="divide-y divide-border/40">
      <div className="group flex items-start gap-4 px-4 py-3 transition-colors hover:bg-muted/30">
        {/* Left: product info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium text-sm">{item.productName}</p>
            {task && (
              <Badge variant="secondary" className="shrink-0 text-[11px]">
                {task.stage?.name ??
                  t(
                    task.task.status === 'queued'
                      ? 'statusQueued'
                      : task.task.status === 'completed'
                        ? 'statusCompleted'
                        : 'statusInProgress',
                  )}
              </Badge>
            )}
          </div>
          {visibleDesign && (
            <p className="mt-0.5 text-xs text-muted-foreground truncate">
              {visibleDesign}
            </p>
          )}
          <p className="mt-1 text-xs tabular-nums text-muted-foreground">
            {item.quantity} &times; {currencyFormatter.format(item.unitPrice)}
          </p>
          {item.notes && (
            <p className="mt-1.5 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {item.notes}
            </p>
          )}
          {assets && assets.length > 0 && (
            <AssetFileList
              assetIds={assets.map((asset) => asset.id)}
              prefetchedAssets={assets}
              layout="grid"
              showSize={false}
              className="grid-cols-3 sm:grid-cols-4 md:grid-cols-5"
            />
          )}
        </div>

        {/* Right: total */}
        <p className="shrink-0 font-semibold text-sm tabular-nums">
          {currencyFormatter.format(item.total)}
        </p>
      </div>

      {task && itemEvents.length > 0 && (
        <div className="bg-muted/10 px-4 py-2.5 border-t border-border/20">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowTimeline(!showTimeline)}
            className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {showTimeline ? pt('itemHideTimeline') : pt('itemShowTimeline')}
            <ChevronDown
              className={cn(
                'ml-1 size-3.5 transition-transform duration-200',
                showTimeline && 'rotate-180',
              )}
            />
          </Button>

          {showTimeline && (
            <div className="mt-2.5 border-t border-border/20 pt-3">
              <OrderTimeline events={itemEvents} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function OrderLineItemsCard({
  lineItems,
  orgId,
  orderId,
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
  }>
  orgId: string
  orderId: string
}) {
  const t = useTranslations('orders')
  const { data: timelineEvents = [] } = useOrderTasksTimeline(orderId)

  const grandTotal = lineItems.reduce((sum, item) => sum + item.total, 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('lineItems')}</CardTitle>
          <span className="text-xs text-muted-foreground">
            {lineItems.length} {lineItems.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0 pb-4">
        <div className="mx-4 rounded-xl border bg-muted/50 p-1.5">
          <div className="rounded-lg border bg-background overflow-hidden divide-y divide-border">
            {lineItems.map((item) => (
              <LineItemRow
                key={item.id}
                item={item}
                orgId={orgId}
                orderId={orderId}
                timelineEvents={timelineEvents}
              />
            ))}
          </div>
        </div>
        {/* Grand total */}
        <div className="mx-4 mt-3 flex items-center justify-end gap-4">
          <p className="text-sm text-muted-foreground">{t('total')}</p>
          <p className="text-lg font-bold tabular-nums">
            {currencyFormatter.format(grandTotal)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
