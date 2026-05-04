'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'
import { formatNumber } from '#/components/app/form/form-utils'
import { Button } from '#/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '#/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { calculateUnitPrice } from '#/features/pricing/engine'
import type { ProductRow } from '#/features/products/model'
import { listBreakpointsFn } from '#/features/products/server'

type ProductSelectDialogProps = {
  products: ProductRow[]
  onSelect: (product: ProductRow, unitPrice: string) => void
  trigger: React.ReactNode
}

export function ProductSelectDialog({
  products,
  onSelect,
  trigger,
}: ProductSelectDialogProps) {
  const t = useTranslations('orders')
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const activeProducts = useMemo(
    () => products.filter((p) => p.active),
    [products],
  )

  const filtered = useMemo(() => {
    if (!search) return activeProducts
    const q = search.toLowerCase()
    return activeProducts.filter((p) => p.name.toLowerCase().includes(q))
  }, [activeProducts, search])

  async function handleSelect(product: ProductRow) {
    setIsAdding(true)
    try {
      const breakpoints = await listBreakpointsFn({
        data: { productId: product.id },
      })

      const hasExplicitAtMinQty = breakpoints.some(
        (bp) => bp.minQuantity === product.minQuantity,
      )
      if (!hasExplicitAtMinQty) {
        breakpoints.unshift({
          minQuantity: product.minQuantity,
          unitPrice: product.basePrice,
        })
      }

      const result = calculateUnitPrice({
        quantity: product.minQuantity,
        breakpoints,
        mode: product.pricingMode ?? 'interpolated',
      })

      const unitPrice =
        'unitPrice' in result
          ? String(result.unitPrice.amount)
          : String(product.basePrice)

      onSelect(product, unitPrice)
      setOpen(false)
      setSearch('')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('selectProduct')}</DialogTitle>
        </DialogHeader>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('searchProducts')}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filtered.length === 0 ? (
              <CommandEmpty>{t('noResults')}</CommandEmpty>
            ) : (
              <CommandGroup>
                {filtered.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={product.id}
                    onSelect={() => handleSelect(product)}
                  >
                    <div className="flex w-full items-center gap-3">
                      <AssetImage
                        assetId={product.primaryImageAssetId}
                        assetKind="image"
                        className="size-10 rounded object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Rp {formatNumber(product.basePrice)} &middot; MOQ{' '}
                          {product.minQuantity}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="shrink-0"
                        disabled={isAdding}
                      >
                        {t('addToOrder')}
                      </Button>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
