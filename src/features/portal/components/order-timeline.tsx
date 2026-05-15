import { ArrowRight, CheckCircle2, Clock, Upload } from 'lucide-react'
import { AssetImage } from '#/components/app/asset-image'
import type { OrderTaskEvent } from '../model'

type Props = {
  events: OrderTaskEvent[]
}

function getDescription(event: OrderTaskEvent): string {
  switch (event.type) {
    case 'created':
      return `Task created → ${event.toStageName ?? 'Queue'}`
    case 'stage_transition':
      return `Entered ${event.toStageName}`
    case 'completed':
      return `Completed from ${event.fromStageName ?? 'stage'}`
    default:
      return event.type
  }
}

function getIcon(event: OrderTaskEvent): React.ReactNode {
  switch (event.type) {
    case 'created':
      return <Clock className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
    case 'stage_transition':
      return (
        <ArrowRight className="size-3.5 text-brand-accent shrink-0 mt-0.5" />
      )
    case 'completed':
      return (
        <CheckCircle2 className="size-3.5 text-success shrink-0 mt-0.5" />
      )
    default:
      return null
  }
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
  const hasFiles = responses.some((r) => r.assetIds && r.assetIds.length > 0)
  const hasValues = responses.some((r) => r.value)

  if (!hasFiles && !hasValues) return null

  return (
    <div className="mt-2 space-y-2 rounded-lg bg-muted/50 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Upload className="size-3" />
        <span>Requirements submitted</span>
      </div>
      {hasFiles && (
        <div className="grid grid-cols-4 gap-2">
          {responses
            .filter((r) => r.assetIds && r.assetIds.length > 0)
            .flatMap((r) =>
              (r.assetIds ?? []).map((assetId) => (
                <AssetImage
                  key={assetId}
                  assetId={assetId}
                  assetKind="image"
                  className="h-12 w-12 rounded-md object-cover"
                />
              )),
            )}
        </div>
      )}
      {hasValues && (
        <div className="space-y-1">
          {responses
            .filter((r) => r.value)
            .map((r, i) => (
              <div key={i} className="text-xs">
                <span className="font-medium text-muted-foreground">
                  {r.requirementName}:
                </span>{' '}
                <span className="text-foreground">{r.value}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

export function OrderTimeline({ events }: Props) {
  return (
    <div className="space-y-3">
      {events.map((event, i) => (
        <div key={event.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="size-6 flex items-start justify-center shrink-0 mt-0.5">
              {getIcon(event)}
            </div>
            {i < events.length - 1 && <div className="w-px flex-1 bg-border" />}
          </div>
          <div className="pb-3 min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">
              {new Date(event.createdAt).toLocaleDateString()}{' '}
              {new Date(event.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <p className="text-sm flex items-center gap-1.5">
              {event.taskNumber && (
                <span className="font-mono text-xs">{event.taskNumber}</span>
              )}
              <span>{getDescription(event)}</span>
            </p>
            {event.requirementResponses && event.requirementResponses.length > 0 && (
              <RequirementResponses
                responses={event.requirementResponses[0].responses}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}