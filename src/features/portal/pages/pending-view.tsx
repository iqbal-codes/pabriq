import { CheckCircle2, ClipboardCheck, Eye, Hourglass } from 'lucide-react'
import { useLocale, useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'
import { PortalContactButton } from '../components/portal-contact-button'
import { PortalOrderSummary } from '../components/portal-order-summary'
import { formatLongDate } from '#/lib/formatters'
import type { PortalOrder } from '../model'

const STEPS = [
  { id: 'review' as const, icon: Eye },
  { id: 'approve' as const, icon: ClipboardCheck },
  { id: 'confirm' as const, icon: Hourglass },
]

export function PendingView({ order }: { order: PortalOrder }) {
  const t = useTranslations('portal')
  const locale = useLocale()

  const receivedAt = formatLongDate(
    String(order.createdAt ?? new Date()),
    locale,
  )

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="flex items-start gap-4 px-5 py-6 sm:px-6">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="size-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('progressHeroLabel')}
            </p>
            <h1 className="mt-1 text-balance text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
              {t('pendingHeroTitle')}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('pendingHeroSubtitle', { org: order.orgName })}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {t('pendingHelp')}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {order.orderNumber ? (
                <span className="font-mono">{order.orderNumber}</span>
              ) : null}
              {order.createdAt ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{t('pendingReceivedAt', { date: receivedAt })}</span>
                </>
              ) : null}
              <Badge variant="secondary" className="ml-auto capitalize">
                {t('statusPending')}
              </Badge>
            </div>
          </div>
        </div>

        <div className="border-t border-border bg-muted/30 px-5 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('pendingStepsTitle')}
          </p>
          <ol className="mt-3 grid gap-3 sm:grid-cols-3">
            {STEPS.map((step, idx) => {
              const Icon = step.icon
              return (
                <li
                  key={step.id}
                  className="flex items-start gap-3 rounded-lg border border-border bg-background/70 p-3"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-semibold text-foreground tabular-nums">
                    {idx + 1}
                  </span>
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      {t(
                        `pendingStep${step.id.charAt(0).toUpperCase()}${step.id.slice(1)}` as 'pendingStepReview',
                      )}
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        {order.orgPhone ? (
          <div className="border-t border-border px-5 py-4 sm:px-6">
            <PortalContactButton
              order={order}
              label="chatOnWhatsApp"
              className="w-full sm:w-auto"
            />
          </div>
        ) : null}
      </section>

      <PortalOrderSummary
        order={order}
        className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
      />
    </div>
  )
}
