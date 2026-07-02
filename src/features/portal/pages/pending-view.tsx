import { CheckCircle2, ClipboardCheck, Eye, Hourglass } from 'lucide-react'
import { useLocale, useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'
import { CustomerInfoCard } from '#/features/portal/components/customer-info-card'
import { ShippingAddressCard } from '#/features/portal/components/shipping-address-card'
import { formatLongDate } from '#/lib/formatters'
import { PortalContactButton } from '../components/portal-contact-button'
import { PortalOrderSummary } from '../components/portal-order-summary'
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
      {/* Status Hero Card */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="size-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('progressHeroLabel')}
              </p>
              <Badge variant="secondary" className="capitalize">
                {t('statusPending')}
              </Badge>
            </div>
            <h1 className="mt-1.5 text-balance text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
              {t('pendingHeroTitle')}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('pendingHeroSubtitle', { org: order.orgName })}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('pendingHelp')}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
              {order.orderNumber ? (
                <>
                  <span className="font-mono text-foreground">
                    {order.orderNumber}
                  </span>
                  {order.createdAt ? (
                    <span aria-hidden className="text-muted-foreground/30">
                      ·
                    </span>
                  ) : null}
                </>
              ) : null}
              {order.createdAt ? (
                <span>{t('pendingReceivedAt', { date: receivedAt })}</span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Details Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <CustomerInfoCard
          name={order.customerName}
          phone={order.customerPhone}
          photoAssetId={order.customerPhotoAssetId}
        />
        <ShippingAddressCard address={order.shippingAddress} />
      </div>

      {/* Next Steps */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('pendingStepsTitle')}
        </h2>
        <ol className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch">
          {STEPS.map((step, idx) => {
            const Icon = step.icon
            return (
              <li
                key={step.id}
                className="flex flex-1 items-start gap-3 rounded-xl border border-border bg-muted/20 p-4"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-semibold text-foreground tabular-nums">
                  {idx + 1}
                </span>
                <div className="flex min-w-0 flex-1 gap-2">
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <p className="text-sm text-foreground leading-snug">
                    {t(
                      `pendingStep${step.id.charAt(0).toUpperCase()}${step.id.slice(1)}` as 'pendingStepReview',
                    )}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      {/* Order Summary */}
      <PortalOrderSummary
        order={order}
        className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
      />

      {/* Contact Admin */}
      {order.orgPhone ? (
        <div className="flex justify-center">
          <PortalContactButton
            order={order}
            label="chatOnWhatsApp"
            className="w-full sm:w-auto"
          />
        </div>
      ) : null}
    </div>
  )
}
