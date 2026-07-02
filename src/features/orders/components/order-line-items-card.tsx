import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { getVisibleDesignName } from '#/features/orders/line-item-display'
import { getAssetsForLineItemFn } from '#/features/orders/server'
import { useTaskByLineItemId } from '#/features/production/hooks'
import { currencyFormatter } from './view-order-utils'

function LineItemRow({
  item,
  orgId,
  orderId,
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
}) {
  const { data: assets } = useQuery({
    queryKey: ['line-item-assets', item.id],
    queryFn: () => getAssetsForLineItemFn({ data: { lineItemId: item.id, orgId } }),
  })
  const t = useTranslations('production')
  const task = useTaskByLineItemId(item.id, orderId)

  const visibleDesign = getVisibleDesignName(item.designName, item.productName)

  return (
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
          <div className="mt-2 flex gap-1.5">
            {assets.map((asset: { id: string }) => (
              <AssetImage
                key={asset.id}
                assetId={asset.id}
                assetKind="image"
                className="size-12 rounded-md object-cover ring-1 ring-border"
              />
            ))}
          </div>
        )}
      </div>

      {/* Right: total */}
      <p className="shrink-0 font-semibold text-sm tabular-nums">
        {currencyFormatter.format(item.total)}
      </p>
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
