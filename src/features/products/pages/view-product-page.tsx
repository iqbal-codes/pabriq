import { useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { useProduct, useProductBreakpoints } from '#/features/products/hooks'
import { Route } from '#/routes/_org/products/$id/index'

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
})

export function ViewProductPage() {
  const { id } = Route.useParams()
  const product = useProduct(id).data
  const breakpoints = useProductBreakpoints(id).data ?? []
  const t = useTranslations('products')
  const ct = useTranslations('common')
  const st = useTranslations('status')

  if (!product) {
    return (
      <PageContent>
        <p>{t('noProducts')}</p>
      </PageContent>
    )
  }

  return (
    <PageContent>
      <PageHeader
        title={t('viewProduct')}
        backAction={{ label: ct('back'), href: '/products' }}
        primaryAction={{
          label: t('editProduct'),
          href: `/products/${product.id}/edit`,
        }}
      />
      <div className="flex items-center gap-4 mb-6">
        <AssetImage
          assetId={product.primaryImageAssetId}
          assetKind="image"
          className="size-16 rounded-lg"
        />
        <div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <Badge
            variant={product.active ? 'default' : 'secondary'}
            className="mt-1"
          >
            {product.active ? st('active') : st('inactive')}
          </Badge>
        </div>
      </div>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('productInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {t('description')}
              </p>
              <p className="whitespace-pre-wrap">
                {product.description ?? '\u2014'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t('productionNotes')}
              </p>
              <p className="whitespace-pre-wrap">
                {product.productionNotes ?? '\u2014'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('pricingAndOrders')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('basePrice')}
                </p>
                <p className="font-medium">
                  {currencyFormatter.format(product.basePrice)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('productionDays')}
                </p>
                <p className="font-medium">{product.productionDays}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('minQuantity')}
                </p>
                <p className="font-medium">{product.minQuantity}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('maxQuantity')}
                </p>
                <p className="font-medium">{product.maxQuantity ?? '\u2014'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('pricing.interpolate')}
                </p>
                <p className="font-medium">
                  {product.pricingMode === 'interpolated'
                    ? t('pricing.interpolateOn')
                    : t('pricing.interpolateOff')}
                </p>
              </div>
            </div>
            {breakpoints.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">
                  {t('pricing.breakpoints')}
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b">
                      <th className="text-left py-1 pr-4">
                        {t('pricing.minQuantity')}
                      </th>
                      <th className="text-left py-1">
                        {t('pricing.unitPrice')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakpoints.map((bp) => (
                      <tr
                        key={`bp-${bp.minQuantity}`}
                        className="border-b last:border-0"
                      >
                        <td className="py-1 pr-4">{bp.minQuantity}</td>
                        <td className="py-1">
                          {currencyFormatter.format(bp.unitPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContent>
  )
}
