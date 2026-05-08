import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'

type Props = {
  taskId: string
  taskNumber: string | null
  stageName: string
  nextStageName?: string
  requirementResponses?: Record<string, { value?: string; assetIds?: string[] }>
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
  open,
  onOpenChange,
  onApprove,
  onReject,
}: Props) {
  const t = useTranslations('production')
  const [notes, setNotes] = useState('')

  const fulfilledReqs = requirementResponses
    ? Object.entries(requirementResponses).filter(
        ([, resp]) => resp.value || (resp.assetIds && resp.assetIds.length > 0),
      )
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('reviewAdvancement')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Task: </span>
            {taskNumber}
          </p>
          <p>
            <span className="text-muted-foreground">Stage: </span>
            {stageName}
            {nextStageName && (
              <span className="text-muted-foreground"> → {nextStageName}</span>
            )}
          </p>
        </div>

        {fulfilledReqs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">
              Fulfilled Requirements
            </p>
            <div className="space-y-1.5">
              {fulfilledReqs.map(([id, resp]) => (
                <div key={id} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
                  <span className="text-muted-foreground">{id}</span>
                  {resp.value && (
                    <span className="truncate">: {resp.value}</span>
                  )}
                  {resp.assetIds && resp.assetIds.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({resp.assetIds.length} file
                      {resp.assetIds.length > 1 ? 's' : ''})
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
          >
            {t('reject')}
          </Button>
          <Button onClick={() => onApprove(taskId, notes || undefined)}>
            {t('approve')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
