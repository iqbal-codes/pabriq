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
  open: boolean
  onOpenChange: (open: boolean) => void
  onApprove: (taskId: string, notes?: string) => void
  onReject: (taskId: string, notes?: string) => void
}

export function ReviewModal({
  taskId,
  taskNumber,
  stageName,
  open,
  onOpenChange,
  onApprove,
  onReject,
}: Props) {
  const t = useTranslations('production')
  const [notes, setNotes] = useState('')

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
          </p>

          <div>
            <Label htmlFor="review-notes">{t('reviewNotes')}</Label>
            <Textarea
              id="review-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
            />
          </div>
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
