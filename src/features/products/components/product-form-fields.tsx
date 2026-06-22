import { Plus, Trash2 } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { FormGrid, FormSection, withForm } from '#/components/app/form'
import { Button } from '#/components/ui/button'
import { Switch } from '#/components/ui/switch'

export const ProductFormFields = withForm({
  defaultValues: {
    name: '',
    description: '',
    productionNotes: '',
    priority: false,
    primaryImageAssetId: null as string | null,
    basePrice: 0,
    productionDays: 1,
    minQuantity: 1,
    maxQuantity: undefined as number | undefined,
    pricingMode: 'interpolated' as 'interpolated' | 'step',
    pricingBreakpoints: [] as Array<{ minQuantity: number; unitPrice: number }>,
  },
  render: function Render({ form }) {
    const t = useTranslations('products')

    return (
      <>
        <FormSection title={t('productInfo')}>
          <FormGrid columns={1}>
            <form.AppField name="name">
              {(field) => (
                <field.TextField
                  label={t('name')}
                  placeholder={t('namePlaceholder')}
                />
              )}
            </form.AppField>
            <form.AppField name="description">
              {(field) => (
                <field.TextareaField
                  label={t('description')}
                  placeholder={t('descriptionPlaceholder')}
                />
              )}
            </form.AppField>
            <form.AppField name="productionDays">
              {(field) => <field.NumberField label={t('productionDays')} />}
            </form.AppField>
            <form.AppField name="priority">
              {(field) => (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium">{t('priority')}</span>
                    <p className="text-xs text-muted-foreground">
                      {t('priorityDescription')}
                    </p>
                  </div>
                  <Switch
                    aria-label={t('priority')}
                    checked={field.state.value}
                    onCheckedChange={field.handleChange}
                  />
                </div>
              )}
            </form.AppField>
            <form.AppField name="primaryImageAssetId">
              {(field) => (
                <field.PhotoUploadField
                  label={t('photo')}
                  ownerType="product"
                  usage="gallery"
                  maxFiles={1}
                />
              )}
            </form.AppField>
          </FormGrid>
        </FormSection>
        <FormSection title={t('pricingAndOrders')}>
          <FormGrid columns={3}>
            <form.AppField name="basePrice">
              {(field) => <field.NumberField label={t('basePrice')} />}
            </form.AppField>
            <form.AppField name="minQuantity">
              {(field) => <field.NumberField label={t('minQuantity')} />}
            </form.AppField>
            <form.AppField name="maxQuantity">
              {(field) => <field.NumberField label={t('maxQuantity')} />}
            </form.AppField>
          </FormGrid>

          {/* Pricing mode toggle */}
          <form.AppField name="pricingMode">
            {(field) => (
              <div className="mt-4 flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium">
                    {t('pricing.interpolate')}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {field.state.value === 'interpolated'
                      ? t('pricing.interpolateOn')
                      : t('pricing.interpolateOff')}
                  </p>
                </div>
                <Switch
                  checked={field.state.value === 'interpolated'}
                  onCheckedChange={(checked) =>
                    field.handleChange(checked ? 'interpolated' : 'step')
                  }
                />
              </div>
            )}
          </form.AppField>

          {/* Pricing breakpoints */}
          <div className="mt-6">
            <form.AppField name="pricingBreakpoints" mode="array">
              {(breakpointsField) => (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">
                      {t('pricing.breakpoints')}
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const current = breakpointsField.state.value
                        const baseQty = form.state.values.minQuantity ?? 1
                        const nextMinQty =
                          current.length > 0
                            ? current[current.length - 1].minQuantity + 1
                            : baseQty + 1
                        breakpointsField.pushValue({
                          minQuantity: nextMinQty,
                          unitPrice: 0,
                        })
                      }}
                    >
                      <Plus className="size-4 mr-1" />
                      {t('pricing.addBreakpoint')}
                    </Button>
                  </div>
                  {breakpointsField.state.value.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t('pricing.noBreakpoints')}
                    </p>
                  ) : (
                    breakpointsField.state.value.map((bp) => (
                      <div
                        key={breakpointsField.state.value.indexOf(bp)}
                        className="flex items-end gap-3"
                      >
                        <div className="flex-1">
                          <form.AppField
                            name={`pricingBreakpoints[${breakpointsField.state.value.indexOf(bp)}].minQuantity`}
                          >
                            {(field) => (
                              <field.NumberField
                                label={t('pricing.minQuantity')}
                              />
                            )}
                          </form.AppField>
                        </div>
                        <div className="flex-1">
                          <form.AppField
                            name={`pricingBreakpoints[${breakpointsField.state.value.indexOf(bp)}].unitPrice`}
                          >
                            {(field) => (
                              <field.NumberField
                                label={t('pricing.unitPrice')}
                              />
                            )}
                          </form.AppField>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            breakpointsField.removeValue(
                              breakpointsField.state.value.indexOf(bp),
                            )
                          }
                          className="mb-0.5"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </form.AppField>
          </div>
        </FormSection>
      </>
    )
  },
})
