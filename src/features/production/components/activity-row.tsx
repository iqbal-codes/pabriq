import { ArrowRight, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslations } from 'use-intl'
import { AssetFileList } from '#/components/app/asset-file'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import type { Stage, TaskActivity } from '#/features/production/model'
import { getReadyForProductionLabel } from '#/features/production/ready-for-production-label'

const systemActivityIconMap: Record<string, React.ReactNode> = {
  stage_transition: (
    <ArrowRight className="size-3.5 text-brand-accent shrink-0 mt-0.5" />
  ),
  board_transition: (
    <ArrowRight className="size-3.5 text-brand-accent shrink-0 mt-0.5" />
  ),
  advancement_requested: (
    <Clock className="size-3.5 text-warning shrink-0 mt-0.5" />
  ),
  approved: <CheckCircle2 className="size-3.5 text-success shrink-0 mt-0.5" />,
  rejected: <XCircle className="size-3.5 text-destructive shrink-0 mt-0.5" />,
}

const userActivityIconMap: Record<string, React.ReactNode> = {
  advancement_requested: (
    <Clock className="size-3.5 text-warning shrink-0 mt-0.5" />
  ),
  approved: <CheckCircle2 className="size-3.5 text-success shrink-0 mt-0.5" />,
  rejected: <XCircle className="size-3.5 text-destructive shrink-0 mt-0.5" />,
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function ActivityRow({
  activity,
  stageNameMap,
  actorMap,
  stages,
  taskContext,
}: {
  activity: TaskActivity
  stageNameMap: Map<string, string>
  actorMap: Map<string, { name: string; image: string | null }>
  stages?: Stage[]
  taskContext?: Record<string, unknown> | null
}): React.ReactElement {
  const t = useTranslations('production')
  const pt = useTranslations('portal')
  const fromName = activity.fromStageId
    ? stageNameMap.get(activity.fromStageId)
    : null
  const toName = activity.toStageId
    ? stageNameMap.get(activity.toStageId)
    : null
  const data = activity.data ?? {}
  const [dateStr, setDateStr] = useState('')
  const [timeStr, setTimeStr] = useState('')
  useEffect(() => {
    const time = new Date(activity.createdAt)
    setDateStr(time.toLocaleDateString())
    setTimeStr(
      time.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    )
  }, [activity.createdAt])

  const user = actorMap.get(activity.actorId)

  function getDescription(): string {
    const formattedFrom = fromName ?? pt('timelineQueue')

    switch (activity.type) {
      case 'board_transition': {
        const boardLabel =
          data?.fromBoard === 'pre_production'
            ? pt('timelineReadyForProduction')
            : data?.fromBoard
              ? String(data.fromBoard).charAt(0).toUpperCase() +
                String(data.fromBoard).slice(1).replace(/_/g, ' ')
              : null
        const effectiveFrom = fromName ?? boardLabel ?? pt('timelineQueue')
        if (toName) {
          return pt('timelineTransition', {
            from: effectiveFrom,
            to: toName,
          })
        }
        return toName ?? effectiveFrom ?? ''
      }
      case 'stage_transition': {
        if (!fromName && !toName) return pt('timelineQueued')

        // Task completed last pre-production stage → show "Ready for Production"
        if (!toName && data?.readyForProduction) {
          const firstProductionStageName = stages?.find(
            (s) => s.active && s.board === 'production',
          )?.name
          return pt('timelineTransition', {
            from: fromName ?? pt('timelineQueue'),
            to: getReadyForProductionLabel({
              firstProductionStageName,
              readyForProduction: pt('timelineReadyForProduction'),
              readyForProductionWithStage: (values) =>
                pt('timelineReadyForProductionWithStage', values),
            }),
          })
        }

        if (!toName) {
          return pt('timelineTransition', {
            from: formattedFrom,
            to: pt('timelineCompleted'),
          })
        }

        return pt('timelineTransition', {
          from: formattedFrom,
          to: toName,
        })
      }
      case 'advancement_requested':
        return t('activityAdvancementRequested', { stage: toName ?? '' })
      case 'approved':
        return t('activityApproved')
      case 'rejected':
        return t('activityRejected')
      default:
        return activity.type
    }
  }

  if (activity.type === 'comment') {
    return (
      <div className="flex gap-2.5 pb-3 last:pb-0">
        <Avatar className="size-7 shrink-0 mt-0.5">
          {user?.image ? <AvatarImage src={user.image} /> : null}
          <AvatarFallback className="text-xs">
            {user ? getInitials(user.name) : '?'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-medium">
              {user?.name ?? activity.actorId.slice(0, 8)}
            </span>
            <span className="text-xs text-muted-foreground">
              {dateStr} {timeStr}
            </span>
          </div>
          <div className="bg-muted rounded-lg px-3 py-2 text-sm">
            {String(data.text ?? '')}
          </div>
        </div>
      </div>
    )
  }

  const isSystem =
    activity.type === 'stage_transition' ||
    activity.type === 'board_transition' ||
    activity.actorId === 'system'

  // Cast TaskActivity.data to read responses or reviewNotes safely
  const activityData = data as
    | {
        responses?: Record<string, { assetIds?: string[]; value?: string }>
        reviewNotes?: string
      }
    | null
    | undefined

  const responses = activityData?.responses
  let proofAssetIds: string[] = []
  if (responses && Object.keys(responses).length > 0) {
    proofAssetIds = Object.values(responses).flatMap((r) => r.assetIds ?? [])
  } else if (
    activity.fromStageId &&
    stages &&
    taskContext?.requirementResponses
  ) {
    const sourceStage = stages.find((s) => s.id === activity.fromStageId)
    if (sourceStage?.requirements) {
      const sourceReqIds = sourceStage.requirements.map((r) => r.id)
      const sourceReqIdsSet = new Set(sourceReqIds)
      const contextResponses = taskContext.requirementResponses as Record<
        string,
        { assetIds?: string[] }
      >
      proofAssetIds = Object.entries(contextResponses).flatMap(([reqId, r]) =>
        sourceReqIdsSet.has(reqId) ? (r.assetIds ?? []) : [],
      )
    }
  }
  if (isSystem) {
    return (
      <div className="flex gap-2.5 border-b pb-2.5 last:border-0">
        <div className="size-6 flex items-start justify-center shrink-0 mt-0.5">
          {systemActivityIconMap[activity.type] ?? <div className="size-3.5" />}
        </div>
        <div className="flex-1 min-w-0 text-sm">
          <p className="text-xs text-foreground">{getDescription()}</p>
          <span className="text-xs text-muted-foreground">
            {dateStr} {timeStr}
          </span>
          {proofAssetIds.length > 0 && (
            <AssetFileList
              assetIds={proofAssetIds}
              layout="list"
              showSize
              className="mt-2"
            />
          )}
        </div>
      </div>
    )
  }
  return (
    <div className="flex gap-2.5 border-b pb-2.5 last:border-0">
      <Avatar className="size-6 shrink-0 mt-0.5">
        {user?.image ? <AvatarImage src={user.image} /> : null}
        <AvatarFallback className="text-xs">
          {user ? getInitials(user.name) : '?'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="font-medium">
            {user?.name ?? activity.actorId.slice(0, 8)}
          </span>
          <span className="text-xs text-muted-foreground">
            {dateStr} {timeStr}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {userActivityIconMap[activity.type] ?? <div className="size-3.5" />}
          <p className="text-xs text-foreground">{getDescription()}</p>
          {(activity.type === 'approved' || activity.type === 'rejected') &&
            activityData?.reviewNotes && (
              <span className="text-muted-foreground truncate">
                · {String(activityData.reviewNotes)}
              </span>
            )}
        </div>
      </div>
    </div>
  )
}
