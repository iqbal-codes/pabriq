import { useLocale, useTranslations } from 'use-intl'
import { StatusBadge } from '#/components/status-badge'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import type { OrderForInvoice } from '#/features/invoices/model'
import { formatProductDesignLabel } from '#/features/orders/line-item-display'
import { formatCurrency } from '#/lib/formatters'
import type { InvoicePercentageMode } from './create-invoice-form-types'
import { InvoiceAmountInput } from './invoice-amount-input'

type OrderForInvoiceSummaryCardProps = {
  orderData: OrderForInvoice
  selectedPercentage: InvoicePercentageMode
  customAmount: number
  invoiceTotal: number
  onSelectedPercentageChange: (value: InvoicePercentageMode) => void
  onCustomAmountChange: (value: number) => void
}

export function OrderForInvoiceSummaryCard(
  props: OrderForInvoiceSummaryCardProps,
): React.ReactElement {
  const {
    orderData,
    selectedPercentage,
    customAmount,
    invoiceTotal,
    onSelectedPercentageChange,
    onCustomAmountChange,
  } = props
  const t = useTranslations('invoices')
  const locale = useLocale()

  return (
    <>
      {/* Order Summary Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t('orderLabel', {
              orderNumber: orderData.order.orderNumber ?? '—',
            })}
            <StatusBadge status={orderData.order.status} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">{t('customer')}</p>
              <p className="font-medium">
                {orderData.order.customerName ?? '—'}
              </p>
              {orderData.order.customerPhone && (
                <p className="text-sm text-muted-foreground">
                  {orderData.order.customerPhone}
                </p>
              )}
              {orderData.order.customerEmail && (
                <p className="text-sm text-muted-foreground">
                  {orderData.order.customerEmail}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('total')}</p>
              <p className="text-2xl font-bold">
                {formatCurrency(orderData.order.total, locale)}
              </p>
            </div>
          </div>

          {/* Already Invoiced Progress */}
          {orderData.existingInvoices.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                {t('alreadyInvoiced', {
                  percentage: orderData.invoicedPercentage,
                  amount: formatCurrency(orderData.invoicedAmount, locale),
                })}
              </p>
              <div className="flex gap-4 text-sm">
                {orderData.existingInvoices.map((inv) => (
                  <Badge key={inv.id} variant="secondary">
                    {inv.invoiceNumber}: {inv.percentage}% (
                    {formatCurrency(inv.total, locale)})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground mb-2">
              {t('invoiceAmount')}
            </p>
            <div className="space-y-3">
              {orderData.existingInvoices.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={
                      selectedPercentage === 'remaining' ? 'default' : 'outline'
                    }
                    size="sm"
                    onClick={() => onSelectedPercentageChange('remaining')}
                    disabled={orderData.remainingPercentage <= 0}
                  >
                    {t('remaining')} ({orderData.remainingPercentage}%)
                  </Button>
                </div>
              )}
              <InvoiceAmountInput
                ariaLabel={t('invoiceAmount')}
                baseAmount={orderData.order.total}
                value={customAmount}
                onChange={(value) => {
                  onSelectedPercentageChange('custom')
                  onCustomAmountChange(value)
                }}
              />
            </div>
            <p className="mt-2 font-semibold">
              {t('invoiceTotal', {
                amount: formatCurrency(invoiceTotal, locale),
              })}
              {selectedPercentage === 'remaining' && (
                <span className="text-sm text-muted-foreground font-normal ml-2">
                  {t('remainingFrom', {
                    amount: formatCurrency(orderData.order.total, locale),
                  })}
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Order Line Items (read-only) */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('lineItems')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('description')}</TableHead>
                <TableHead className="text-right">{t('qty')}</TableHead>
                <TableHead className="text-right">{t('rate')}</TableHead>
                <TableHead className="text-right">{t('total')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderData.lineItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {formatProductDesignLabel(
                      item.productName,
                      item.designName,
                    )}
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unitPrice, locale)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.total, locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
