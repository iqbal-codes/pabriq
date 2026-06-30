import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslations } from 'use-intl'
import { AssetFileList } from '#/components/app/asset-file'
import { StatusBadge } from '#/components/status-badge'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { useMembers } from '#/features/members/hooks'
import { getAssetsForLineItemFn } from '#/features/orders/server'
import {
  useStages,
  useTaskActivities,
  useTaskDetail,
  useTaskMutations,
} from '../hooks'
import { ActivityRow } from './activity-row'
import { RequirementForm } from './requirement-form'

type Props = {
  taskId: string
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  canApprove?: boolean
  onReview?: (taskId: string) => void
}

export function TaskDetailModal({
  taskId,
  orgId,
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
  const { data: members } = useMembers()
  const [commentText, setCommentText] = useState('')
  const [showRequirementForm, setShowRequirementForm] = useState(false)
  const { data: lineItemAssets } = useQuery({
    queryKey: ['order-assets', task?.lineItemId ?? ''],
    queryFn: () => {
      const lineItemId = task?.lineItemId
      if (!lineItemId) throw new Error('No line item')
      return getAssetsForLineItemFn({
        data: { lineItemId, orgId },
      })
    },
    enabled: !!task?.lineItemId,
  })

  const stageNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of stages ?? []) {
      map.set(s.id, s.name)
    }
    return map
  }, [stages])

  const actorMap = useMemo(() => {
    const map = new Map<string, { name: string; image: string | null }>()
    if (!members) return map
    for (const m of members) {
      map.set(m.user.id, { name: m.user.name, image: m.user.image })
    }
    return map
  }, [members])

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

  const boardStages = (stages ?? [])
    .filter((s) => s.active && s.board === task.board)
    .sort((a, b) => a.orderIndex - b.orderIndex)

  const allActiveStages = (stages ?? [])
    .filter((s) => s.active)
    .sort((a, b) => a.orderIndex - b.orderIndex)

  const currentStageIndex = task.stageId
    ? boardStages.findIndex((s) => s.id === task.stageId)
    : -1
  const currentStage =
    currentStageIndex >= 0 ? boardStages[currentStageIndex] : null
  const nextStage = boardStages[currentStageIndex + 1]
  const isAtLastBoardStage =
    currentStageIndex >= 0 && currentStageIndex >= boardStages.length - 1
  const productionEntryStage =
    task.board === 'pre_production'
      ? allActiveStages.find((s) => s.board === 'production')
      : undefined
  const hasRequirements =
    currentStage !== null && currentStage.requirements?.length > 0

  function handleAdvanceClick() {
    if (hasRequirements) {
      setShowRequirementForm(true)
    } else {
      handleAdvance({})
    }
  }

  function handleAdvance(
    responses: Record<string, { value?: string; assetIds?: string[] }>,
  ) {
    advanceTask.mutate(
      { taskId, requirementResponses: responses },
      {
        onSuccess: (result) => {
          if ('error' in result) return
          if (
            'pendingApproval' in result &&
            result.pendingApproval &&
            canApprove &&
            onReview
          ) {
            onReview(taskId)
            return
          }
          onOpenChange(false)
        },
      },
    )
  }
  function handleSendComment() {
    if (!commentText.trim()) return
    saveComment.mutate(
      { taskId, text: commentText.trim() },
      {
        onSuccess: (result) => {
          if ('error' in result) return
          setCommentText('')
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('taskDetail')}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-mono font-semibold">{task.taskNumber}</span>
          <StatusBadge status={task.status} />
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList>
            <TabsTrigger value="details">{t('specification')}</TabsTrigger>
            <TabsTrigger value="activity">{t('activity')}</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">
                  {t('orderLabel')}
                </span>
                <p className="font-medium">{orderNumber}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">
                  {t('productLabel')}
                </span>
                <p className="font-medium">{productName}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">
                  {t('customerLabel')}
                </span>
                <p className="font-medium">{customerName}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">
                  {t('quantityLabel')}
                </span>
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

            {lineItemAssets && lineItemAssets.length > 0 && (
              <div>
                <span className="text-muted-foreground text-xs">
                  {t('attachments')}
                </span>
                <AssetFileList
                  assetIds={lineItemAssets.map((a) => a.id)}
                  layout="list"
                  showSize
                  className="mt-2"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 pt-4">
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {(!activities || activities.length === 0) && (
                <p className="text-sm text-muted-foreground">
                  {t('noActivity')}
                </p>
              )}
              {activities?.map((act) => (
                <ActivityRow
                  key={act.id}
                  activity={act}
                  stageNameMap={stageNameMap}
                  actorMap={actorMap}
                />
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
                className="h-9"
                onClick={handleSendComment}
                disabled={!commentText.trim()}
              >
                {t('send')}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-2 border-t">
          {showRequirementForm &&
            currentStage?.requirements &&
            currentStage.requirements.length > 0 && (
              <div className="w-full">
                <RequirementForm
                  taskId={taskId}
                  requirements={currentStage.requirements}
                  onCancel={() => setShowRequirementForm(false)}
                  onSubmit={handleAdvance}
                />
              </div>
            )}
          {!showRequirementForm && task.status === 'queued' && nextStage && (
            <Button onClick={handleAdvanceClick}>
              {t('advanceTo', { stage: nextStage.name })}
            </Button>
          )}
          {!showRequirementForm &&
            task.status === 'in_progress' &&
            (nextStage || isAtLastBoardStage) && (
              <Button onClick={handleAdvanceClick}>
                {currentStage?.needApproval
                  ? t('requestReview')
                  : isAtLastBoardStage && productionEntryStage
                    ? t('continueToProduction')
                    : isAtLastBoardStage
                      ? t('done')
                      : t('advanceTo', { stage: nextStage?.name })}
              </Button>
            )}
          {!showRequirementForm &&
            task.status === 'pending_approval' &&
            canApprove &&
            onReview && (
              <Button onClick={() => onReview(taskId)}>
                {t('reviewAdvancement')}
              </Button>
            )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
