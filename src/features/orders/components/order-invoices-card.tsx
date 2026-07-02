import { Link } from '@tanstack/react-router'
import { CheckCircle2, Eye, Printer } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { AssetImage } from '#/components/app/asset-image'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import type { InvoiceRow } from '#/features/invoices/model'
import { currencyFormatter } from './view-order-utils'

export function OrderInvoicesCard({
  orderInvoices,
  invoicePayments,
  onMarkInvoicePaid,
  isMarkingPaid,
}: {
  orderInvoices: InvoiceRow[]
  invoicePayments: Record<string, Array<{ id: string; proofAssetId: string }>>
  onMarkInvoicePaid: (invoiceId: string) => void
  isMarkingPaid: boolean
}) {
  const st = useTranslations('status')
  const it = useTranslations('invoices')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{it('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {orderInvoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">{it('noInvoices')}</p>
        ) : (
          <div className="space-y-3">
            {orderInvoices.map((inv) => {
              const payments = invoicePayments?.[inv.id] ?? []
              const proofPayments = payments.filter((p) => p.proofAssetId)
              const canMarkPaid =
                inv.status === 'unpaid' || inv.status === 'partially_paid'

              return (
                <div key={inv.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{inv.invoiceNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {inv.percentage && <>{inv.percentage}%: </>}
                        {currencyFormatter.format(inv.total)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>
                        {st(
                          inv.status as
                            | 'draft'
                            | 'paid'
                            | 'unpaid'
                            | 'void'
                            | 'partially_paid'
                            | 'overdue'
                            | 'pendingPayment'
                            | 'failed',
                        )}
                      </Badge>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon-sm" asChild>
                            <a
                              href={`/api/documents/invoices/${inv.id}/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Printer className="size-4" />
                            </a>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{it('printInvoice')}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon-sm" asChild>
                            <Link to="/invoices/$id" params={{ id: inv.id }}>
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{it('viewInvoice')}</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {canMarkPaid && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => onMarkInvoicePaid(inv.id)}
                        disabled={isMarkingPaid}
                      >
                        <CheckCircle2 className="mr-1 size-3" />
                        {it('markAsPaid')}
                      </Button>
                    )}
                  </div>

                  {/* Payment proof images */}
                  {proofPayments.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        {it('paymentProof')}
                      </p>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                        {proofPayments.map((p) => (
                          <div
                            key={p.id}
                            className="relative aspect-square overflow-hidden rounded-lg border"
                          >
                            <AssetImage
                              assetId={p.proofAssetId}
                              assetKind="image"
                              className="size-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
