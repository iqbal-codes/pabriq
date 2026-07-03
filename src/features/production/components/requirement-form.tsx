import { useTranslations } from 'use-intl'
import { FormActions, FormRoot, useAppForm } from '#/components/app/form'
import { Button } from '#/components/ui/button'
import type { Requirement } from '../model'

type Responses = Record<string, { value: string; assetIds?: string[] }>

type RequirementFormValue = {
  requirements: Array<{
    id: string
    type: Requirement['type']
    value: string
    numberValue: number | null
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
      assetIds: [],
    })),
  }

  const form = useAppForm({
    defaultValues,
    onSubmit: ({ value }) => {
      const filled: Responses = {}

      value.requirements.forEach((requirementValue) => {
        if (requirementValue.type === 'upload') {
          if (requirementValue.assetIds.length === 0) return

          filled[requirementValue.id] = {
            value: '',
            assetIds: requirementValue.assetIds,
          }
          return
        }

        if (requirementValue.type === 'number') {
          if (requirementValue.numberValue === null) return

          filled[requirementValue.id] = {
            value: String(requirementValue.numberValue),
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
                  optional={req.required}
                />
              )}
            </form.AppField>
          )}
          {req.type === 'number' && (
            <form.AppField name={`requirements[${index}].numberValue`}>
              {(field) => (
                <field.NumberField label={req.label} optional={req.required} />
              )}
            </form.AppField>
          )}
          {req.type === 'upload' && (
            <form.AppField name={`requirements[${index}].assetIds`}>
              {(field) => (
                <field.FileUploadField
                  ownerType="productionTask"
                  ownerId={taskId}
                  usage="attachment"
                  maxFiles={1}
                  optional={req.required}
                  label={req.label}
                />
              )}
            </form.AppField>
          )}
        </div>
      ))}
      <FormActions>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {ct('cancel')}
        </Button>
        <form.AppForm>
          <form.SubmitButton isPending={isSubmitting}>{ct('confirm')}</form.SubmitButton>
        </form.AppForm>
      </FormActions>
    </FormRoot>
  )
}
