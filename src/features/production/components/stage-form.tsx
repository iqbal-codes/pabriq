import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/ui/native-select'
import { Switch } from '#/components/ui/switch'
import { Textarea } from '#/components/ui/textarea'
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

  const [name, setName] = useState(stage?.name ?? '')
  const [description, setDescription] = useState(stage?.description ?? '')
  const [needApproval, setNeedApproval] = useState(stage?.needApproval ?? false)
  const [requirements, setRequirements] = useState<Requirement[]>(
    (stage?.requirements as Requirement[]) ?? [],
  )

  function addRequirement() {
    setRequirements([
      ...requirements,
      { id: crypto.randomUUID(), label: '', type: 'text', required: false },
    ])
  }

  function updateRequirement(
    index: number,
    field: keyof Requirement,
    value: string | boolean,
  ) {
    setRequirements(
      requirements.map((r, i) =>
        i === index ? { ...r, [field]: value as Requirement[typeof field] } : r,
      ),
    )
  }

  function removeRequirement(index: number) {
    setRequirements(requirements.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    if (!name.trim()) return

    if (stage) {
      await updateStage.mutateAsync({
        id: stage.id,
        name,
        description: description || undefined,
        needApproval,
        requirements: requirements as Requirement[],
      })
    } else {
      await createStage.mutateAsync({
        name,
        description: description || undefined,
        needApproval,
        requirements: requirements as Requirement[],
      })
    }

    onOpenChange(false)
  }

  const isPending = createStage.isPending || updateStage.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{stage ? t('editStage') : t('addStage')}</DialogTitle>
          <DialogDescription>
            {t('stageDescriptionPlaceholder')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{t('stageName')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">{t('stageDescription')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('stageDescriptionPlaceholder')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>{t('needApproval')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('needApprovalHint')}
              </p>
            </div>
            <Switch checked={needApproval} onCheckedChange={setNeedApproval} />
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label>{t('requirements')}</Label>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={addRequirement}
              >
                {t('addRequirement')}
              </Button>
            </div>

            {requirements.map((req, i) => (
              <div
                key={req.id}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end"
              >
                <div className="grid gap-1">
                  <Label className="text-xs">{t('requirementLabel')}</Label>
                  <Input
                    value={req.label}
                    onChange={(e) =>
                      updateRequirement(i, 'label', e.target.value)
                    }
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">{t('requirementType')}</Label>
                  <NativeSelect
                    value={req.type}
                    onChange={(e) =>
                      updateRequirement(i, 'type', e.target.value)
                    }
                  >
                    <option value="text">{t('requirementTypeText')}</option>
                    <option value="number">{t('requirementTypeNumber')}</option>
                    <option value="upload">{t('requirementTypeUpload')}</option>
                  </NativeSelect>
                </div>
                <div className="flex items-center gap-1 pb-1">
                  <Switch
                    checked={req.required}
                    onCheckedChange={(v) => updateRequirement(i, 'required', v)}
                  />
                  <span className="text-xs">{t('required')}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => removeRequirement(i)}
                >
                  {t('deleteStage')}
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {ct('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !name.trim()}>
            {stage ? t('editStage') : t('addStage')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
