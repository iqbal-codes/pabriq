import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  useStages,
  useTaskActivities,
  useTaskDetail,
  useTaskMutations,
} from '../hooks'

type Props = {
  taskId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  canApprove?: boolean
  onReview?: (taskId: string) => void
}

export function TaskDetailModal({
  taskId,
  open,
  onOpenChange,
  canApprove = false,
  onReview,
}: Props) {
  const t = useTranslations('production')
  const { data: task, isLoading: taskLoading } = useTaskDetail(taskId)
  const { data: activities } = useTaskActivities(taskId)
  const { data: stages } = useStages()
  const { advanceTask, saveComment } = useTaskMutations()

  const [commentText, setCommentText] = useState('')

  if (taskLoading || !task) return null

  const ctx = task.context as Record<
    string,
    string | number | boolean | null
  > | null
  const productName = ctx?.productName ?? ''
  const customerName = ctx?.customerName ?? ''
  const orderNumber = ctx?.orderNumber ?? ''
  const quantity = ctx?.quantity ?? ''
  const spec = ctx?.requirements ?? ''

  const activeStages = (stages ?? [])
    .filter((s) => s.active)
    .sort((a, b) => a.orderIndex - b.orderIndex)

  const currentStageIndex = task.stageId
    ? activeStages.findIndex((s) => s.id === task.stageId)
    : -1
  const nextStage = activeStages[currentStageIndex + 1]

  function handleAdvance() {
    advanceTask.mutate({ taskId })
    onOpenChange(false)
  }

  function handleSendComment() {
    if (!commentText.trim()) return
    saveComment.mutate({ taskId, text: commentText.trim() })
    setCommentText('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('taskDetail')}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-mono font-semibold">{task.taskNumber}</span>
          <Badge variant="secondary">{task.status}</Badge>
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList>
            <TabsTrigger value="details">{t('specification')}</TabsTrigger>
            <TabsTrigger value="activity">{t('activity')}</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Order</span>
                <p className="font-medium">{orderNumber}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Product</span>
                <p className="font-medium">{productName}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Customer</span>
                <p className="font-medium">{customerName}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Quantity</span>
                <p className="font-medium">{quantity}</p>
              </div>
            </div>

            {spec && (
              <div>
                <span className="text-muted-foreground text-xs">
                  {t('specification')}
                </span>
                <p className="text-sm mt-0.5">{spec}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 pt-4">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(!activities || activities.length === 0) && (
                <p className="text-sm text-muted-foreground">No activity</p>
              )}
              {activities?.map((act) => (
                <div
                  key={act.id}
                  className="flex items-start gap-2 text-sm border-b pb-2 last:border-0"
                >
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {act.type}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    {new Date(act.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder={t('commentPlaceholder')}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleSendComment}
                disabled={!commentText.trim()}
              >
                {t('send')}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-2 border-t">
          {task.status === 'queued' && (
            <Button onClick={handleAdvance}>{t('startProduction')}</Button>
          )}
          {task.status === 'in_progress' && nextStage && (
            <Button onClick={handleAdvance}>
              {t('advanceTo')} {nextStage.name}
            </Button>
          )}
          {task.status === 'pending_approval' && canApprove && onReview && (
            <Button onClick={() => onReview(taskId)}>
              {t('reviewAdvancement')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
