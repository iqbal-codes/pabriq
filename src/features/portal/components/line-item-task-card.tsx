import { FileIcon } from 'lucide-react'
import { useLocale, useTranslations } from 'use-intl'
import { AssetFileList } from '#/components/app/asset-file'
import { Badge } from '#/components/ui/badge'
import { Card } from '#/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { formatCurrency } from '#/lib/formatters'
import type { OrderTaskEvent, PortalLineItem } from '../model'
import { OrderTimeline } from './order-timeline'

function getItemStatus(
  events: OrderTaskEvent[],
  fallbackStageName: string | null,
  t: (key: string, params?: Record<string, string>) => string,
): string | null {
  if (events.length === 0) {
    return fallbackStageName
  }

  const latest = events[0]

  if (latest.type === 'completed') {
    return t('timelineStatusCompleted')
  }

  if (latest.type === 'board_transition' && latest.toStageName) {
    return t('timelineStatusInProgress', { stage: latest.toStageName })
  }

  if (
    (latest.type === 'stage_transition' || latest.type === 'moved_to_stage') &&
    latest.toStageName
  ) {
    return t('timelineStatusInProgress', { stage: latest.toStageName })
  }

  if (latest.type === 'created' && latest.toStageName) {
    return t('timelineStatusInProgress', { stage: latest.toStageName })
  }

  return fallbackStageName
}

export function LineItemTaskCard({
  item,
  events,
}: {
  item: PortalLineItem
  events: OrderTaskEvent[]
}) {
  const t = useTranslations('portal')
  const locale = useLocale()

  const itemEvents = events
    .filter((e) => e.taskId === item.taskId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

  const statusText = getItemStatus(
    itemEvents,
    item.currentStageName,
    t as (key: string, params?: Record<string, string>) => string,
  )

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="flex flex-row items-start h-auto w-full gap-3 p-4 text-left">
          <div className="flex-1 min-w-0">
            {item.taskNumber && (
              <p className="font-mono text-xs text-muted-foreground">
                {item.taskNumber}
              </p>
            )}
            <p className="text-sm font-medium truncate">
              {item.name || item.productName}
            </p>
            <p className="text-xs text-muted-foreground">
              {item.quantity} × {formatCurrency(item.unitPrice, locale)}
            </p>
            {item.productionDays > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t('productionDaysLabel', { days: item.productionDays })}
              </p>
            )}
            {item.notes && (
              <p className="mt-1 text-xs text-muted-foreground truncate">
                {item.notes}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {statusText && <Badge variant="secondary">{statusText}</Badge>}
            <p className="text-sm font-medium">
              {formatCurrency(item.total, locale)}
            </p>
            {item.assetIds.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <FileIcon className="size-3" />
                {item.assetIds.length}
              </span>
            )}
          </div>
        </Card>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-left">
            {item.name || item.productName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex flex-row items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {item.quantity} × {formatCurrency(item.unitPrice, locale)}
              </p>
              <p className="text-base font-semibold text-card-foreground">
                {formatCurrency(item.total, locale)}
              </p>
            </div>
            {item.productionDays > 0 && (
              <p className="text-xs text-muted-foreground">
                {t('productionDaysLabel', { days: item.productionDays })}
              </p>
            )}
            {item.notes && (
              <div>
                <h3 className="text-sm font-semibold">{t('notes')}</h3>
                <p className="text-sm text-muted-foreground">{item.notes}</p>
              </div>
            )}
          </div>
          {item.assetIds.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">{t('attachment')}</h3>
              <AssetFileList assetIds={item.assetIds} layout="list" />
            </div>
          )}
          {item.taskId && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">
                {t('taskTimeline')}
              </h3>
              {itemEvents.length > 0 ? (
                <OrderTimeline events={itemEvents} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t('noStageTransitions')}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
