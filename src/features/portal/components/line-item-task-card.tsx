import { Paperclip } from 'lucide-react'
import { useTranslations } from 'use-intl'
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
import type { OrderTaskEvent, PortalLineItem } from '../model'
import { OrderTimeline } from './order-timeline'

export function LineItemTaskCard({
  item,
  events,
}: {
  item: PortalLineItem
  events: OrderTaskEvent[]
}) {
  const t = useTranslations('portal')

  const itemEvents = events.filter((e) => e.taskId === item.taskId)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="flex flex-row items-start h-auto w-full gap-3 p-4 text-left">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {item.name || item.productName}
            </p>
            <p className="text-xs text-muted-foreground">
              {item.quantity} ×{' '}
              {new Intl.NumberFormat('en-ID', {
                style: 'currency',
                currency: 'IDR',
              }).format(item.unitPrice)}
            </p>
            {item.notes && (
              <p className="mt-1 text-xs text-muted-foreground truncate">
                {item.notes}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {item.currentStageName && (
              <Badge variant="secondary">{item.currentStageName}</Badge>
            )}
            <p className="text-sm font-medium">
              {new Intl.NumberFormat('en-ID', {
                style: 'currency',
                currency: 'IDR',
              }).format(item.total)}
            </p>
            {item.assetIds.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Paperclip className="size-3" />
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
                {item.quantity} ×{' '}
                {new Intl.NumberFormat('en-ID', {
                  style: 'currency',
                  currency: 'IDR',
                }).format(item.unitPrice)}
              </p>
              <p className="text-base font-semibold text-card-foreground">
                {new Intl.NumberFormat('en-ID', {
                  style: 'currency',
                  currency: 'IDR',
                }).format(item.total)}
              </p>
            </div>
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
          {item.taskId && itemEvents.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">
                {t('taskTimeline')}
              </h3>
              <OrderTimeline events={itemEvents} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
