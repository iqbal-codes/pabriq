import { useStore } from '@tanstack/react-form'
import { useNavigate, useParams } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { FormRoot, useAppForm } from '#/components/app/form'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { ProductFormFields } from '#/features/products/components/product-form-fields'
import {
  useProduct,
  useProductBreakpoints,
  useUpdateProduct,
} from '#/features/products/hooks'
import { productFormSchema } from '#/lib/validation-schemas'

export function EditProductPage() {
  const navigate = useNavigate()
  const { id } = useParams({ from: '/_org/products/$id/edit' })
  const product = useProduct(id).data
  const breakpoints = useProductBreakpoints(product?.id ?? '')
  const t = useTranslations('products')
  const ct = useTranslations('common')
  const updateProduct = useUpdateProduct()

  const form = useAppForm({
    defaultValues: {
      name: product?.name ?? '',
      description: product?.description ?? '',
      productionNotes: product?.productionNotes ?? '',
      priority: product?.priority ?? false,
      primaryImageAssetId: (product?.primaryImageAssetId ?? null) as
        | string
        | null,
      basePrice: product?.basePrice ?? 0,
      productionDays: product?.productionDays ?? 1,
      minQuantity: product?.minQuantity ?? 1,
      maxQuantity: (product?.maxQuantity ?? undefined) as number | undefined,
      pricingMode:
        (product?.pricingMode as 'interpolated' | 'step' | undefined) ??
        'interpolated',
      pricingBreakpoints:
        (breakpoints.data as
          | Array<{ minQuantity: number; unitPrice: number }>
          | undefined) ?? [],
    },
    validators: {
      onChange: productFormSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      if (!formApi.state.isValid) return
      const { pricingBreakpoints, pricingMode, ...productValues } = value
      const result = await updateProduct.mutateAsync({
        ...productValues,
        id: product?.id ?? '',
        pricingMode,
        pricingBreakpoints,
      })
      if (result.ok) {
        toast.success(t('updated'))
        navigate({ to: '/products' })
      } else {
        toast.error(result.error)
      }
    },
  })

  const isSubmitting = useStore(form.store, (state) => state.isSubmitting)

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
        title={t('editTitle')}
        backAction={{ label: ct('back'), href: '/products' }}
        primaryAction={{
          label: t('updateProduct'),
          isLoading: isSubmitting,
          onClick: () => form.handleSubmit(),
        }}
      />
      <FormRoot form={form}>
        <ProductFormFields form={form} />
      </FormRoot>
    </PageContent>
  )
}
