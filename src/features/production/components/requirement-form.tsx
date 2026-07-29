import { useTranslations } from 'use-intl'
import { FormActions, FormRoot, useAppForm } from '#/components/app/form'
import { Button } from '#/components/ui/button'
import type { Requirement } from '../model'

type Responses = Record<
  string,
  {
    value?: string
    pass?: boolean
    numericValue?: number
    unit?: string
    notes?: string
    assetIds?: string[]
  }
>

type RequirementFormValue = {
  requirements: Array<{
    id: string
    type: Requirement['type']
    value: string
    numberValue: number | null
    pass: boolean
    notes: string
    assetIds: string[]
  }>
}

type Props = {
  taskId: string
  requirements: Requirement[]
  onCancel: () => void
  onSubmit: (responses: Responses) => void
  isSubmitting?: boolean
}

export function RequirementForm({
  taskId,
  requirements,
  onCancel,
  onSubmit,
  isSubmitting = false,
}: Props) {
  const t = useTranslations('production')
  const ct = useTranslations('common')
  const defaultValues: RequirementFormValue = {
    requirements: requirements.map((requirement) => ({
      id: requirement.id,
      type: requirement.type,
      value: '',
      numberValue: null,
      pass: true,
      notes: '',
      assetIds: [],
    })),
  }

  const form = useAppForm({
    defaultValues,
    onSubmit: ({ value }) => {
      const filled: Responses = {}

      value.requirements.forEach((requirementValue) => {
        const reqDef = requirements.find((r) => r.id === requirementValue.id)
        if (
          requirementValue.type === 'upload' ||
          requirementValue.type === 'photo'
        ) {
          if (requirementValue.assetIds.length === 0) return
          filled[requirementValue.id] = {
            value: '',
            assetIds: requirementValue.assetIds,
          }
          return
        }

        if (
          requirementValue.type === 'number' ||
          requirementValue.type === 'measurement'
        ) {
          if (requirementValue.numberValue === null && !requirementValue.value)
            return
          filled[requirementValue.id] = {
            value:
              requirementValue.value ||
              String(requirementValue.numberValue ?? ''),
            numericValue:
              requirementValue.numberValue ??
              (requirementValue.value
                ? Number.parseFloat(requirementValue.value)
                : undefined),
            unit: reqDef?.unit,
          }
          return
        }

        if (requirementValue.type === 'pass_fail') {
          filled[requirementValue.id] = {
            pass: requirementValue.pass,
            value: requirementValue.pass ? 'pass' : 'fail',
          }
          return
        }

        if (requirementValue.type === 'non_conformance') {
          if (!requirementValue.value && !requirementValue.notes) return
          filled[requirementValue.id] = {
            value: requirementValue.value || requirementValue.notes,
            notes: requirementValue.notes,
          }
          return
        }

        if (!requirementValue.value) return
        filled[requirementValue.id] = {
          value: requirementValue.value,
        }
      })
      onSubmit(filled)
    },
  })

  return (
    <FormRoot form={form} className="space-y-4">
      <h3 className="font-semibold">{t('completeRequirements')}</h3>
      {requirements.map((req, index) => (
        <div key={req.id}>
          {req.type === 'text' && (
            <form.AppField name={`requirements[${index}].value`}>
              {(field) => (
                <field.TextareaField
                  label={req.label}
                  optional={!req.required}
                  optionalLabel={` (${t('requirementOptional')})`}
                  requiredLabel={` (${t('requirementRequired')})`}
                />
              )}
            </form.AppField>
          )}
          {(req.type === 'number' || req.type === 'measurement') && (
            <form.AppField name={`requirements[${index}].numberValue`}>
              {(field) => (
                <field.NumberField
                  label={req.unit ? `${req.label} (${req.unit})` : req.label}
                  optional={!req.required}
                  optionalLabel={` (${t('requirementOptional')})`}
                  requiredLabel={` (${t('requirementRequired')})`}
                />
              )}
            </form.AppField>
          )}
          {req.type === 'pass_fail' && (
            <form.AppField name={`requirements[${index}].pass`}>
              {(field) => (
                <div className="flex items-center justify-between py-2 border rounded p-3">
                  <span className="text-sm font-medium">{req.label}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant={field.state.value ? 'default' : 'destructive'}
                    onClick={() => field.handleChange(!field.state.value)}
                  >
                    {field.state.value ? 'PASS' : 'FAIL'}
                  </Button>
                </div>
              )}
            </form.AppField>
          )}
          {req.type === 'non_conformance' && (
            <form.AppField name={`requirements[${index}].notes`}>
              {(field) => (
                <field.TextareaField
                  label={req.label}
                  placeholder="Record non-conformance notes or defect details..."
                  optional={!req.required}
                  optionalLabel={` (${t('requirementOptional')})`}
                  requiredLabel={` (${t('requirementRequired')})`}
                />
              )}
            </form.AppField>
          )}
          {(req.type === 'upload' || req.type === 'photo') && (
            <form.AppField name={`requirements[${index}].assetIds`}>
              {(field) => (
                <field.FileUploadField
                  ownerType="productionTask"
                  ownerId={taskId}
                  usage="attachment"
                  maxFiles={1}
                  optional={!req.required}
                  optionalLabel={` (${t('requirementOptional')})`}
                  requiredLabel={` (${t('requirementRequired')})`}
                  label={req.label}
                />
              )}
            </form.AppField>
          )}
        </div>
      ))}
      <FormActions>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {ct('cancel')}
        </Button>
        <form.AppForm>
          <form.SubmitButton isPending={isSubmitting}>
            {ct('confirm')}
          </form.SubmitButton>
        </form.AppForm>
      </FormActions>
    </FormRoot>
  )
}
