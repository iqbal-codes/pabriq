import { Link } from '@tanstack/react-router'
import { Copy, CreditCard, MapPin, Package, Truck, User } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { cn } from '#/lib/utils'
import type { currencyFormatter, dateFormatter } from './view-order-utils'

type OrderDetailSectionProps = {
  order: {
    id: string
    total: number
    status: string
    createdAt: Date
    approvedAt: Date | null
    shippedAt: Date | null
    deliveredAt: Date | null
    courier: string | null
    trackingNumber: string | null
    notes: string | null
    customerId: string | null
  }
  customerName: string | null
  customerPhone: string | null
  customerEmail: string | null
  customerPhotoAssetId: string | null
  shippingAddress: {
    streetAddress: string
    areaName: string
  } | null
  shippingFee: number
  invoicedAmt: number
  remainingAmt: number
  invoicedPct: number
  remainingPct: number
  isApprovedOrLater: boolean
  currencyFormatter: typeof currencyFormatter
  dateFormatter: typeof dateFormatter
  className?: string
}

export function OrderDetailSection({
  order,
  customerName,
  customerPhone,
  customerEmail,
  shippingAddress,
  shippingFee,
  invoicedAmt,
  remainingAmt,
  invoicedPct,
  remainingPct,
  isApprovedOrLater,
  currencyFormatter,
  dateFormatter,
  className,
}: OrderDetailSectionProps) {
  const t = useTranslations('orders')
  const pt = useTranslations('portal')
  const prt = useTranslations('production')
  const st = useTranslations('status')

  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm',
        className,
      )}
    >
      {/* ── Summary ───────────────────────────────────── */}
      <div className="p-4 sm:p-5">
        <header className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Package className="size-3.5" />
          <span>{t('summary')}</span>
        </header>

        <div className="mt-3 grid grid-cols-2 items-baseline gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground">{t('total')}</span>
          <span className="font-semibold tabular-nums text-foreground">
            {currencyFormatter.format(order.total)}
          </span>

          {isApprovedOrLater && (
            <>
              <span className="text-muted-foreground">{t('paymentPaid')}</span>
              <span className="tabular-nums text-foreground">
                {currencyFormatter.format(invoicedAmt)}
                <span className="ml-1 text-muted-foreground">
                  ({invoicedPct}%)
                </span>
              </span>
              <span className="text-muted-foreground">
                {t('paymentUnpaid')}
              </span>
              <span className="tabular-nums text-foreground">
                {currencyFormatter.format(remainingAmt)}
                <span className="ml-1 text-muted-foreground">
                  ({remainingPct}%)
                </span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Dates ──────────────────────────────────────── */}
      <div className="border-t border-border px-4 py-3 sm:px-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <p className="text-xs text-muted-foreground">{t('createdAt')}</p>
            <p className="text-sm tabular-nums">
              {order.createdAt ? dateFormatter.format(order.createdAt) : '-'}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">{st('approved')}</p>
            <p className="text-sm tabular-nums">
              {order.approvedAt ? dateFormatter.format(order.approvedAt) : '-'}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">{st('in_delivery')}</p>
            <p className="text-sm tabular-nums">
              {order.shippedAt ? dateFormatter.format(order.shippedAt) : '-'}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">{st('completed')}</p>
            <p className="text-sm tabular-nums">
              {order.deliveredAt
                ? dateFormatter.format(order.deliveredAt)
                : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Customer + Address grid ────────────────────── */}
      <div className="border-t border-border px-4 py-3 sm:px-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Customer */}
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <User className="size-3" />
              <span>{t('customer')}</span>
            </p>
            <div className="mt-1.5">
              {order.customerId ? (
                <Link
                  to="/customers/$id"
                  params={{ id: order.customerId }}
                  className="text-sm font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  {customerName ?? pt('guestCustomer')}
                </Link>
              ) : (
                <p className="text-sm font-medium text-foreground">
                  {customerName ?? pt('guestCustomer')}
                </p>
              )}
              <div className="mt-0.5 space-y-0.5">
                {customerPhone && (
                  <a
                    href={`https://wa.me/${customerPhone.replace(/^0/, '62')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-muted-foreground hover:text-foreground"
                  >
                    {customerPhone}
                  </a>
                )}
                {customerEmail && (
                  <a
                    href={`mailto:${customerEmail}`}
                    className="block text-sm text-muted-foreground hover:text-foreground"
                  >
                    {customerEmail}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          {shippingAddress && (
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <MapPin className="size-3" />
                <span>{pt('shippingAddress')}</span>
              </p>
              <div className="mt-1.5 text-sm">
                <p className="text-foreground">
                  {shippingAddress.streetAddress}
                </p>
                {shippingAddress.areaName && (
                  <p className="text-muted-foreground">
                    {shippingAddress.areaName}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Courier + Tracking ─────────────────────────── */}
      {(order.courier || order.trackingNumber || shippingFee > 0) && (
        <div className="border-t border-border px-4 py-3 sm:px-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Truck className="size-3" />
            <span>{t('shippingDetail')}</span>
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
            {order.courier && (
              <span>
                <span className="text-muted-foreground">
                  {prt('courier')}:{' '}
                </span>
                <span className="font-medium text-foreground">
                  {order.courier}
                </span>
              </span>
            )}
            {order.trackingNumber && (
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <span className="text-muted-foreground">
                  {prt('trackingNumber')}:{' '}
                </span>
                <code className="font-mono text-sm text-foreground">
                  {order.trackingNumber}
                </code>
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard.writeText(order.trackingNumber ?? '')
                  }
                  className="inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Copy tracking number"
                >
                  <Copy className="size-3" />
                </button>
              </span>
            )}
            {shippingFee > 0 && (
              <span>
                <span className="text-muted-foreground">
                  {prt('shipmentFee')}:{' '}
                </span>
                <span className="font-medium tabular-nums text-foreground">
                  {currencyFormatter.format(shippingFee)}
                </span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Notes ──────────────────────────────────────── */}
      {order.notes && (
        <div className="border-t border-border px-4 py-3 sm:px-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <CreditCard className="size-3" />
            <span>{t('notes')}</span>
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">
            {order.notes}
          </p>
        </div>
      )}
    </section>
  )
}
