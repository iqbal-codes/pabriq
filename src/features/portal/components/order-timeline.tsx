import { ArrowRight, CheckCircle2, Upload } from 'lucide-react'
import { useLocale, useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'
import { cn } from '#/lib/utils'
import { formatShortDate } from '#/lib/formatters'
import type { OrderTaskEvent } from '../model'

type Props = {
  events: OrderTaskEvent[]
  className?: string
}

function getIcon(event: OrderTaskEvent): React.ReactNode {
  if (event.type === 'completed' || event.type === 'approved_and_moved') {
    return <CheckCircle2 className="size-3.5 text-success shrink-0 mt-0.5" />
  }
  return (
    <ArrowRight className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
  )
}

function RequirementResponses({
  responses,
}: {
  responses: Array<{
    requirementName: string
    value?: string
    assetIds?: string[]
  }>
}) {
  const t = useTranslations('portal')
  const hasFiles = responses.some((r) => r.assetIds && r.assetIds.length > 0)
  const hasValues = responses.some((r) => r.value)

  if (!hasFiles && !hasValues) return null

  return (
    <div className="mt-2 space-y-2 rounded-lg bg-muted/50 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Upload className="size-3" />
        <span>{t('requirementsSubmitted')}</span>
      </div>
      {hasFiles && (
        <div className="grid grid-cols-4 gap-2">
          {responses.flatMap((r) =>
            r.assetIds && r.assetIds.length > 0
              ? r.assetIds.map((assetId) => (
                  <AssetImage
                    key={assetId}
                    assetId={assetId}
                    assetKind="image"
                    className="size-12 rounded-md object-cover"
                  />
                ))
              : [],
          )}
        </div>
      )}
      {hasValues && (
        <div className="space-y-1">
          {responses.flatMap((r) =>
            r.value
              ? [
                  <div
                    key={r.requirementName}
                    className="text-xs text-foreground"
                  >
                    <span className="font-medium text-muted-foreground">
                      {r.requirementName}:
                    </span>{' '}
                    <span>{r.value}</span>
                  </div>,
                ]
              : [],
          )}
        </div>
      )}
    </div>
  )
}

export function OrderTimeline({ events, className }: Props) {
  const t = useTranslations('portal')
  const locale = useLocale()
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  function getDescription(event: OrderTaskEvent): string {
    const fromName = event.fromStageName
    const toName = event.toStageName

    if (event.type === 'moved_to_stage' || event.type === 'stage_transition') {
      if (!fromName && !toName) {
        return t('timelineQueued')
      }
      if (!fromName && toName) {
        return t('timelineStarted', { stage: toName })
      }
      if (fromName && !toName) {
        return t('timelineCompleted', { stage: fromName })
      }
      if (fromName && toName) {
        return t('timelineTransition', { from: fromName, to: toName })
      }
    }

    switch (event.type) {
      case 'created':
        return t('timelineQueued')
      case 'completed':
        return t('timelineProductionComplete')
      case 'approved_and_moved':
        return toName
          ? t('timelineTransition', {
              from: fromName ?? t('timelineStageFallback'),
              to: toName,
            })
          : t('timelineCompleted', {
              stage: fromName ?? t('timelineStageFallback'),
            })
      case 'board_transition':
        return toName
          ? t('timelineBoardTransition', { stage: toName })
          : t('timelineStarted', {
              stage: fromName ?? t('timelineStageFallback'),
            })
      default:
        return event.type
    }
  }

  if (sortedEvents.length === 0) {
    return (
      <p
        className={cn(
          'rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground',
          className,
        )}
      >
        {t('noStageTransitions')}
      </p>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {sortedEvents.map((event, i) => (
        <div key={event.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="flex size-6 shrink-0 items-start justify-center pt-0.5">
              {getIcon(event)}
            </div>
            {i < sortedEvents.length - 1 ? (
              <div className="w-px flex-1 bg-border" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1 pb-3 last:pb-0">
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatShortDate(String(event.createdAt), locale)}{' '}
              {new Date(event.createdAt).toLocaleTimeString(locale, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-foreground">
              {event.taskNumber ? (
                <span className="font-mono text-xs text-muted-foreground">
                  {event.taskNumber}
                </span>
              ) : null}
              <span>{getDescription(event)}</span>
            </p>
            {event.requirementResponses &&
            event.requirementResponses.length > 0 ? (
              <RequirementResponses
                responses={event.requirementResponses[0].responses}
              />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
