import type * as React from 'react'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { z } from 'zod'
import {
  FormActions,
  FormRoot,
  FormSheet,
  useAppForm,
} from '#/components/app/form'
import { Button } from '#/components/ui/button'
import {
  useCreateProductTemplate,
  useUpdateProductTemplate,
} from '#/features/product-templates/hooks'
import type { ProductTemplate } from '#/features/product-templates/model'
import { bomSchema, fieldSchema, workflowStageSchema } from '../config'
import {
  createDefaultProductTemplateFormValues,
  ProductTemplateFormFields,
  type ProductTemplateFormValues,
} from './product-template-form-fields'

export type ProductTemplateFormMode =
  | { type: 'create' }
  | { type: 'edit'; id: string }

export type ProductTemplateFormDialogProps = {
  mode: ProductTemplateFormMode
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: ProductTemplate | null
}

function getDefaults(
  template: ProductTemplate | null | undefined,
): ProductTemplateFormValues {
  if (!template) {
    return createDefaultProductTemplateFormValues()
  }
  return {
    name: template.name,
    description: template.description ?? '',
    category: template.category ?? '',
    productionNotes: template.configuration.production.notes ?? '',
    configuration: template.configuration,
  }
}

function ProductTemplateFormDialogInner({
  mode,
  onOpenChange,
  template,
}: {
  mode: ProductTemplateFormMode
  onOpenChange: (open: boolean) => void
  template?: ProductTemplate | null
}) {
  const t = useTranslations('productTemplates')
  const ct = useTranslations('common')
  const createTemplate = useCreateProductTemplate()
  const updateTemplate = useUpdateProductTemplate()
  const isEdit = mode.type === 'edit'

  const formSchema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1, t('validation.nameRequired')),
        description: z.string(),
        category: z.string(),
        productionNotes: z.string(),
        configuration: z.object({
          itemizationMode: z.enum(['uniform', 'matrix', 'per_item'], {
            message: t('validation.invalidConfiguration'),
          }),
          fields: z.array(fieldSchema),
          pricing: z.object({
            basePrice: z.number().min(0, t('validation.basePriceNonNegative')),
            productionDays: z
              .number()
              .min(1, t('validation.productionDaysPositive')),
            minQuantity: z.number().min(1, t('validation.minQuantityPositive')),
          }),
          production: z.object({ notes: z.string().nullable() }),
          workflowStages: z.array(workflowStageSchema),
          bom: z.array(bomSchema),
        }),
      }),
    [t],
  )

  const form = useAppForm({
    defaultValues: getDefaults(template),
    validators: {
      onChange: formSchema,
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      const configuration = {
        ...value.configuration,
        production: {
          notes: value.productionNotes || null,
        },
      }
      if (isEdit && template) {
        const result = await updateTemplate.mutateAsync({
          id: template.id,
          name: value.name,
          description: value.description || null,
          category: value.category || null,
          configuration,
        })
        if (!result.ok) {
          toast.error(t('mutationFailed'))
          return
        }
        toast.success(t('updated'))
      } else {
        const result = await createTemplate.mutateAsync({
          name: value.name,
          description: value.description || null,
          category: value.category || null,
          configuration,
        })
        if (!result.ok) {
          toast.error(t('mutationFailed'))
          return
        }
        toast.success(t('created'))
      }
      onOpenChange(false)
    },
  })

  return (
    <FormSheet
      open={true}
      onOpenChange={onOpenChange}
      title={isEdit ? t('edit') : t('create')}
    >
      <FormRoot form={form} className="flex min-h-0 flex-1 flex-col space-y-0">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <ProductTemplateFormFields form={form} />
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
            <form.SubmitButton
              isPending={createTemplate.isPending || updateTemplate.isPending}
            >
              {isEdit ? t('edit') : t('create')}
            </form.SubmitButton>
          </form.AppForm>
        </FormActions>
      </FormRoot>
    </FormSheet>
  )
}

export function ProductTemplateFormDialog({
  mode,
  open,
  onOpenChange,
  template,
}: ProductTemplateFormDialogProps): React.ReactNode {
  if (!open) return null

  return (
    <ProductTemplateFormDialogInner
      key={template?.id ?? 'new'}
      mode={mode}
      onOpenChange={onOpenChange}
      template={template}
    />
  )
}
