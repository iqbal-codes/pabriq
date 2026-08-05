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
import { useProductTemplates } from '#/features/product-templates/hooks'
import type { ProductTemplate } from '#/features/product-templates/model'
import { ProductFormFields } from '#/features/products/components/product-form-fields'
import {
  useCreateProduct,
  useProduct,
  useProductAddons,
  useProductBreakpoints,
  useUpdateProduct,
} from '#/features/products/hooks'
import type { Product } from '#/features/products/model'
import {
  productFormSchema,
  updateProductFormSchema,
} from '#/lib/validation-schemas'

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
  templates: ProductTemplate[]
  isTemplatesLoading: boolean
  sourceTemplateName?: string | null
}
function ProductFormSheetInner({
  mode,
  onOpenChange,
  onSaved,
  product,
  breakpoints = [],
  addons = [],
  templates,
  isTemplatesLoading,
  sourceTemplateName,
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
      productTemplateId: product?.productTemplateId ?? '',
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
      pricingBreakpoints: breakpoints.map((breakpoint) => ({
        minQuantity: breakpoint.minQuantity,
        unitPrice: breakpoint.unitPrice as number | undefined,
      })) as Array<{ minQuantity: number; unitPrice: number | undefined }>,
      productAddons: addons.map((addon) => ({
        name: addon.name,
        unitSurcharge: addon.unitSurcharge as number | undefined,
      })) as Array<{ name: string; unitSurcharge: number | undefined }>,
    },
    validators: {
      onChange: isEdit ? updateProductFormSchema : productFormSchema,
      onSubmit: isEdit ? updateProductFormSchema : productFormSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      if (!formApi.state.isValid) return
      const {
        pricingBreakpoints,
        pricingMode,
        productAddons,
        productTemplateId,
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
        return
      }

      const result = await createProduct.mutateAsync({
        ...productValues,
        productTemplateId,
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
    },
  })

  const handleTemplateChange = (templateId: string): void => {
    const template = templates.find((item) => item.id === templateId)
    if (!template || isEdit) return
    const pricing = template.configuration.pricing

    if (!form.getFieldMeta('basePrice')?.isTouched) {
      form.setFieldValue('basePrice', pricing.basePrice)
    }
    if (!form.getFieldMeta('productionDays')?.isTouched) {
      form.setFieldValue('productionDays', pricing.productionDays)
    }
    if (!form.getFieldMeta('minQuantity')?.isTouched) {
      form.setFieldValue('minQuantity', pricing.minQuantity)
    }
    if (!form.getFieldMeta('maxQuantity')?.isTouched) {
      form.setFieldValue('maxQuantity', pricing.maxQuantity ?? undefined)
    }
    if (!form.getFieldMeta('negotiateAboveQuantity')?.isTouched) {
      form.setFieldValue(
        'negotiateAboveQuantity',
        pricing.negotiateAboveQuantity ?? undefined,
      )
    }
    if (!form.getFieldMeta('repeatOrderUnitPrice')?.isTouched) {
      form.setFieldValue(
        'repeatOrderUnitPrice',
        pricing.repeatOrderUnitPrice ?? undefined,
      )
    }
    if (!form.getFieldMeta('repeatOrderMinQuantity')?.isTouched) {
      form.setFieldValue(
        'repeatOrderMinQuantity',
        pricing.repeatOrderMinQuantity ?? undefined,
      )
    }
    if (!form.getFieldMeta('maxProductionQuantity')?.isTouched) {
      form.setFieldValue(
        'maxProductionQuantity',
        pricing.maxProductionQuantity ?? undefined,
      )
    }
    if (
      pricing.pricingMode !== undefined &&
      !form.getFieldMeta('pricingMode')?.isTouched
    ) {
      form.setFieldValue('pricingMode', pricing.pricingMode)
    }
  }

  return (
    <FormSheet open={true} onOpenChange={onOpenChange} title={title}>
      <FormRoot form={form} className="flex min-h-0 flex-1 flex-col space-y-0">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <ProductFormFields
            form={form}
            templates={templates}
            isTemplatesLoading={isTemplatesLoading}
            isEdit={isEdit}
            sourceTemplateName={sourceTemplateName}
            onTemplateChange={handleTemplateChange}
          />
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
  const templatesQuery = useProductTemplates()
  const productQuery = useProduct(productId)
  const breakpointsQuery = useProductBreakpoints(productId)
  const addonsQuery = useProductAddons(productId)

  if (!open) return null

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

    const selectableTemplates =
      templatesQuery.data?.filter(
        (template) =>
          template.status === 'active' ||
          template.id === product.productTemplateId,
      ) ?? []
    const sourceTemplateName =
      selectableTemplates.find(
        (template) => template.id === product.productTemplateId,
      )?.name ?? null

    return (
      <ProductFormSheetInner
        mode={mode}
        onOpenChange={onOpenChange}
        onSaved={onSaved}
        product={product}
        breakpoints={breakpointsQuery.data}
        addons={addonsQuery.data}
        templates={selectableTemplates}
        isTemplatesLoading={templatesQuery.isLoading}
        sourceTemplateName={sourceTemplateName}
      />
    )
  }

  return (
    <ProductFormSheetInner
      mode={mode}
      onOpenChange={onOpenChange}
      onSaved={onSaved}
      templates={
        templatesQuery.data?.filter(
          (template) => template.status === 'active',
        ) ?? []
      }
      isTemplatesLoading={templatesQuery.isLoading}
    />
  )
}
