import { Link, useParams, useRouteContext } from '@tanstack/react-router'
import { Copy, Mail, Phone } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { AvatarPhoto } from '#/components/app/avatar-photo'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { StatusBadge } from '#/components/status-badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { useCustomer } from '#/features/customers/hooks'
import { useInvoicesList } from '#/features/invoices/hooks'
import {
  currencyFormatter,
  dateFormatter,
} from '#/features/orders/components/view-order-utils'
import { useOrdersList } from '#/features/orders/hooks'

function TableSkeleton({ columns }: { columns: number }) {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={`skeleton-${i}`}>
          {Array.from({ length: columns }).map((_, j) => (
            <TableCell key={`cell-${j}`}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

function CopyButton({ text }: { text: string }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-6"
      onClick={() => navigator.clipboard.writeText(text)}
    >
      <Copy className="size-3" />
    </Button>
  )
}

export function ViewCustomerPage() {
  const { id } = useParams({ from: '/_org/customers/$id/' })
  const ctx = useRouteContext({ from: '/_org/customers/$id/' }) as {
    org: { id: string }
  }
  const customer = useCustomer(id).data
  const t = useTranslations('customers')
  const ct = useTranslations('common')
  const at = useTranslations('address')
  const ot = useTranslations('orders')
  const it = useTranslations('invoices')

  const { data: ordersData, isLoading: ordersLoading } = useOrdersList({
    orgId: ctx.org.id,
    customerId: id,
    page: 1,
    perPage: 10,
  })

  const { data: invoicesData, isLoading: invoicesLoading } = useInvoicesList({
    orgId: ctx.org.id,
    customerId: id,
    page: 1,
    perPage: 10,
  })

  if (!customer) {
    return (
      <PageContent>
        <p>{t('noCustomers')}</p>
      </PageContent>
    )
  }

  const orders = ordersData?.rows ?? []
  const invoices = invoicesData?.rows ?? []

  // Financial calculations
  const totalOrders = ordersData?.totalRows ?? 0
  const totalSpent = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0)
  const outstandingBalance = invoices
    .filter((inv) => inv.status === 'unpaid' || inv.status === 'partially_paid')
    .reduce((sum, inv) => sum + inv.total, 0)

  const citizenship = customer.isWni ? at('isWni') : at('isWna')

  return (
    <PageContent>
      <PageHeader
        title={t('viewCustomer')}
        backAction={{ label: ct('back'), href: '/customers' }}
        primaryAction={{
          label: t('editCustomer'),
          href: `/customers/${customer.id}/edit`,
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left Pane */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Orders Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('recentOrders')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border bg-muted/50 p-1.5">
                <div className="rounded-lg border bg-background overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{ot('orderNumber')}</TableHead>
                        <TableHead>{ot('createdAt')}</TableHead>
                        <TableHead>{ot('total')}</TableHead>
                        <TableHead>{ot('status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordersLoading ? (
                        <TableSkeleton columns={4} />
                      ) : orders.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center text-muted-foreground"
                          >
                            {ot('noOrders')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>
                              <Link
                                to="/orders/$id"
                                params={{ id: order.id }}
                                className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                              >
                                {order.orderNumber ?? '—'}
                              </Link>
                            </TableCell>
                            <TableCell>
                              {dateFormatter.format(order.createdAt)}
                            </TableCell>
                            <TableCell className="font-mono">
                              {currencyFormatter.format(order.total)}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={order.status} />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoices Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('recentInvoices')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border bg-muted/50 p-1.5">
                <div className="rounded-lg border bg-background overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{it('invoiceNumber')}</TableHead>
                        <TableHead>{it('issuedDate')}</TableHead>
                        <TableHead>{it('dueDate')}</TableHead>
                        <TableHead>{it('total')}</TableHead>
                        <TableHead>{it('status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoicesLoading ? (
                        <TableSkeleton columns={5} />
                      ) : invoices.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground"
                          >
                            {it('noInvoices')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        invoices.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell>
                              <span className="font-medium text-foreground">
                                {inv.invoiceNumber}
                              </span>
                            </TableCell>
                            <TableCell>
                              {dateFormatter.format(inv.createdAt)}
                            </TableCell>
                            <TableCell>
                              {inv.dueDate
                                ? dateFormatter.format(new Date(inv.dueDate))
                                : '—'}
                            </TableCell>
                            <TableCell className="font-mono">
                              {currencyFormatter.format(inv.total)}
                              {inv.percentage != null && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({inv.percentage}%)
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={inv.status} />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Pane */}
        <div className="lg:col-span-1 space-y-6">
          {/* Customer Profile Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center mb-6">
                <AvatarPhoto
                  assetId={customer.photoAssetId}
                  name={customer.name}
                  className="size-20 mb-3"
                />
                <h2 className="text-lg font-semibold">{customer.name}</h2>
                <StatusBadge status={customer.active ? 'active' : 'inactive'} />
              </div>

              <div className="space-y-4">
                {/* Email */}
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground">
                      {t('email')}
                    </p>
                    <p className="truncate">{customer.email ?? '—'}</p>
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        asChild
                      >
                        <a href={`mailto:${customer.email}`}>
                          <Mail className="size-3" />
                        </a>
                      </Button>
                      <CopyButton text={customer.email} />
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground">
                      {t('phone')}
                    </p>
                    <p className="truncate">{customer.phone ?? '—'}</p>
                  </div>
                  {customer.phone && (
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        asChild
                      >
                        <a
                          href={`https://wa.me/${customer.phone.replace(/^0/, '62')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Phone className="size-3" />
                        </a>
                      </Button>
                      <CopyButton text={customer.phone} />
                    </div>
                  )}
                </div>

                {/* Citizenship */}
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('citizenship')}
                  </p>
                  <p>{citizenship}</p>
                </div>

                {/* Address */}
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('address')}
                  </p>
                  {customer.address ? (
                    <div>
                      <p>{customer.address.streetAddress}</p>
                      <p className="text-sm text-muted-foreground">
                        {customer.address.areaName}
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">
                      {t('noShippingAddress')}
                    </p>
                  )}
                </div>

                {/* Notes */}
                {customer.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('notes')}
                    </p>
                    <p className="whitespace-pre-wrap text-sm">
                      {customer.notes}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('financialSummary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t('totalOrders')}
                </p>
                <p className="font-semibold">{totalOrders}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t('totalSpent')}
                </p>
                <p className="font-semibold font-mono">
                  {currencyFormatter.format(totalSpent)}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t('outstandingBalance')}
                </p>
                <p
                  className={`font-semibold font-mono ${outstandingBalance > 0 ? 'text-destructive' : ''}`}
                >
                  {currencyFormatter.format(outstandingBalance)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContent>
  )
}
