import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
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
    name: string | null
    notes: string | null
    quantity: number
    unitPrice: number
    total: number
  }
  orgId: string
  orderId: string
}) {
  const { data: assets } = useQuery({
    queryKey: ['order-assets', item.id],
    queryFn: () =>
      getAssetsForLineItemFn({ data: { lineItemId: item.id, orgId } }),
  })
  const t = useTranslations('production')
  const task = useTaskByLineItemId(item.id, orderId)

  console.log({ task })

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-medium">{item.name || item.productId}</p>
          <p className="text-sm text-muted-foreground">
            {item.quantity} × {currencyFormatter.format(item.unitPrice)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className="font-medium">{currencyFormatter.format(item.total)}</p>
          {task && (
            <Badge variant="secondary" className="text-xs">
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
      </div>
      {item.notes && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {item.notes}
        </p>
      )}
      {assets && assets.length > 0 && (
        <div className="flex gap-2 mt-2">
          {assets.map((asset: { id: string }) => (
            <AssetImage
              key={asset.id}
              assetId={asset.id}
              assetKind="image"
              className="size-16 rounded object-cover"
            />
          ))}
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
    name: string | null
    notes: string | null
    quantity: number
    unitPrice: number
    total: number
  }>
  orgId: string
  orderId: string
}) {
  const t = useTranslations('orders')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('lineItems')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {lineItems.map((item) => (
            <LineItemRow
              key={item.id}
              item={item}
              orgId={orgId}
              orderId={orderId}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
