import { useEffect, useState } from 'react'
import { toast } from 'sonner'
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
import { Label } from '#/components/ui/label'
import { RadioGroup, RadioGroupItem } from '#/components/ui/radio-group'
import {
  useBusinessTemplates,
  useMaterializeBusinessTemplate,
} from '#/features/product-templates/hooks'

type MaterializeBusinessTemplateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MaterializeBusinessTemplateDialog({
  open,
  onOpenChange,
}: MaterializeBusinessTemplateDialogProps) {
  const t = useTranslations('productTemplates')
  const ct = useTranslations('common')
  const { data: businessTemplates, isLoading, isError } = useBusinessTemplates()
  const materializeTemplate = useMaterializeBusinessTemplate()

  const [selectedBusinessTemplateId, setSelectedBusinessTemplateId] = useState<
    string | null
  >(null)

  // Default the selection to the first business template whenever the dialog opens.
  useEffect(() => {
    if (open && businessTemplates && businessTemplates.length > 0) {
      setSelectedBusinessTemplateId(
        (current) => current ?? businessTemplates[0].id,
      )
    }
  }, [open, businessTemplates])

  const businessTemplatesUnavailable =
    isError || (!isLoading && (businessTemplates?.length ?? 0) === 0)

  const handleClose = () => {
    setSelectedBusinessTemplateId(null)
    onOpenChange(false)
  }

  const handleMaterialize = async () => {
    if (!selectedBusinessTemplateId) return
    const result = await materializeTemplate.mutateAsync(
      selectedBusinessTemplateId,
    )
    if (result.ok) {
      toast.success(t('materialization.copiedTo'))
      handleClose()
    } else {
      toast.error(t('materialization.failed'))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('materialization.title')}</DialogTitle>
          <DialogDescription>
            {t('materialization.description')}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground" role="status">
            {ct('loading')}
          </p>
        ) : businessTemplatesUnavailable ? (
          <p className="text-sm text-destructive" role="alert">
            {t('materialization.noBusinessTemplate')}
          </p>
        ) : (
          <RadioGroup
            value={selectedBusinessTemplateId ?? undefined}
            onValueChange={setSelectedBusinessTemplateId}
            className="gap-3"
          >
            {(businessTemplates ?? []).map((template) => (
              <div
                key={template.id}
                className="flex items-start gap-3 rounded-md border p-3"
              >
                <RadioGroupItem
                  value={template.id}
                  id={`business-template-${template.id}`}
                  className="mt-0.5"
                />
                <Label
                  htmlFor={`business-template-${template.id}`}
                  className="flex flex-col items-start gap-1 font-normal"
                >
                  <span className="text-sm font-medium">{template.name}</span>
                  {template.description && (
                    <span className="text-xs text-muted-foreground">
                      {template.description}
                    </span>
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {ct('cancel')}
          </Button>
          <Button
            onClick={() => void handleMaterialize()}
            disabled={
              !selectedBusinessTemplateId ||
              materializeTemplate.isPending ||
              businessTemplatesUnavailable
            }
            isLoading={materializeTemplate.isPending}
          >
            {t('materialization.title')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
