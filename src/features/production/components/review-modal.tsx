import { CheckCircle2, XIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { AssetFileList } from '#/components/app/asset-file'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import type { Requirement } from '../model'

type Props = {
  taskId: string
  taskNumber: string | null
  stageName: string
  nextStageName?: string
  requirementResponses?: Record<string, { value?: string; assetIds?: string[] }>
  requirements?: Requirement[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onApprove: (taskId: string, notes?: string) => void
  onReject: (taskId: string, notes?: string) => void
  isApproving?: boolean
  isRejecting?: boolean
}

export function ReviewModal({
  taskId,
  taskNumber,
  stageName,
  nextStageName,
  requirementResponses,
  requirements,
  open,
  onOpenChange,
  onApprove,
  onReject,
  isApproving = false,
  isRejecting = false,
}: Props) {
  const t = useTranslations('production')
  const [notes, setNotes] = useState('')

  const requirementLabelMap = new Map(
    (requirements ?? []).map((requirement) => [
      requirement.id,
      requirement.label,
    ]),
  )

  const fulfilledReqs = requirementResponses
    ? Object.entries(requirementResponses).filter(
        ([, resp]) => resp.value || (resp.assetIds && resp.assetIds.length > 0),
      )
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed inset-y-0 right-0 h-full w-full sm:max-w-lg p-0 gap-0 border-l border-border bg-background shadow-lg translate-x-0 translate-y-0 top-0 left-auto rounded-none flex flex-col"
        showCloseButton={false}
        aria-describedby={undefined}
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b space-y-2">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg font-semibold tracking-tight text-left leading-snug">
              {t('reviewAdvancement')}
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t('close')}
              className="-mr-1 shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <XIcon className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <DialogDescription
            id="review-action-description"
            className="text-sm text-muted-foreground text-left mt-1"
          >
            {t('reviewTaskLabel')}: {taskNumber ?? '-'} &middot;{' '}
            {t('reviewStageLabel')}: {stageName}
            {nextStageName && ` → ${nextStageName}`}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-6">
          {fulfilledReqs.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('fulfilledRequirements')}
              </h3>
              <div className="space-y-3 bg-muted/10 border rounded-lg p-4">
                {fulfilledReqs.map(([id, resp]) => (
                  <div key={id} className="space-y-1.5">
                    <div className="flex items-start gap-2 text-sm">
                      <CheckCircle2
                        className="size-4 text-success shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <span className="font-medium text-foreground block text-xs leading-none">
                          {requirementLabelMap.get(id) ?? id}
                        </span>
                        {resp.value && (
                          <span className="text-muted-foreground text-sm block mt-1 break-words">
                            : {resp.value}
                          </span>
                        )}
                      </div>
                    </div>
                    {resp.assetIds && resp.assetIds.length > 0 && (
                      <AssetFileList
                        assetIds={resp.assetIds}
                        layout="list"
                        showSize
                        className="ml-6"
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Review Notes Input */}
          <div className="space-y-1.5">
            <Label
              htmlFor="review-notes"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
            >
              {t('reviewNotes')}
            </Label>
            <Textarea
              id="review-notes"
              placeholder={t('commentPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 min-h-[100px] resize-none"
            />
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="shrink-0 border-t p-4 bg-muted/10 flex justify-end gap-2">
          <Button
            variant="destructive"
            onClick={() => onReject(taskId, notes || undefined)}
            isLoading={isRejecting}
            disabled={isApproving || isRejecting}
            aria-describedby="review-action-description"
            className="px-5 font-semibold text-sm cursor-pointer"
          >
            {t('reject')}
          </Button>
          <Button
            onClick={() => onApprove(taskId, notes || undefined)}
            isLoading={isApproving}
            disabled={isApproving || isRejecting}
            aria-describedby="review-action-description"
            className="px-5 font-semibold text-sm cursor-pointer"
          >
            {t('approve')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
