import { useStore } from '@tanstack/react-form'
import { Trash } from 'lucide-react'
import { useEffect } from 'react'
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
      board: stage?.board ?? 'pre_production',
      needApproval: stage?.needApproval ?? false,
      requirements: (stage?.requirements as Requirement[]) ?? [],
    },
    onSubmit: async ({ value }) => {
      if (stage) {
        await updateStage.mutateAsync({
          id: stage.id,
          name: value.name,
          description: value.description || undefined,
          board: value.board,
          needApproval: value.needApproval,
          requirements: value.requirements as Requirement[],
        })
      } else {
        await createStage.mutateAsync({
          name: value.name,
          description: value.description || undefined,
          board: value.board,
          needApproval: value.needApproval,
          requirements: value.requirements as Requirement[],
        })
      }
      onOpenChange(false)
    },
  })

  const isSubmitting = useStore(form.store, (state) => state.isSubmitting)
  const nameValue = useStore(form.store, (state) => state.values.name)
  const canSubmit = !isSubmitting && nameValue.trim().length > 0

  useEffect(() => {
    if (open) {
      form.reset()
    }
  }, [open, form])

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

            <form.AppField name="board">
              {(field) => (
                <div>
                  <Label>{t('board')}</Label>
                  <div className="flex gap-2 mt-1">
                    <Button
                      type="button"
                      variant={
                        field.state.value === 'pre_production'
                          ? 'default'
                          : 'outline'
                      }
                      size="sm"
                      onClick={() => field.handleChange('pre_production')}
                    >
                      {t('boardPreProduction')}
                    </Button>
                    <Button
                      type="button"
                      variant={
                        field.state.value === 'production'
                          ? 'default'
                          : 'outline'
                      }
                      size="sm"
                      onClick={() => field.handleChange('production')}
                    >
                      {t('boardProduction')}
                    </Button>
                  </div>
                </div>
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
                        className="flex flex-col gap-2 p-3 border rounded-lg relative"
                      >
                        <FormGrid columns={2}>
                          <form.AppField name={`requirements[${i}].label`}>
                            {(subField) => (
                              <subField.TextField
                                label={t('requirementLabel')}
                              />
                            )}
                          </form.AppField>

                          <form.AppField name={`requirements[${i}].type`}>
                            {(subField) => (
                              <subField.SelectField
                                label={t('requirementType')}
                                options={[
                                  {
                                    value: 'text',
                                    label: t('requirementTypeText'),
                                  },
                                  {
                                    value: 'number',
                                    label: t('requirementTypeNumber'),
                                  },
                                  {
                                    value: 'upload',
                                    label: t('requirementTypeUpload'),
                                  },
                                ]}
                              />
                            )}
                          </form.AppField>
                        </FormGrid>

                        <form.AppField name={`requirements[${i}].required`}>
                          {(subField) => (
                            <div className="flex items-center justify-between py-2">
                              <span className="text-sm font-medium">
                                {t('requirementRequired')}
                              </span>
                              <Switch
                                checked={subField.state.value}
                                onCheckedChange={(checked) =>
                                  subField.handleChange(checked)
                                }
                              />
                            </div>
                          )}
                        </form.AppField>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          type="button"
                          tooltip={t('requirementRemove')}
                          className="absolute right-3 top-1"
                          onClick={() => requirementsField.removeValue(i)}
                        >
                          <Trash className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ),
                  )}
                </div>
              )}
            </form.AppField>
          </FormGrid>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
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
