import { useParams } from '@tanstack/react-router'
import { useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { StatusBadge } from '#/components/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { currencyFormatter } from '#/features/orders/components/view-order-utils'
import {
  useProduct,
  useProductAddons,
  useProductBreakpoints,
} from '#/features/products/hooks'

export function ViewProductPage() {
  const { id } = useParams({ from: '/_org/products/$id/' })
  const product = useProduct(id).data
  const breakpoints = useProductBreakpoints(id).data ?? []
  const addons = useProductAddons(id).data ?? []
  const t = useTranslations('products')
  const ct = useTranslations('common')

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left Pane */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pricing Breakpoints */}
          {breakpoints.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {t('pricing.breakpoints')}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {breakpoints.length}{' '}
                    {breakpoints.length === 1 ? 'tier' : 'tiers'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0 pb-4">
                <div className="mx-4 rounded-xl border bg-muted/50 p-1.5">
                  <div className="rounded-lg border bg-background overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('pricing.minQuantity')}</TableHead>
                          <TableHead className="text-right">
                            {t('pricing.unitPrice')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {breakpoints.map((bp) => (
                          <TableRow key={`bp-${bp.minQuantity}`}>
                            <TableCell className="font-medium">
                              {bp.minQuantity.toLocaleString()} pcs
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {currencyFormatter.format(bp.unitPrice)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Addons */}
          {addons.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {t('addons.title')}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {addons.length} {addons.length === 1 ? 'addon' : 'addons'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0 pb-4">
                <div className="mx-4 rounded-xl border bg-muted/50 p-1.5">
                  <div className="rounded-lg border bg-background overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('addons.name')}</TableHead>
                          <TableHead className="text-right">
                            {t('addons.unitSurcharge')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {addons.map((addon) => (
                          <TableRow key={addon.id}>
                            <TableCell className="font-medium">
                              {addon.name}
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {currencyFormatter.format(addon.unitSurcharge)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Pane */}
        <div className="lg:col-span-1 space-y-6">
          {/* Product Profile Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center mb-6">
                {product.primaryImageAssetId ? (
                  <AssetImage
                    assetId={product.primaryImageAssetId}
                    assetKind="image"
                    className="size-24 rounded-xl object-cover ring-1 ring-border mb-3"
                  />
                ) : (
                  <div className="flex size-24 items-center justify-center rounded-xl bg-muted ring-1 ring-border mb-3">
                    <span className="text-2xl text-muted-foreground">
                      {product.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <h2 className="text-lg font-semibold">{product.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge
                    status={product.active ? 'active' : 'inactive'}
                  />
                  {product.priority && (
                    <StatusBadge status="pending_approval" />
                  )}
                </div>
              </div>

              {/* Base Price */}
              <div className="rounded-lg border p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  {t('basePrice')}
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {currencyFormatter.format(product.basePrice)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Product Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('productInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('description')}
                </p>
                <p className="whitespace-pre-wrap text-sm">
                  {product.description ?? '\u2014'}
                </p>
              </div>
              {product.productionNotes && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('productionNotes')}
                  </p>
                  <p className="whitespace-pre-wrap text-sm">
                    {product.productionNotes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing Metadata Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('pricingAndOrders')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t('productionDays')}
                </p>
                <p className="font-semibold">{product.productionDays} days</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t('minQuantity')}
                </p>
                <p className="font-semibold">
                  {product.minQuantity.toLocaleString()} pcs
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t('maxQuantity')}
                </p>
                <p className="font-semibold">
                  {product.maxQuantity != null
                    ? `${product.maxQuantity.toLocaleString()} pcs`
                    : '\u2014'}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t('pricing.interpolate')}
                </p>
                <p className="font-semibold text-sm">
                  {product.pricingMode === 'interpolated'
                    ? t('pricing.interpolateOn')
                    : t('pricing.interpolateOff')}
                </p>
              </div>
              {product.negotiateAboveQuantity != null && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t('negotiateAboveQuantity')}
                  </p>
                  <p className="font-semibold">
                    {product.negotiateAboveQuantity.toLocaleString()}
                  </p>
                </div>
              )}
              {product.repeatOrderUnitPrice != null && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t('repeatOrderUnitPrice')}
                  </p>
                  <p className="font-semibold tabular-nums">
                    {currencyFormatter.format(product.repeatOrderUnitPrice)}
                  </p>
                </div>
              )}
              {product.repeatOrderMinQuantity != null && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t('repeatOrderMinQuantity')}
                  </p>
                  <p className="font-semibold">
                    {product.repeatOrderMinQuantity.toLocaleString()}
                  </p>
                </div>
              )}
              {product.maxProductionQuantity != null && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t('maxProductionQuantity')}
                  </p>
                  <p className="font-semibold">
                    {product.maxProductionQuantity.toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContent>
  )
}
