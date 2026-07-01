import { AlertOctagon, CheckCircle2 } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import { PortalContactButton } from '../components/portal-contact-button'
import { PortalOrderSummary } from '../components/portal-order-summary'
import { cn } from '#/lib/utils'
import type { PortalOrder } from '../model'

export function RejectedView({ order }: { order: PortalOrder }) {
  const t = useTranslations('portal')
  const reason = order.rejectReason?.trim() ?? ''

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-destructive/30 bg-card text-card-foreground shadow-sm">
        <div className="flex items-start gap-4 border-b border-destructive/15 bg-destructive/[0.04] px-5 py-6 sm:px-6">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertOctagon className="size-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-destructive">
              {t('progressHeroLabel')}
            </p>
            <h1 className="mt-1 text-balance text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
              {t('rejectedHeroTitle')}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('rejectedHeroSubtitle')}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {order.orderNumber ? (
                <span className="font-mono">{order.orderNumber}</span>
              ) : null}
              {order.orgName ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{order.orgName}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('rejectedReasonTitle')}
          </p>
          <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/[0.03] p-4 text-sm leading-relaxed text-foreground">
            {reason || t('rejectedReasonEmpty')}
          </div>

          {order.lineItems.length > 0 ? (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('rejectedAffectedItems')}
              </p>
              <ul className="mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-background">
                {order.lineItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-baseline justify-between gap-3 px-3 py-2.5 text-sm"
                  >
                    <span className="min-w-0 truncate font-medium text-foreground">
                      {item.name || item.productName}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      × <span className="font-semibold">{item.quantity}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {order.orgPhone ? (
              <PortalContactButton
                order={order}
                label="contactAdmin"
                className={cn('w-full sm:w-auto')}
              />
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.reload()}
                className="gap-2"
              >
                <CheckCircle2 className="size-4" />
                {t('retry')}
              </Button>
            )}
            {reason ? (
              <span className="text-xs italic text-muted-foreground">
                {t('rejectedNote', { note: reason })}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <PortalOrderSummary
        order={order}
        className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
      />

      <p className="text-center text-xs text-muted-foreground">
        {t('rejectedHelp')}
      </p>
    </div>
  )
}
