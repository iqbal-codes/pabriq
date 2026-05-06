import type { OrderTaskEvent } from '../model'

type Props = {
  events: OrderTaskEvent[]
}

export function OrderTimeline({ events }: Props) {
  return (
    <div className="space-y-3">
      {events.map((event, i) => (
        <div key={event.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />
            {i < events.length - 1 && <div className="w-px flex-1 bg-border" />}
          </div>
          <div className="pb-3">
            <p className="text-xs text-muted-foreground">
              {event.createdAt.toLocaleDateString()}
            </p>
            <p className="text-sm">
              <span className="font-mono text-xs">{event.taskNumber}</span>{' '}
              {event.fromStageName ?? 'Queue'} → {event.toStageName}
            </p>
            <p className="text-xs text-muted-foreground">{event.productName}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
