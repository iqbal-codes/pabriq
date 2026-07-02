import { useParams } from '@tanstack/react-router'
import { useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { StatusBadge } from '#/components/status-badge'
import { useProduct, useProductAddons, useProductBreakpoints } from '#/features/products/hooks'

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
})

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

      {/* Product Header */}
      <div className="flex items-center gap-4 rounded-xl border bg-card p-6">
        <AssetImage
          assetId={product.primaryImageAssetId}
          assetKind="image"
          className="size-16 rounded-lg"
        />
        <div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <div className="mt-1">
            <StatusBadge status={product.active ? 'active' : 'inactive'} />
          </div>
        </div>
      </div>

      {/* Product Info */}
      <div className="rounded-xl border bg-card p-6">
        <p className="text-sm font-semibold text-muted-foreground mb-4">
          {t('productInfo')}
        </p>
        <div className="space-y-4">
          <div>
            <p className="text-[13px] font-medium text-muted-foreground">
              {t('description')}
            </p>
            <p className="font-medium whitespace-pre-wrap">
              {product.description ?? '\u2014'}
            </p>
          </div>
          <div>
            <p className="text-[13px] font-medium text-muted-foreground">
              {t('productionNotes')}
            </p>
            <p className="font-medium whitespace-pre-wrap">
              {product.productionNotes ?? '\u2014'}
            </p>
          </div>
        </div>
      </div>

      {/* Pricing & Orders */}
      <div className="rounded-xl border bg-card p-6">
        <p className="text-sm font-semibold text-muted-foreground mb-4">
          {t('pricingAndOrders')}
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-[13px] font-medium text-muted-foreground">
              {t('basePrice')}
            </p>
            <p className="font-semibold text-lg">
              {currencyFormatter.format(product.basePrice)}
            </p>
          </div>
          <div>
            <p className="text-[13px] font-medium text-muted-foreground">
              {t('productionDays')}
            </p>
            <p className="font-semibold">{product.productionDays}</p>
          </div>
          <div>
            <p className="text-[13px] font-medium text-muted-foreground">
              {t('minQuantity')}
            </p>
            <p className="font-semibold">{product.minQuantity}</p>
          </div>
          <div>
            <p className="text-[13px] font-medium text-muted-foreground">
              {t('maxQuantity')}
            </p>
            <p className="font-semibold">{product.maxQuantity ?? '\u2014'}</p>
          </div>
          <div>
            <p className="text-[13px] font-medium text-muted-foreground">
              {t('pricing.interpolate')}
            </p>
            <p className="font-semibold">
              {product.pricingMode === 'interpolated'
                ? t('pricing.interpolateOn')
                : t('pricing.interpolateOff')}
            </p>
          </div>
          <div>
            <p className="text-[13px] font-medium text-muted-foreground">
              {t('negotiateAboveQuantity')}
            </p>
            <p className="font-semibold">
              {product.negotiateAboveQuantity != null
                ? product.negotiateAboveQuantity
                : '\u2014'}
            </p>
          </div>
          <div>
            <p className="text-[13px] font-medium text-muted-foreground">
              {t('repeatOrderUnitPrice')}
            </p>
            <p className="font-semibold">
              {product.repeatOrderUnitPrice != null
                ? currencyFormatter.format(product.repeatOrderUnitPrice)
                : '\u2014'}
            </p>
          </div>
          <div>
            <p className="text-[13px] font-medium text-muted-foreground">
              {t('repeatOrderMinQuantity')}
            </p>
            <p className="font-semibold">
              {product.repeatOrderMinQuantity != null
                ? product.repeatOrderMinQuantity
                : '\u2014'}
            </p>
          </div>
          <div>
            <p className="text-[13px] font-medium text-muted-foreground">
              {t('maxProductionQuantity')}
            </p>
            <p className="font-semibold">
              {product.maxProductionQuantity != null
                ? product.maxProductionQuantity
                : '\u2014'}
            </p>
          </div>
        </div>

        {breakpoints.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <p className="text-[13px] font-medium text-muted-foreground mb-3">
              {t('pricing.breakpoints')}
            </p>
            <div className="rounded-lg border border-hairline bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                      {t('pricing.minQuantity')}
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                      {t('pricing.unitPrice')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {breakpoints.map((bp) => (
                    <tr
                      key={`bp-${bp.minQuantity}`}
                      className="border-b border-hairline last:border-0"
                    >
                      <td className="py-2 px-3 font-medium">
                        {bp.minQuantity}
                      </td>
                      <td className="py-2 px-3 font-semibold tabular-nums">
                        {currencyFormatter.format(bp.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {addons.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <p className="text-[13px] font-medium text-muted-foreground mb-3">
              {t('addons.title')}
            </p>
            <div className="rounded-lg border border-hairline bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                      {t('addons.name')}
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                      {t('addons.unitSurcharge')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {addons.map((addon) => (
                    <tr
                      key={addon.id}
                      className="border-b border-hairline last:border-0"
                    >
                      <td className="py-2 px-3 font-medium">{addon.name}</td>
                      <td className="py-2 px-3 font-semibold tabular-nums">
                        {currencyFormatter.format(addon.unitSurcharge)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageContent>
  )
}
