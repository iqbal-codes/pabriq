import { Plus, Trash2 } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { FormGrid, FormSection, withForm } from '#/components/app/form'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'
import { Label } from '#/components/ui/label'
import type { ProductTemplateConfiguration, TemplateFieldType } from '../config'
import { TEMPLATE_FIELD_TYPES } from '../config'

export type ProductTemplateFormValues = {
  name: string
  description: string
  category: string
  productionNotes: string
  configuration: ProductTemplateConfiguration
}

export function createDefaultProductTemplateFormValues(): ProductTemplateFormValues {
  return {
    name: '',
    description: '',
    category: '',
    productionNotes: '',
    configuration: {
      itemizationMode: 'uniform',
      fields: [],
      pricing: { basePrice: 0, productionDays: 1, minQuantity: 1 },
      production: { notes: null },
      workflowStages: [],
      bom: [],
    },
  }
}

const FIELD_TYPE_LABEL_KEYS = {
  text: 'fields.typeText',
  text_per_item: 'fields.typeTextPerItem',
  number_per_item: 'fields.typeNumberPerItem',
  select: 'fields.typeSelect',
  file: 'fields.typeFile',
  matrix: 'fields.typeMatrix',
} as const satisfies Record<TemplateFieldType, string>

const BOARD_OPTIONS = [
  { value: 'pre_production', labelKey: 'stages.boardPreProduction' },
  { value: 'production', labelKey: 'stages.boardProduction' },
] as const

const BOM_BASIS_OPTIONS = [
  { value: 'per_order', labelKey: 'bom.basisPerOrder' },
  { value: 'per_item', labelKey: 'bom.basisPerItem' },
  { value: 'matrix', labelKey: 'bom.basisMatrix' },
  { value: 'per_item_field', labelKey: 'bom.basisPerItemField' },
] as const

