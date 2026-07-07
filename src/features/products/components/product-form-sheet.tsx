import type * as React from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import {
  FormActions,
  FormRoot,
  FormSheet,
  useAppForm,
} from '#/components/app/form'
import { Button } from '#/components/ui/button'
import { ProductFormFields } from '#/features/products/components/product-form-fields'
import {
  useCreateProduct,
  useProduct,
  useProductAddons,
  useProductBreakpoints,
  useUpdateProduct,
} from '#/features/products/hooks'
import type { Product } from '#/features/products/model'
import { productFormSchema } from '#/lib/validation-schemas'

export type ProductFormSheetMode =
  | { type: 'create' }
  | { type: 'edit'; id: string }

export type ProductFormSheetProps = {
  mode: ProductFormSheetMode
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

interface ProductFormSheetInnerProps {
  mode: ProductFormSheetMode
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  product?: Product
  breakpoints?: Array<{ minQuantity: number; unitPrice: number }>
  addons?: Array<{ name: string; unitSurcharge: number }>
}

function ProductFormSheetInner({
  mode,
  onOpenChange,
  onSaved,
  product,
  breakpoints = [],
  addons = [],
}: ProductFormSheetInnerProps) {
  const t = useTranslations('products')
  const ct = useTranslations('common')
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()

  const isEdit = mode.type === 'edit'
  const title = isEdit ? t('editTitle') : t('createTitle')
  const submitLabel = isEdit ? t('updateProduct') : t('createProduct')

  const form = useAppForm({
    defaultValues: {
      name: product?.name ?? '',
      description: product?.description ?? '',
      priority: product?.priority ?? false,
      primaryImageAssetId:
        product?.primaryImageAssetId ?? (null as string | null),
      basePrice: product?.basePrice ?? (undefined as number | undefined),
      productionDays: product?.productionDays ?? 1,
      minQuantity: product?.minQuantity ?? 1,
      maxQuantity: (product?.maxQuantity ?? undefined) as number | undefined,
      negotiateAboveQuantity: (product?.negotiateAboveQuantity ?? undefined) as
        | number
        | undefined,
      repeatOrderUnitPrice: (product?.repeatOrderUnitPrice ?? undefined) as
        | number
        | undefined,
      repeatOrderMinQuantity: (product?.repeatOrderMinQuantity ?? undefined) as
        | number
        | undefined,
      maxProductionQuantity: (product?.maxProductionQuantity ?? undefined) as
        | number
        | undefined,
      pricingMode:
        (product?.pricingMode as 'interpolated' | 'step' | undefined) ??
        'interpolated',
      pricingBreakpoints: breakpoints.map((b) => ({
        minQuantity: b.minQuantity,
        unitPrice: b.unitPrice as number | undefined,
      })) as Array<{ minQuantity: number; unitPrice: number | undefined }>,
      productAddons: addons.map((a) => ({
        name: a.name,
        unitSurcharge: a.unitSurcharge as number | undefined,
      })) as Array<{ name: string; unitSurcharge: number | undefined }>,
    },
    validators: {
      onChange: productFormSchema,
      onSubmit: productFormSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      if (!formApi.state.isValid) return
      const {
        pricingBreakpoints,
        pricingMode,
        productAddons,
        ...productValues
      } = value

      if (isEdit && product) {
        const result = await updateProduct.mutateAsync({
          ...productValues,
          id: product.id,
          pricingMode,
          pricingBreakpoints: pricingBreakpoints as Array<{
            minQuantity: number
            unitPrice: number
          }>,
          productAddons: productAddons as Array<{
            name: string
            unitSurcharge: number
          }>,
        })
        if (result.ok) {
          toast.success(t('updated'))
          onSaved()
        } else {
          toast.error(result.error)
        }
      } else {
        const result = await createProduct.mutateAsync({
          ...productValues,
          pricingMode,
          pricingBreakpoints: pricingBreakpoints as Array<{
            minQuantity: number
            unitPrice: number
          }>,
          productAddons: productAddons as Array<{
            name: string
            unitSurcharge: number
          }>,
        })
        if (result.ok) {
          toast.success(t('created'))
          onSaved()
        } else {
          toast.error(result.error)
        }
      }
    },
  })

  return (
    <FormSheet open={true} onOpenChange={onOpenChange} title={title}>
      <FormRoot form={form} className="flex min-h-0 flex-1 flex-col space-y-0">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <ProductFormFields form={form} />
        </div>
        <FormActions
          align="stacked"
          className="border-t bg-background px-5 py-4"
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {ct('cancel')}
          </Button>
          <form.AppForm>
            <form.SubmitButton>{submitLabel}</form.SubmitButton>
          </form.AppForm>
        </FormActions>
      </FormRoot>
    </FormSheet>
  )
}

export function ProductFormSheet({
  mode,
  open,
  onOpenChange,
  onSaved,
}: ProductFormSheetProps): React.ReactNode {
  const t = useTranslations('products')
  const ct = useTranslations('common')

  const isEdit = mode.type === 'edit'
  const productId = isEdit ? mode.id : ''

  const productQuery = useProduct(productId)
  const breakpointsQuery = useProductBreakpoints(productId)
  const addonsQuery = useProductAddons(productId)

  if (!open) {
    return null
  }

  if (isEdit) {
    if (productQuery.isLoading) {
      return (
        <FormSheet
          open={open}
          onOpenChange={onOpenChange}
          title={t('editTitle')}
        >
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">{ct('loading')}...</p>
          </div>
        </FormSheet>
      )
    }

    const product = productQuery.data
    if (!product) {
      return (
        <FormSheet
          open={open}
          onOpenChange={onOpenChange}
          title={t('editTitle')}
        >
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">{t('noProducts')}</p>
          </div>
        </FormSheet>
      )
    }

    if (breakpointsQuery.data === undefined || addonsQuery.data === undefined) {
      return (
        <FormSheet
          open={open}
          onOpenChange={onOpenChange}
          title={t('editTitle')}
        >
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">{ct('loading')}...</p>
          </div>
        </FormSheet>
      )
    }

    return (
      <ProductFormSheetInner
        mode={mode}
        onOpenChange={onOpenChange}
        onSaved={onSaved}
        product={product}
        breakpoints={breakpointsQuery.data}
        addons={addonsQuery.data}
      />
    )
  }

  return (
    <ProductFormSheetInner
      mode={mode}
      onOpenChange={onOpenChange}
      onSaved={onSaved}
    />
  )
}
