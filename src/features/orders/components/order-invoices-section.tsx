import { Printer, ReceiptText } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'
import { StatusBadge } from '#/components/status-badge'
import { Button } from '#/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import type { InvoiceRow } from '#/features/invoices/model'
import { currencyFormatter } from './view-order-utils'

function getInvoiceBadgeType(
  _invoice: InvoiceRow,
  index: number,
  totalCount: number,
): 'dp' | 'settlement' | null {
  if (totalCount <= 1) return null
  if (index === 0) return 'dp'
  if (index === totalCount - 1) return 'settlement'
  return null
}

type Props = {
  orderInvoices: InvoiceRow[]
  invoicePayments: Record<string, Array<{ id: string; proofAssetId: string }>>
}

export function OrderInvoicesSection({
  orderInvoices,
  invoicePayments,
}: Props): React.ReactElement | null {
  const it = useTranslations('invoices')
  const pt = useTranslations('portal')
  const [expanded, setExpanded] = useState(false)

  const visibleInvoices = orderInvoices.filter((inv) => inv.status !== 'void')
  if (visibleInvoices.length === 0) return null

  const initialCount = Math.min(2, visibleInvoices.length)
  const remainingCount = visibleInvoices.length - initialCount
  const displayed = expanded
    ? visibleInvoices
    : visibleInvoices.slice(0, initialCount)

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <ReceiptText className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            {it('title')}
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {visibleInvoices.length}{' '}
          {visibleInvoices.length === 1 ? 'invoice' : 'invoices'}
        </span>
      </header>

      <ul className="divide-y divide-border">
        {displayed.map((inv) => {
          const originalIndex = visibleInvoices.findIndex(
            (v) => v.id === inv.id,
          )
          const badgeType = getInvoiceBadgeType(
            inv,
            originalIndex,
            visibleInvoices.length,
          )
          const payments = invoicePayments?.[inv.id] ?? []
          const proofPayments = payments.filter((p) => p.proofAssetId)

          return (
            <li
              key={inv.id}
              className="grid gap-3 border-b border-border px-4 py-4 last:border-b-0 sm:px-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 w-full">
                  <div className="flex items-center gap-2 w-full justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                        {inv.invoiceNumber}
                      </p>
                    </div>
                    <StatusBadge status={inv.status} />
                  </div>
                  <div className="flex flex-row items-center mt-0.5">
                    <div className="flex flex-row gap-2 items-center w-full">
                      <p className="text-xl font-bold tabular-nums text-foreground">
                        {currencyFormatter.format(inv.total)}
                      </p>
                      {badgeType === 'dp' && (
                        <span className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {pt('invoiceDownPayment')}
                        </span>
                      )}
                      {badgeType === 'settlement' && (
                        <span className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {pt('invoiceFinalPayment')}
                        </span>
                      )}
                    </div>
                  </div>
                  {inv.shippingFee && inv.shippingFee > 0 ? (
                    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                      + {currencyFormatter.format(inv.shippingFee)}{' '}
                      {pt('invoiceShipmentFee').toLowerCase()}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Proof images + actions */}
              <div className="flex items-center gap-3">
                {proofPayments.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-1">
                    {proofPayments.map((p) => (
                      <div
                        key={p.id}
                        className="relative size-10 overflow-hidden rounded-md ring-1 ring-border"
                      >
                        <AssetImage
                          assetId={p.proofAssetId}
                          assetKind="image"
                          className="size-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="ml-auto">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon-sm" asChild>
                        <a
                          href={`/api/documents/invoices/${inv.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Printer className="size-3.5" />
                        </a>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{it('printInvoice')}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {remainingCount > 0 && (
        <div className="border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full rounded-none text-xs"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded
              ? pt('invoiceShowLess')
              : pt('invoiceShowAll', { count: remainingCount })}
          </Button>
        </div>
      )}
    </section>
  )
}