export const ProductTemplateFormFields = withForm({
  defaultValues: createDefaultProductTemplateFormValues(),
  render: function Render({ form }) {
    const t = useTranslations('productTemplates')

    const fieldTypeOptions = TEMPLATE_FIELD_TYPES.map((type) => ({
      value: type,
      label: t(FIELD_TYPE_LABEL_KEYS[type]),
    }))
    const boardOptions = BOARD_OPTIONS.map((option) => ({
      value: option.value,
      label: t(option.labelKey),
    }))
    const bomBasisOptions = BOM_BASIS_OPTIONS.map((option) => ({
      value: option.value,
      label: t(option.labelKey),
    }))

    return (
      <div className="space-y-6">
        <FormSection title={t('title')} titleHidden>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <FormGrid columns={1}>
                <form.AppField name="name">
                  {(field) => (
                    <field.TextField
                      label={t('name')}
                      placeholder={t('namePlaceholder')}
                    />
                  )}
                </form.AppField>
                <form.AppField name="category">
                  {(field) => (
                    <field.TextField
                      label={t('category')}
                      placeholder={t('categoryPlaceholder')}
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
              </FormGrid>
            </CardContent>
          </Card>
        </FormSection>

        <FormSection title={t('configurationSummary')} titleHidden>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('configurationSummary')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <FormGrid columns={1}>
                <form.AppField name="configuration.itemizationMode">
                  {(field) => (
                    <field.SelectField
                      label={t('itemizationMode')}
                      options={[
                        { value: 'uniform', label: t('itemizationUniform') },
                        { value: 'matrix', label: t('itemizationMatrix') },
                        { value: 'per_item', label: t('itemizationPerItem') },
                      ]}
                    />
                  )}
                </form.AppField>
                <form.AppField name="configuration.pricing.basePrice">
                  {(field) => <field.NumberField label={t('basePrice')} />}
                </form.AppField>
                <form.AppField name="configuration.pricing.productionDays">
                  {(field) => <field.NumberField label={t('productionDays')} />}
                </form.AppField>
                <form.AppField name="configuration.pricing.minQuantity">
                  {(field) => <field.NumberField label={t('minQuantity')} />}
                </form.AppField>
                <form.AppField name="productionNotes">
                  {(field) => (
                    <field.TextareaField
                      label={t('productionNotes')}
                      optional
                    />
                  )}
                </form.AppField>
              </FormGrid>

              {/* Custom fields editor */}
              <div className="space-y-4 pt-6 border-t">
                <form.AppField name="configuration.fields" mode="array">
                  {(fieldsField) => (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                          {t('fields.title')}
                        </h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            fieldsField.pushValue({
                              key: '',
                              type: 'text',
                              label: '',
                              required: false,
                            })
                          }
                        >
                          <Plus className="size-4 mr-1" />
                          {t('fields.add')}
                        </Button>
                      </div>
                      {fieldsField.state.value.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {t('fields.empty')}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {fieldsField.state.value.map((fieldDef) => {
                            const idx =
                              fieldsField.state.value.indexOf(fieldDef)
                            return (
                              <div
                                key={idx}
                                className="space-y-3 rounded-lg border p-3"
                              >
                                <FormGrid columns={2}>
                                  <form.AppField
                                    name={`configuration.fields[${idx}].key`}
                                  >
                                    {(field) => (
                                      <field.TextField
                                        label={t('fields.key')}
                                      />
                                    )}
                                  </form.AppField>
                                  <form.AppField
                                    name={`configuration.fields[${idx}].label`}
                                  >
                                    {(field) => (
                                      <field.TextField
                                        label={t('fields.label')}
                                      />
                                    )}
                                  </form.AppField>
                                </FormGrid>
                                <FormGrid columns={2}>
                                  <form.AppField
                                    name={`configuration.fields[${idx}].type`}
                                  >
                                    {(field) => (
                                      <field.SelectField
                                        label={t('fields.type')}
                                        options={fieldTypeOptions}
                                      />
                                    )}
                                  </form.AppField>
                                  <form.AppField
                                    name={`configuration.fields[${idx}].required`}
                                  >
                                    {(field) => (
                                      <div className="flex items-center gap-2 pt-6">
                                        <Checkbox
                                          id={`configuration.fields[${idx}].required`}
                                          checked={field.state.value}
                                          onCheckedChange={(checked) =>
                                            field.handleChange(checked === true)
                                          }
                                        />
                                        <Label
                                          htmlFor={`configuration.fields[${idx}].required`}
                                          className="text-sm font-medium cursor-pointer"
                                        >
                                          {t('fields.required')}
                                        </Label>
                                      </div>
                                    )}
                                  </form.AppField>
                                </FormGrid>
                                {fieldDef.type === 'select' && (
                                  <form.AppField
                                    name={`configuration.fields[${idx}].options`}
                                  >
                                    {(field) => {
                                      const options = field.state.value ?? []
                                      return (
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <Label className="text-sm font-medium">
                                              {t('fields.options')}
                                            </Label>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={() =>
                                                field.handleChange([
                                                  ...options,
                                                  '',
                                                ])
                                              }
                                            >
                                              <Plus className="size-4 mr-1" />
                                              {t('fields.addOption')}
                                            </Button>
                                          </div>
                                          {options.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">
                                              {t('fields.noOptions')}
                                            </p>
                                          ) : (
                                            <div className="space-y-2">
                                              {options.map((option, optIdx) => (
                                                <div
                                                  key={
                                                    option || `option-${optIdx}`
                                                  }
                                                  className="flex items-end gap-2"
                                                >
                                                  <div className="flex-1">
                                                    <form.AppField
                                                      name={`configuration.fields[${idx}].options[${optIdx}]`}
                                                    >
                                                      {(optionField) => (
                                                        <optionField.TextField
                                                          label={t(
                                                            'fields.option',
                                                          )}
                                                        />
                                                      )}
                                                    </form.AppField>
                                                  </div>
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={t(
                                                      'fields.removeOption',
                                                    )}
                                                    onClick={() =>
                                                      field.handleChange(
                                                        options.filter(
                                                          (_, i) =>
                                                            i !== optIdx,
                                                        ),
                                                      )
                                                    }
                                                    className="mb-0.5"
                                                  >
                                                    <Trash2 className="size-4" />
                                                  </Button>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    }}
                                  </form.AppField>
                                )}
                                <div className="flex justify-end">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => fieldsField.removeValue(idx)}
                                  >
                                    <Trash2 className="size-4 mr-1" />
                                    {t('fields.remove')}
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </form.AppField>
              </div>

              {/* Workflow stages editor */}
              <div className="space-y-4 pt-6 border-t">
                <form.AppField name="configuration.workflowStages" mode="array">
                  {(stagesField) => (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                          {t('stages.title')}
                        </h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const current = stagesField.state.value
                            stagesField.pushValue({
                              key: '',
                              label: '',
                              board: 'pre_production',
                              position: current.length,
                            })
                          }}
                        >
                          <Plus className="size-4 mr-1" />
                          {t('stages.add')}
                        </Button>
                      </div>
                      {stagesField.state.value.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {t('stages.empty')}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {stagesField.state.value.map((stage) => {
                            const idx = stagesField.state.value.indexOf(stage)
                            return (
                              <div
                                key={idx}
                                className="space-y-3 rounded-lg border p-3"
                              >
                                <FormGrid columns={2}>
                                  <form.AppField
                                    name={`configuration.workflowStages[${idx}].key`}
                                  >
                                    {(field) => (
                                      <field.TextField
                                        label={t('stages.key')}
                                      />
                                    )}
                                  </form.AppField>
                                  <form.AppField
                                    name={`configuration.workflowStages[${idx}].label`}
                                  >
                                    {(field) => (
                                      <field.TextField
                                        label={t('stages.label')}
                                      />
                                    )}
                                  </form.AppField>
                                </FormGrid>
                                <FormGrid columns={2}>
                                  <form.AppField
                                    name={`configuration.workflowStages[${idx}].board`}
                                  >
                                    {(field) => (
                                      <field.SelectField
                                        label={t('stages.board')}
                                        options={boardOptions}
                                      />
                                    )}
                                  </form.AppField>
                                  <form.AppField
                                    name={`configuration.workflowStages[${idx}].position`}
                                  >
                                    {(field) => (
                                      <field.NumberField
                                        label={t('stages.position')}
                                      />
                                    )}
                                  </form.AppField>
                                </FormGrid>
                                <div className="flex justify-end">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => stagesField.removeValue(idx)}
                                  >
                                    <Trash2 className="size-4 mr-1" />
                                    {t('stages.remove')}
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </form.AppField>
              </div>

              {/* BOM editor */}
              <div className="space-y-4 pt-6 border-t">
                <form.AppField name="configuration.bom" mode="array">
                  {(bomField) => (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                          {t('bom.title')}
                        </h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            bomField.pushValue({
                              materialId: '',
                              basis: 'per_order',
                              quantity: 0,
                              unit: '',
                              wastePercent: 0,
                              critical: false,
                            })
                          }
                        >
                          <Plus className="size-4 mr-1" />
                          {t('bom.add')}
                        </Button>
                      </div>
                      {bomField.state.value.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {t('bom.empty')}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {bomField.state.value.map((item) => {
                            const idx = bomField.state.value.indexOf(item)
                            return (
                              <div
                                key={idx}
                                className="space-y-3 rounded-lg border p-3"
                              >
                                <FormGrid columns={2}>
                                  <form.AppField
                                    name={`configuration.bom[${idx}].materialId`}
                                  >
                                    {(field) => (
                                      <field.TextField
                                        label={t('bom.materialId')}
                                      />
                                    )}
                                  </form.AppField>
                                  <form.AppField
                                    name={`configuration.bom[${idx}].basis`}
                                  >
                                    {(field) => (
                                      <field.SelectField
                                        label={t('bom.basis')}
                                        options={bomBasisOptions}
                                      />
                                    )}
                                  </form.AppField>
                                </FormGrid>
                                <FormGrid columns={3}>
                                  <form.AppField
                                    name={`configuration.bom[${idx}].quantity`}
                                  >
                                    {(field) => (
                                      <field.NumberField
                                        label={t('bom.quantity')}
                                      />
                                    )}
                                  </form.AppField>
                                  <form.AppField
                                    name={`configuration.bom[${idx}].unit`}
                                  >
                                    {(field) => (
                                      <field.TextField label={t('bom.unit')} />
                                    )}
                                  </form.AppField>
                                  <form.AppField
                                    name={`configuration.bom[${idx}].wastePercent`}
                                  >
                                    {(field) => (
                                      <field.NumberField
                                        label={t('bom.wastePercent')}
                                      />
                                    )}
                                  </form.AppField>
                                </FormGrid>
                                {item.basis === 'per_item_field' && (
                                  <form.AppField
                                    name={`configuration.bom[${idx}].fieldKey`}
                                  >
                                    {(field) => (
                                      <field.TextField
                                        label={t('bom.fieldKey')}
                                      />
                                    )}
                                  </form.AppField>
                                )}
                                <form.AppField
                                  name={`configuration.bom[${idx}].critical`}
                                >
                                  {(field) => (
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        id={`configuration.bom[${idx}].critical`}
                                        checked={field.state.value}
                                        onCheckedChange={(checked) =>
                                          field.handleChange(checked === true)
                                        }
                                      />
                                      <Label
                                        htmlFor={`configuration.bom[${idx}].critical`}
                                        className="text-sm font-medium cursor-pointer"
                                      >
                                        {t('bom.critical')}
                                      </Label>
                                    </div>
                                  )}
                                </form.AppField>
                                <div className="flex justify-end">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => bomField.removeValue(idx)}
                                  >
                                    <Trash2 className="size-4 mr-1" />
                                    {t('bom.remove')}
                                  </Button>
                                </div>
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
