import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslations } from 'use-intl'
import { AssetFileList } from '#/components/app/asset-file'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
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
import { Badge } from '#/components/ui/badge'

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
  const designName = ctx?.designName ?? ''
  const customerName = ctx?.customerName ?? ''
  const orderNumber = ctx?.orderNumber ?? ''
  const quantity = ctx?.quantity ?? ''
  const spec = ctx?.requirements ?? ''

  const boardStages = (stages ?? [])
    .filter((s) => s.active && s.board === task.board)
    .sort((a, b) => a.orderIndex - b.orderIndex)

  const currentStageIndex = task.stageId
    ? boardStages.findIndex((s) => s.id === task.stageId)
    : -1
  const currentStage =
    currentStageIndex >= 0 ? boardStages[currentStageIndex] : null
  const nextStage = boardStages[currentStageIndex + 1]
  const isAtLastBoardStage =
    currentStageIndex >= 0 && currentStageIndex >= boardStages.length - 1
  const hasRequirements =
    currentStage !== null && currentStage.requirements?.length > 0

  function handleAdvanceClick() {
    if (hasRequirements) {
      setShowRequirementForm(true)
    } else {
      handleAdvance({})
    }
  }
  1
  async function handleAdvance(
    responses: Record<string, { value?: string; assetIds?: string[] }>,
  ) {
    const result = await advanceTask.mutateAsync({
      taskId,
      requirementResponses: responses,
    })
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
  }
  async function handleSendComment() {
    if (!commentText.trim()) return
    const result = await saveComment.mutateAsync({
      taskId,
      text: commentText.trim(),
    })
    if ('error' in result) return
    setCommentText('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-screen overflow-hidden flex flex-col p-0 bg-background border border-border rounded-xl">
        {showRequirementForm &&
        currentStage?.requirements &&
        currentStage.requirements.length > 0 ? (
          <div className="flex-1 overflow-y-auto p-6 min-h-0 space-y-4">
            <RequirementForm
              taskId={taskId}
              requirements={currentStage.requirements}
              onCancel={() => setShowRequirementForm(false)}
              onSubmit={handleAdvance}
              isSubmitting={advanceTask.isPending}
            />
          </div>
        ) : (
          <>
            <DialogHeader className="p-6 pb-4 bg-muted/10 space-y-3 border-b">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded border border-border">
                  {task.taskNumber}
                </span>
                {currentStage && <Badge>{currentStage.name}</Badge>}
              </div>
              <div className="w-full flex flex-row items-center">
                <div className="space-y-1 flex-1">
                  <DialogTitle className="text-xl font-bold tracking-tight text-foreground sm:text-2xl text-left">
                    {productName || t('taskDetail')}
                  </DialogTitle>
                  {designName && (
                    <p className="text-sm font-medium text-muted-foreground text-left">
                      {t('designName')}:{' '}
                      <span className="text-foreground font-semibold">
                        {designName}
                      </span>
                    </p>
                  )}
                </div>

                {task.status === 'queued' && nextStage && (
                  <Button
                    className="bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95 font-semibold text-sm transition-colors cursor-pointer"
                    onClick={handleAdvanceClick}
                    isLoading={advanceTask.isPending}
                    disabled={advanceTask.isPending}
                  >
                    {t('advanceTo', { stage: nextStage.name })}
                  </Button>
                )}
                {task.status === 'in_progress' &&
                  (nextStage || isAtLastBoardStage) && (
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95 font-semibold text-sm transition-colors cursor-pointer"
                      onClick={handleAdvanceClick}
                      isLoading={advanceTask.isPending}
                      disabled={advanceTask.isPending}
                    >
                      {currentStage?.needApproval
                        ? t('requestReview')
                        : isAtLastBoardStage && task.board === 'pre_production'
                          ? t('markReadyForProduction')
                          : isAtLastBoardStage
                            ? t('done')
                            : t('advanceTo', { stage: nextStage?.name })}
                    </Button>
                  )}
                {task.status === 'pending_approval' &&
                  canApprove &&
                  onReview && (
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95 font-semibold text-sm transition-colors cursor-pointer"
                      onClick={() => onReview(taskId)}
                      disabled={advanceTask.isPending}
                    >
                      {t('reviewAdvancement')}
                    </Button>
                  )}
              </div>
            </DialogHeader>

            <div className="flex-1 flex flex-col min-h-0 bg-background">
              <Tabs
                defaultValue="details"
                className="flex-1 flex flex-col min-h-0 w-full"
              >
                <div className="border-b border-border bg-muted/5 shrink-0">
                  <TabsList
                    variant="line"
                    className="w-full justify-start border-0 bg-transparent p-0 rounded-none h-10 gap-6"
                  >
                    <TabsTrigger value="details">{t('taskDetail')}</TabsTrigger>
                    <TabsTrigger value="activity">{t('activity')}</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent
                  value="details"
                  className="space-y-6 pt-4 focus-visible:outline-none flex-1 overflow-y-auto px-6 pb-6 min-h-0"
                >
                  {/* Task Meta Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('orderLabel')}
                      </span>
                      <div>
                        <span className="font-mono text-xs font-semibold text-foreground bg-muted/60 px-2.5 py-1 rounded border border-border inline-block">
                          {orderNumber}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('customerLabel')}
                      </span>
                      <p className="font-semibold text-foreground">
                        {customerName || '-'}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('quantityLabel')}
                      </span>
                      <p className="font-semibold text-foreground">
                        {quantity}{' '}
                        <span className="text-xs font-normal text-muted-foreground">
                          pcs
                        </span>
                      </p>
                    </div>
                  </div>

                  {spec && (
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('specification')}
                      </span>
                      <div className="bg-card border border-border rounded-lg p-4 text-sm text-foreground/95 leading-relaxed whitespace-pre-wrap">
                        {spec}
                      </div>
                    </div>
                  )}

                  {lineItemAssets && lineItemAssets.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('attachments')}
                      </span>
                      <AssetFileList
                        assetIds={lineItemAssets.map((a) => a.id)}
                        layout="grid"
                        showSize
                      />
                    </div>
                  )}
                </TabsContent>

                <TabsContent
                  value="activity"
                  className="focus-visible:outline-none flex flex-col flex-1 min-h-0"
                >
                  <div className="space-y-3 flex-1 overflow-y-auto min-h-0 p-6 pb-2">
                    {(!activities || activities.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-12">
                        {t('noActivity')}
                      </p>
                    )}
                    {activities?.map((act) => (
                      <ActivityRow
                        key={act.id}
                        activity={act}
                        stageNameMap={stageNameMap}
                        actorMap={actorMap}
                        stages={stages}
                        taskContext={
                          task.context as Record<string, unknown> | null
                        }
                      />
                    ))}
                  </div>

                  <div className="p-6 pt-0 shrink-0">
                    <div className="flex gap-2 items-center bg-background p-2 border border-input rounded-lg focus-within:ring-2 focus-within:ring-ring/40 focus-within:border-ring transition-all">
                      <input
                        type="text"
                        placeholder={t('commentPlaceholder')}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="flex-1 ml-2.5 border-0 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground text-foreground min-w-0"
                      />
                      <Button
                        size="sm"
                        className="h-8 px-4 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95 transition-colors shrink-0 cursor-pointer"
                        onClick={handleSendComment}
                        isLoading={saveComment.isPending}
                        disabled={!commentText.trim() || saveComment.isPending}
                      >
                        {t('send')}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
