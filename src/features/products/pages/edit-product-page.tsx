import { useNavigate, useParams } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { FormActions, FormRoot, useAppForm } from '#/components/app/form'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { ProductFormFields } from '#/features/products/components/product-form-fields'
import {
  useProduct,
  useProductAddons,
  useProductBreakpoints,
  useUpdateProduct,
} from '#/features/products/hooks'
import type { Product } from '#/features/products/model'
import { productFormSchema } from '#/lib/validation-schemas'

interface EditProductFormProps {
  product: Product
  breakpoints: Array<{ minQuantity: number; unitPrice: number }>
  addons: Array<{ name: string; unitSurcharge: number }>
}

function EditProductForm({
  product,
  breakpoints,
  addons,
}: EditProductFormProps) {
  const navigate = useNavigate()
  const t = useTranslations('products')
  const ct = useTranslations('common')
  const updateProduct = useUpdateProduct()

  const form = useAppForm({
    defaultValues: {
      name: product.name,
      description: product.description ?? '',
      priority: product.priority,
      primaryImageAssetId: product.primaryImageAssetId,
      basePrice: product.basePrice,
      productionDays: product.productionDays,
      minQuantity: product.minQuantity,
      maxQuantity: (product.maxQuantity ?? undefined) as number | undefined,
      negotiateAboveQuantity: (product.negotiateAboveQuantity ?? undefined) as
        | number
        | undefined,
      repeatOrderUnitPrice: (product.repeatOrderUnitPrice ?? undefined) as
        | number
        | undefined,
      repeatOrderMinQuantity: (product.repeatOrderMinQuantity ?? undefined) as
        | number
        | undefined,
      maxProductionQuantity: (product.maxProductionQuantity ?? undefined) as
        | number
        | undefined,
      pricingMode:
        (product.pricingMode as 'interpolated' | 'step' | undefined) ??
        'interpolated',
      pricingBreakpoints: breakpoints,
      productAddons: addons.map((a) => ({
        name: a.name,
        unitSurcharge: a.unitSurcharge,
      })),
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
      const result = await updateProduct.mutateAsync({
        ...productValues,
        id: product.id,
        pricingMode,
        pricingBreakpoints,
        productAddons,
      })
      if (result.ok) {
        toast.success(t('updated'))
        navigate({ to: '/products' })
      } else {
        toast.error(result.error)
      }
    },
  })

  return (
    <PageContent>
      <PageHeader
        title={t('editTitle')}
        backAction={{ label: ct('back'), href: '/products' }}
      />
      <h1 className="text-2xl font-semibold tracking-tight md:hidden">
        {t('editTitle')}
      </h1>
      <FormRoot form={form}>
        <ProductFormFields form={form} />
        <FormActions align="stacked">
          <form.AppForm>
            <form.SubmitButton>{t('updateProduct')}</form.SubmitButton>
          </form.AppForm>
        </FormActions>
      </FormRoot>
    </PageContent>
  )
}

export function EditProductPage() {
  const { id } = useParams({ from: '/_org/products/$id/' })
  const product = useProduct(id).data
  const breakpoints = useProductBreakpoints(product?.id ?? '')
  const addons = useProductAddons(product?.id ?? '')
  const t = useTranslations('products')
  const ct = useTranslations('common')

  if (!product) {
    return (
      <PageContent>
        <p>{t('noProducts')}</p>
      </PageContent>
    )
  }

  if (breakpoints.data === undefined || addons.data === undefined) {
    return (
      <PageContent>
        <PageHeader
          title={t('editTitle')}
          backAction={{ label: ct('back'), href: '/products' }}
        />
        <div className="flex items-center justify-center p-8">
          <p className="text-sm text-muted-foreground">{ct('loading')}...</p>
        </div>
      </PageContent>
    )
  }

  return (
    <EditProductForm
      product={product}
      breakpoints={breakpoints.data}
      addons={addons.data}
    />
  )
}
