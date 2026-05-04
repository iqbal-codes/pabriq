import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { useOrder } from '#/features/orders/hooks'
import { getAssetsForLineItemFn } from '#/features/orders/server'
import { Route } from '#/routes/_org/orders/$id'

export function ViewOrderPage() {
  const { id } = Route.useParams()
  const ctx = Route.useRouteContext() as { org: { id: string } }
  const { data } = useOrder({ id, orgId: ctx.org.id })
  const t = useTranslations('orders')
  const ct = useTranslations('common')
  const st = useTranslations('status')

  if (!data) {
    return (
      <PageContent>
        <p>{t('noOrders')}</p>
      </PageContent>
    )
  }

  const { order, lineItems } = data

  return (
    <PageContent>
      <PageHeader
        title={t('viewOrder')}
        backAction={{ label: ct('back'), href: '/orders' }}
        primaryAction={
          order.status === 'draft'
            ? {
                label: t('editOrder'),
                href: `/orders/${order.id}/edit`,
              }
            : undefined
        }
      />
      <div className="flex items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{order.orderNumber ?? '—'}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">{st(order.status)}</Badge>
            {order.validUntil && (
              <span className="text-sm text-muted-foreground">
                {t('validUntil')}:{' '}
                {new Intl.DateTimeFormat('id-ID').format(order.validUntil)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('summary')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('customer')}</p>
              <p className="font-medium">{order.customerId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('notes')}</p>
              <p className="whitespace-pre-wrap">{order.notes ?? '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('total')}</p>
              <p className="text-lg font-semibold">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                }).format(order.total)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('lineItems')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lineItems.map((item) => (
                <LineItemRow key={item.id} item={item} orgId={ctx.org.id} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContent>
  )
}

function LineItemRow({
  item,
  orgId,
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
}) {
  const { data: assets } = useQuery({
    queryKey: ['order-assets', item.id],
    queryFn: () =>
      getAssetsForLineItemFn({ data: { lineItemId: item.id, orgId } }),
  })

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{item.name || item.productId}</p>
          <p className="text-sm text-muted-foreground">
            {item.quantity} ×{' '}
            {new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0,
            }).format(item.unitPrice)}
          </p>
        </div>
        <p className="font-medium">
          {new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
          }).format(item.total)}
        </p>
      </div>
      {item.notes && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {item.notes}
        </p>
      )}
      {assets && assets.length > 0 && (
        <div className="flex gap-2 mt-2">
          {assets.map((asset) => (
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
