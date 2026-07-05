import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { FormActions, FormRoot, useAppForm } from '#/components/app/form'
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
      priority: false,
      primaryImageAssetId: null as string | null,
      basePrice: undefined as number | undefined,
      productionDays: 1,
      minQuantity: 1,
      maxQuantity: undefined as number | undefined,
      negotiateAboveQuantity: undefined as number | undefined,
      repeatOrderUnitPrice: undefined as number | undefined,
      repeatOrderMinQuantity: undefined as number | undefined,
      maxProductionQuantity: undefined as number | undefined,
      pricingMode: 'interpolated' as 'interpolated' | 'step',
      pricingBreakpoints: [] as Array<{
        minQuantity: number
        unitPrice: number | undefined
      }>,
      productAddons: [] as Array<{
        name: string
        unitSurcharge: number | undefined
      }>,
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
      const result = await createProduct.mutateAsync({
        ...productValues,
        pricingMode,
        pricingBreakpoints,
        productAddons,
      })
      if (result.ok) {
        toast.success(t('created'))
        navigate({ to: '/products' })
      } else {
        toast.error(result.error)
      }
    },
  })

  return (
    <PageContent>
      <PageHeader
        title={t('createTitle')}
        backAction={{ label: ct('back'), href: '/products' }}
      />
      <h1 className="text-2xl font-semibold tracking-tight md:hidden">
        {t('createTitle')}
      </h1>
      <FormRoot form={form}>
        <ProductFormFields form={form} />
        <FormActions align="stacked">
          <form.AppForm>
            <form.SubmitButton>{t('createProduct')}</form.SubmitButton>
          </form.AppForm>
        </FormActions>
      </FormRoot>
    </PageContent>
  )
}
