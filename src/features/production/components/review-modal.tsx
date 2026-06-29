import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
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
      <DialogContent aria-describedby="review-action-description">
        <DialogHeader>
          <DialogTitle>{t('reviewAdvancement')}</DialogTitle>
          <DialogDescription id="review-action-description">
            {t('reviewTaskLabel')}: {taskNumber ?? '-'} &middot;{' '}
            {t('reviewStageLabel')}: {stageName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">
              {t('reviewTaskLabel')}:{' '}
            </span>
            {taskNumber}
          </p>
          <p>
            <span className="text-muted-foreground">
              {t('reviewStageLabel')}:{' '}
            </span>
            {stageName}
            {nextStageName && (
              <span className="text-muted-foreground"> → {nextStageName}</span>
            )}
          </p>
        </div>

        {fulfilledReqs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">
              {t('fulfilledRequirements')}
            </p>
            <div className="space-y-1.5">
              {fulfilledReqs.map(([id, resp]) => (
                <div key={id} className="flex items-center gap-2 text-sm">
                  <CheckCircle2
                    className="size-3.5 text-success shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-muted-foreground">
                    {requirementLabelMap.get(id) ?? id}
                  </span>
                  {resp.value && (
                    <span className="truncate">: {resp.value}</span>
                  )}
                  {resp.assetIds && resp.assetIds.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({t('attachmentCount', { count: resp.assetIds.length })})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="review-notes">{t('reviewNotes')}</Label>
          <Textarea
            id="review-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="destructive"
            onClick={() => onReject(taskId, notes || undefined)}
            aria-describedby="review-action-description"
          >
            {t('reject')}
          </Button>
          <Button
            onClick={() => onApprove(taskId, notes || undefined)}
            aria-describedby="review-action-description"
          >
            {t('approve')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
