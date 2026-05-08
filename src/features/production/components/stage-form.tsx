import { useTranslations } from 'use-intl'
import { FormGrid, FormRoot, useAppForm } from '#/components/app/form'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { Switch } from '#/components/ui/switch'
import { useStageMutations } from '../hooks'
import type { Requirement, Stage } from '../model'

type Props = {
  stage?: Stage
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StageForm({ stage, open, onOpenChange }: Props) {
  const t = useTranslations('production')
  const ct = useTranslations('common')
  const { createStage, updateStage } = useStageMutations()

  const form = useAppForm({
    defaultValues: {
      name: stage?.name ?? '',
      description: stage?.description ?? '',
      needApproval: stage?.needApproval ?? false,
      requirements: (stage?.requirements as Requirement[]) ?? [],
    },
    onSubmit: async ({ value }) => {
      if (stage) {
        await updateStage.mutateAsync({
          id: stage.id,
          name: value.name,
          description: value.description || undefined,
          needApproval: value.needApproval,
          requirements: value.requirements as Requirement[],
        })
      } else {
        await createStage.mutateAsync({
          name: value.name,
          description: value.description || undefined,
          needApproval: value.needApproval,
          requirements: value.requirements as Requirement[],
        })
      }
      onOpenChange(false)
    },
  })

  const canSubmit =
    !form.state.isSubmitting && form.state.values.name.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{stage ? t('editStage') : t('addStage')}</DialogTitle>
          <DialogDescription>
            {t('stageDescriptionPlaceholder')}
          </DialogDescription>
        </DialogHeader>

        <FormRoot form={form}>
          <FormGrid columns={1} className="py-4">
            <form.AppField name="name">
              {(field) => <field.TextField label={t('stageName')} />}
            </form.AppField>

            <form.AppField name="description">
              {(field) => (
                <field.TextareaField
                  label={t('stageDescription')}
                  placeholder={t('stageDescriptionPlaceholder')}
                />
              )}
            </form.AppField>

            <form.AppField name="needApproval">
              {(field) => (
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('needApproval')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('needApprovalHint')}
                    </p>
                  </div>
                  <Switch
                    checked={field.state.value}
                    onCheckedChange={(v) => field.handleChange(v)}
                  />
                </div>
              )}
            </form.AppField>

            <form.AppField name="requirements" mode="array">
              {(requirementsField) => (
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <Label>{t('requirements')}</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() =>
                        requirementsField.pushValue({
                          id: crypto.randomUUID(),
                          label: '',
                          type: 'text' as const,
                          required: false,
                        } as Requirement)
                      }
                    >
                      {t('addRequirement')}
                    </Button>
                  </div>

                  {requirementsField.state.value.map(
                    (req: Requirement, i: number) => (
                      <div
                        key={req.id}
                        className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end"
                      >
                        <form.AppField name={`requirements[${i}].label`}>
                          {(subField) => (
                            <div className="grid gap-1">
                              <Label className="text-xs">
                                {t('requirementLabel')}
                              </Label>
                              <subField.TextField />
                            </div>
                          )}
                        </form.AppField>

                        <form.AppField name={`requirements[${i}].type`}>
                          {(subField) => (
                            <div className="grid gap-1">
                              <Label className="text-xs">
                                {t('requirementType')}
                              </Label>
                              <NativeSelect
                                value={subField.state.value}
                                onChange={(e) =>
                                  subField.handleChange(
                                    e.target.value as
                                      | 'text'
                                      | 'number'
                                      | 'upload',
                                  )
                                }
                              >
                                <NativeSelectOption value="text">
                                  {t('requirementTypeText')}
                                </NativeSelectOption>
                                <NativeSelectOption value="number">
                                  {t('requirementTypeNumber')}
                                </NativeSelectOption>
                                <NativeSelectOption value="upload">
                                  {t('requirementTypeUpload')}
                                </NativeSelectOption>
                              </NativeSelect>
                            </div>
                          )}
                        </form.AppField>

                        <form.AppField name={`requirements[${i}].required`}>
                          {(subField) => (
                            <div className="flex items-center gap-1 pb-1">
                              <Switch
                                checked={subField.state.value}
                                onCheckedChange={(v) =>
                                  subField.handleChange(v)
                                }
                              />
                              <span className="text-xs">{t('required')}</span>
                            </div>
                          )}
                        </form.AppField>

                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => requirementsField.removeValue(i)}
                        >
                          {t('deleteStage')}
                        </Button>
                      </div>
                    ),
                  )}
                </div>
              )}
            </form.AppField>
          </FormGrid>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {ct('cancel')}
            </Button>
            <form.AppForm>
              <form.SubmitButton disabled={!canSubmit}>
                {stage ? t('editStage') : t('addStage')}
              </form.SubmitButton>
            </form.AppForm>
          </DialogFooter>
        </FormRoot>
      </DialogContent>
    </Dialog>
  )
}
