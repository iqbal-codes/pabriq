import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
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
import { useInvoice } from '#/features/invoices/hooks'
import { markInvoicePaidFn, voidInvoiceFn } from '#/features/invoices/server'
import { Route } from '#/routes/_org/invoices/$id/index'

export function InvoiceDetailPage() {
  const { id } = Route.useParams()
  const queryClient = useQueryClient()
  const t = useTranslations('invoices')
  const st = useTranslations('status')

  const { data: result } = useInvoice(id)

  const markPaid = useMutation({
    mutationFn: () => markInvoicePaidFn({ data: { id } }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(t('markAsPaid'))
        queryClient.invalidateQueries({ queryKey: ['invoices'] })
      } else {
        toast.error(res.error ?? 'Failed')
      }
    },
  })

  const voidInv = useMutation({
    mutationFn: () => voidInvoiceFn({ data: { id } }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(t('voidInvoice'))
        queryClient.invalidateQueries({ queryKey: ['invoices'] })
      } else {
        toast.error(res.error ?? 'Failed')
      }
    },
  })

  if (!result) {
    return (
      <PageContent>
        <PageHeader title={t('viewInvoice')} />
      </PageContent>
    )
  }

  const { invoice, lineItems, paymentMethod } = result
  const isUnpaid = invoice.status === 'unpaid'
  const isOverdue = isUnpaid && new Date(invoice.dueDate) < new Date()

  return (
    <PageContent>
      <PageHeader title={`${t('viewInvoice')} — ${invoice.invoiceNumber}`} />

      <div className="mb-4 flex items-center gap-2">
        <Badge>{st(invoice.status as keyof typeof st)}</Badge>
        {isOverdue && <Badge variant="destructive">{t('overdue')}</Badge>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('customer')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{invoice.customerName}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('total')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
              }).format(invoice.total)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('dueDate')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{invoice.dueDate}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('paymentMethod')}</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentMethod ? (
              <div>
                <p className="font-medium">{paymentMethod.name}</p>
                {paymentMethod.bankName && (
                  <p className="text-sm text-muted-foreground">
                    {paymentMethod.bankName}
                    {paymentMethod.accountNumber
                      ? ` — ${paymentMethod.accountNumber}`
                      : ''}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t('lineItems')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">{t('total')}</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0,
                    }).format(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0,
                    }).format(item.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isUnpaid && (
        <div className="mt-6 flex gap-2">
          <Button
            onClick={() => markPaid.mutate()}
            disabled={markPaid.isPending}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {t('markAsPaid')}
          </Button>
          <Button
            variant="outline"
            onClick={() => voidInv.mutate()}
            disabled={voidInv.isPending}
          >
            <XCircle className="mr-2 h-4 w-4" />
            {t('voidInvoice')}
          </Button>
        </div>
      )}
    </PageContent>
  )
}
