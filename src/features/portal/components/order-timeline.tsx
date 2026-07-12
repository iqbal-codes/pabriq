import { useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, File } from 'lucide-react'
import { useLocale, useTranslations } from 'use-intl'
import { AssetFileList } from '#/components/app/asset-file'
import { getReadyForProductionLabel } from '#/features/production/ready-for-production-label'
import { formatShortDate } from '#/lib/formatters'
import { cn } from '#/lib/utils'
import type { OrderTaskEvent } from '../model'

type Props = {
  events: OrderTaskEvent[]
  className?: string
  token?: string
  firstProductionStageName?: string
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
  token,
}: {
  responses: Array<{
    requirementName: string
    value?: string
    assetIds?: string[]
  }>
  token?: string
}) {
  const t = useTranslations('portal')
  const assetIds = responses.flatMap((r) => r.assetIds ?? [])
  const hasFiles = assetIds.length > 0
  const hasValues = responses.some((r) => r.value)

  if (!hasFiles && !hasValues) return null

  return (
    <div className="mt-2 space-y-2 rounded-lg bg-muted/50 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <File className="size-3" />
        <span>{t('requirementsSubmitted')}</span>
      </div>
      {hasFiles && (
        <AssetFileList
          assetIds={assetIds}
          layout="grid"
          showSize={false}
          className="grid-cols-4"
          token={token}
        />
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

export function OrderTimeline({
  events,
  className,
  token,
  firstProductionStageName,
}: Props) {
  const t = useTranslations('portal')
  const locale = useLocale()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  function getDescription(event: OrderTaskEvent): string {
    const fromName = event.fromStageName
    const toName = event.toStageName
    const metadata = event.metadata

    const formattedFrom = fromName ?? t('timelineQueue')

    if (event.type === 'moved_to_stage' || event.type === 'stage_transition') {
      if (!fromName && !toName) {
        return t('timelineQueued')
      }
      // Task completed last pre-production stage → show "Ready for Production"
      if (!toName && metadata?.readyForProduction) {
        return t('timelineTransition', {
          from: fromName ?? t('timelineQueue'),
          to: getReadyForProductionLabel({
            firstProductionStageName,
            readyForProduction: t('timelineReadyForProduction'),
            readyForProductionWithStage: (values) =>
              t('timelineReadyForProductionWithStage', values),
          }),
        })
      }
      return t('timelineTransition', {
        from: formattedFrom,
        to: toName ?? '',
      })
    }

    switch (event.type) {
      case 'created':
        return t('timelineQueued')
      case 'completed':
        return t('timelineCompleted')
      case 'approved_and_moved':
      case 'board_transition': {
        // Use board name as fallback when stage name is missing
        const boardLabel =
          metadata?.fromBoard === 'pre_production'
            ? t('timelineReadyForProduction')
            : metadata?.fromBoard
              ? metadata.fromBoard.charAt(0).toUpperCase() +
                metadata.fromBoard.slice(1).replace(/_/g, ' ')
              : null
        const effectiveFrom = fromName ?? boardLabel ?? t('timelineQueue')
        if (toName) {
          return t('timelineTransition', {
            from: effectiveFrom,
            to: toName,
          })
        }
        return toName ?? effectiveFrom ?? ''
      }
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
              {mounted
                ? `${formatShortDate(String(event.createdAt), locale)} ${new Date(event.createdAt).toLocaleTimeString(locale, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : ''}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-foreground">
              <span>{getDescription(event)}</span>
            </p>
            {event.requirementResponses &&
            event.requirementResponses.length > 0 ? (
              <RequirementResponses
                responses={event.requirementResponses[0].responses}
                token={token}
              />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
