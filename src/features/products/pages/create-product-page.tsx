import { useStore } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { FormRoot, useAppForm } from '#/components/app/form'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { ProductFormFields } from '#/features/products/components/product-form-fields'
import { useCreateProduct } from '#/features/products/hooks'
import { productFormSchema } from '#/lib/validation-schemas'

export function CreateProductPage() {
  const navigate = useNavigate()
  const t = useTranslations('products')
  const ct = useTranslations('common')
  const createProduct = useCreateProduct()

  const form = useAppForm({
    defaultValues: {
      name: '',
      description: '',
      productionNotes: '',
      basePrice: 0,
      productionDays: 1,
      minQuantity: 1,
      maxQuantity: undefined as number | undefined,
      pricingMode: 'interpolated' as 'interpolated' | 'step',
      pricingBreakpoints: [] as Array<{
        minQuantity: number
        unitPrice: number
      }>,
    },
    validators: {
      onChange: productFormSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      if (!formApi.state.isValid) return
      const { pricingBreakpoints, pricingMode, ...productValues } = value
      const result = await createProduct.mutateAsync({
        ...productValues,
        pricingMode,
        pricingBreakpoints,
      })
      if (result.ok) {
        toast.success(t('created'))
        navigate({ to: '/products' })
      } else {
        toast.error(result.error)
      }
    },
  })

  const isSubmitting = useStore(form.store, (state) => state.isSubmitting)

  return (
    <PageContent>
      <PageHeader
        title={t('createTitle')}
        backAction={{ label: ct('back'), href: '/products' }}
        primaryAction={{
          label: t('createProduct'),
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
