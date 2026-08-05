import { Plus, Trash2 } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { FormGrid, FormSection, withForm } from '#/components/app/form'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Switch } from '#/components/ui/switch'
import type { ProductTemplate } from '#/features/product-templates/model'

export const ProductFormFields = withForm({
  defaultValues: {
    productTemplateId: '',
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
  props: {} as {
    templates: ProductTemplate[]
    isTemplatesLoading: boolean
    isEdit: boolean
    sourceTemplateName?: string | null
    onTemplateChange?: (templateId: string) => void
  },
  render: function Render({
    form,
    templates,
    isTemplatesLoading,
    isEdit,
    sourceTemplateName,
    onTemplateChange,
  }) {
    const t = useTranslations('products')

    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <FormSection title={t('productInfo')} titleHidden>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('productInfo')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form.AppField name="productTemplateId">
                {(field) => (
                  <div className="space-y-2">
                    <field.SelectField
                      label={t('template')}
                      placeholder={t('templatePlaceholder')}
                      options={templates.map((template) => ({
                        value: template.id,
                        label: template.name,
                      }))}
                      disabled={isEdit || isTemplatesLoading}
                      onValueChange={onTemplateChange}
                    />
                    {isEdit && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          {sourceTemplateName ?? t('templateNoSource')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('templateSourceDescription')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </form.AppField>
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
                      optional
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
                        <span className="text-sm font-medium">
                          {t('priority')}
                        </span>
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
            </CardContent>
          </Card>
        </FormSection>

        {/* Section 2: Pricing & Quantities */}
        <FormSection title={t('pricingAndOrders')} titleHidden>
          <div className="space-y-6">
            {/* Card 1: Base Pricing & Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t('pricingAndOrders')}
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {/* Section 3: Advanced Pricing & Configurations */}
          </div>
        </FormSection>
        <FormSection title={t('advancedSettings')} titleHidden>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('advancedSettings')}
              </CardTitle>
              <CardDescription>
                {t('advancedSettingsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Group A: Repeat Orders & Negotiation */}
              <div className="space-y-6">
                <FormGrid columns={2}>
                  <form.AppField name="repeatOrderUnitPrice">
                    {(field) => (
                      <div className="space-y-1">
                        <field.NumberField label={t('repeatOrderUnitPrice')} />
                        <p className="text-xs text-muted-foreground">
                          {t('repeatOrderUnitPriceDescription')}
                        </p>
                      </div>
                    )}
                  </form.AppField>
                  <form.AppField name="repeatOrderMinQuantity">
                    {(field) => (
                      <div className="space-y-1">
                        <field.NumberField
                          label={t('repeatOrderMinQuantity')}
                        />
                        <p className="text-xs text-muted-foreground">
                          {t('repeatOrderMinQuantityDescription')}
                        </p>
                      </div>
                    )}
                  </form.AppField>
                </FormGrid>

                <FormGrid columns={2}>
                  <form.AppField name="negotiateAboveQuantity">
                    {(field) => (
                      <div className="space-y-1">
                        <field.NumberField
                          label={t('negotiateAboveQuantity')}
                        />
                        <p className="text-xs text-muted-foreground">
                          {t('negotiateAboveQuantityDescription')}
                        </p>
                      </div>
                    )}
                  </form.AppField>
                  <form.AppField name="maxProductionQuantity">
                    {(field) => (
                      <div className="space-y-1">
                        <field.NumberField label={t('maxProductionQuantity')} />
                        <p className="text-xs text-muted-foreground">
                          {t('maxProductionQuantityDescription')}
                        </p>
                      </div>
                    )}
                  </form.AppField>
                </FormGrid>
              </div>

              {/* Group B: Volume Pricing (Breakpoints) */}
              <div className="space-y-4 pt-6 border-t">
                <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  {t('pricing.title')}
                </h4>
                <form.AppField name="pricingMode">
                  {(field) => (
                    <div className="flex items-center justify-between rounded-lg border p-3">
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

                <form.AppField name="pricingBreakpoints" mode="array">
                  {(breakpointsField) => (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-medium text-muted-foreground">
                          {t('pricing.breakpoints')}
                        </h5>
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
                              unitPrice: undefined as number | undefined,
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
                        <div className="space-y-3">
                          {breakpointsField.state.value.map((bp) => {
                            const idx = breakpointsField.state.value.indexOf(bp)
                            return (
                              <div key={idx} className="flex items-end gap-3">
                                <div className="flex-1">
                                  <form.AppField
                                    name={`pricingBreakpoints[${idx}].minQuantity`}
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
                                    name={`pricingBreakpoints[${idx}].unitPrice`}
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
                                    breakpointsField.removeValue(idx)
                                  }
                                  className="mb-0.5"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </form.AppField>
              </div>

              {/* Group C: Customization (Add-ons) */}
              <div className="space-y-4 pt-6 border-t">
                <form.AppField name="productAddons" mode="array">
                  {(addonsField) => (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                          {t('addons.title')}
                        </h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            addonsField.pushValue({
                              name: '',
                              unitSurcharge: undefined as number | undefined,
                            })
                          }}
                        >
                          <Plus className="size-4 mr-1" />
                          {t('addons.addAddon')}
                        </Button>
                      </div>
                      {addonsField.state.value.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {t('addons.noAddons')}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {addonsField.state.value.map((addon) => {
                            const idx = addonsField.state.value.indexOf(addon)
                            return (
                              <div key={idx} className="flex items-end gap-3">
                                <div className="flex-1">
                                  <form.AppField
                                    name={`productAddons[${idx}].name`}
                                  >
                                    {(field) => (
                                      <field.TextField
                                        label={t('addons.name')}
                                      />
                                    )}
                                  </form.AppField>
                                </div>
                                <div className="flex-1">
                                  <form.AppField
                                    name={`productAddons[${idx}].unitSurcharge`}
                                  >
                                    {(field) => (
                                      <field.NumberField
                                        label={t('addons.unitSurcharge')}
                                      />
                                    )}
                                  </form.AppField>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => addonsField.removeValue(idx)}
                                  className="mb-0.5"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </form.AppField>
              </div>
            </CardContent>
          </Card>
        </FormSection>
      </div>
    )
  },
})
