import { Link } from '@tanstack/react-router'
import { Bell } from 'lucide-react'
import { useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet'
import { formatCurrency, formatShortDate } from '#/lib/formatters'
import { formatActionNotification, type NotificationT } from '../format'
import { useActionNotifications } from '../hooks'
import type { ActionNotification } from '../model'

export function NotificationBell() {
  const t = useTranslations('notifications')
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const { data, isLoading } = useActionNotifications(20)

  const items = data?.items ?? []
  const totalCount = data?.totalCount ?? 0

  const badgeText = totalCount > 99 ? '99+' : totalCount

  const fmtAmount = (amount: number) => formatCurrency(amount, locale)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-4" />
          {totalCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full p-1 text-[10px] font-bold"
            >
              {badgeText}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex flex-col h-full w-full sm:max-w-md p-0"
      >
        <SheetHeader className="p-6 border-b shrink-0">
          <SheetTitle className="text-lg font-semibold">
            {t('title')}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground mt-1">
            {t('subtitle', { count: totalCount })}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto min-h-0 p-6">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {t('emptyDescription')}
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 mb-4">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">{t('emptyTitle')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('emptyDescription')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const { label, message } = formatActionNotification({
                  item,
                  t: t as unknown as NotificationT,
                  formatAmount: fmtAmount,
                })

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2.5 p-4 rounded-none border border-border bg-card hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[10px] uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5">
                        {label}
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        {formatShortDate(item.createdAt.toISOString(), locale)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground break-words leading-relaxed">
                      {message}
                    </p>
                    <div className="flex justify-end mt-1">
                      <Button size="xs" variant="outline" asChild>
                        {renderNotificationLink(item, t('openAction'), () =>
                          setOpen(false),
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function renderNotificationLink(
  item: ActionNotification,
  labelText: string,
  onClose: () => void,
) {
  if (item.type === 'payment_confirmation') {
    return (
      <button type="button" onClick={onClose}>
        {labelText}
      </button>
    )
  }
  if (
    item.type === 'order_review' ||
    item.type === 'dp_invoice_request' ||
    item.type === 'final_invoice_request'
  ) {
    return (
      <Link
        to="/orders/$id"
        params={{ id: item.context.orderId }}
        onClick={onClose}
      >
        {labelText}
      </Link>
    )
  }
  // task_review
  return (
    <Link
      to="/production"
      search={{ modal: 'review-task', modalId: item.context.taskId }}
      onClick={onClose}
    >
      {labelText}
    </Link>
  )
}
