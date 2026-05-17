import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  CheckCircle2,
  Eye,
  Link2,
  Mail,
  Phone,
  Plus,
  Printer,
  Truck,
  User,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
})
const dateFormatter = new Intl.DateTimeFormat('id-ID')

import { AssetImage } from '#/components/app/asset-image'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { StatusBadge } from '#/components/status-badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Textarea } from '#/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { CreateInvoiceModal } from '#/features/invoices/components/create-invoice-modal'
import {
  useInvoicePaymentProofs,
  useInvoicesList,
  useMarkInvoicePaid,
} from '#/features/invoices/hooks'
import { CompleteProductionModal } from '#/features/orders/components/complete-production-modal'
import { useAdvanceOrderStatus, useOrder } from '#/features/orders/hooks'
import { getAssetsForLineItemFn } from '#/features/orders/server'
import { generateOrderTokenFn } from '#/features/portal/server'
import {
  useTaskByLineItemId,
  useTasksByOrderId,
} from '#/features/production/hooks'
import { Route } from '#/routes/_org/orders/$id'

export function ViewOrderPage() {
  const { id } = Route.useParams()
  const ctx = Route.useRouteContext() as { org: { id: string } }
  const { data } = useOrder({ id, orgId: ctx.org.id })
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [completeProductionModalOpen, setCompleteProductionModalOpen] =
    useState(false)
  const isApprovedOrLater = data
    ? [
        'approved',
        'in_progress',
        'production',
        'in_delivery',
        'completed',
      ].includes(data.order.status)
    : false
  const { data: invoicesData } = useInvoicesList({
    orgId: ctx.org.id,
    orderId: id,
    page: 1,
    perPage: 50,
  })
  const { data: tasksData } = useTasksByOrderId(id)
  const orderInvoices = invoicesData?.rows ?? []
  const t = useTranslations('orders')
  const ct = useTranslations('common')
  const st = useTranslations('status')
  const it = useTranslations('invoices')
  const pt = useTranslations('production')

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const queryClient = useQueryClient()

  const approveOrder = useMutation({
    mutationFn: async (input: { id: string }) => {
      const { approveOrderFn } = await import('#/features/orders/server')
      return approveOrderFn({ data: input })
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'lists'] })
      queryClient.invalidateQueries({
        queryKey: ['orders', 'detail', variables.id],
      })
    },
  })

  const rejectOrder = useMutation({
    mutationFn: async (input: { id: string; reason: string }) => {
      const { rejectOrderFn } = await import('#/features/orders/server')
      return rejectOrderFn({ data: input })
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'lists'] })
      queryClient.invalidateQueries({
        queryKey: ['orders', 'detail', variables.id],
      })
      setRejectDialogOpen(false)
      setRejectReason('')
    },
  })

  const generateToken = useMutation({
    mutationFn: async (orderId: string) => {
      return generateOrderTokenFn({ data: { orderId } })
    },
    onSuccess: (_result, orderId) => {
      queryClient.invalidateQueries({
        queryKey: ['orders', 'detail', orderId],
      })
    },
  })

  const handleCopyPortalLink = async () => {
    if (!data) return
    const { order } = data

    let token = order.orderToken
    if (!token) {
      const result = await generateToken.mutateAsync(order.id)
      if (!('token' in result)) {
        toast.error('Failed to generate link')
        return
      }
      token = result.token
    }

    const url = `${window.location.origin}/order/${token}`
    await navigator.clipboard.writeText(url)
    toast.success(t('linkCopied'))
  }

  const handleApprove = async () => {
    if (!data) return
    const result = await approveOrder.mutateAsync({ id: data.order.id })
    if (!result.ok) {
      toast.error(result.error)
    } else {
      toast.success(t('orderApproved'))
    }
  }

  const handleReject = async () => {
    if (!data) return
    if (!rejectReason.trim()) return
    const result = await rejectOrder.mutateAsync({
      id: data.order.id,
      reason: rejectReason.trim(),
    })
    if (!result.ok) {
      toast.error(result.error)
    } else {
      toast.success(t('orderRejected'))
    }
  }

  const invoiceIds = orderInvoices.map((inv) => inv.id)
  const { data: invoicePayments } = useInvoicePaymentProofs(invoiceIds)

  const markInvoicePaid = useMarkInvoicePaid()

  const handleMarkInvoicePaid = async (invoiceId: string) => {
    const result = await markInvoicePaid.mutateAsync(invoiceId)
    if (result.ok) {
      toast.success(it('invoicePaid'))
    } else {
      toast.error(result.error ?? ct('cancel'))
    }
  }

  const advanceOrderStatus = useAdvanceOrderStatus()

  const handleCompleteOrder = async () => {
    if (!data) return
    const result = await advanceOrderStatus.mutateAsync({ id: data.order.id })
    if (result.ok) {
      toast.success(t('orderCompleted'))
    } else {
      toast.error(result.error)
    }
  }

  if (!data) {
    return (
      <PageContent>
        <p>{t('noOrders')}</p>
      </PageContent>
    )
  }

  const {
    order,
    lineItems,
    customerName,
    customerPhone,
    customerPhotoAssetId,
    customerEmail,
    shippingAddress,
  } = data

  const paidInvoices = orderInvoices.filter((inv) => inv.status === 'paid')
  const invoicedPct = paidInvoices.reduce(
    (sum, inv) => sum + (inv.percentage ?? 0),
    0,
  )
  const invoicedAmt = paidInvoices.reduce((sum, inv) => sum + inv.total, 0)
  const remainingPct = Math.max(0, 100 - invoicedPct)
  const remainingAmt = Math.max(0, order.total - invoicedAmt)

  // Check if a final invoice (100%) has already been generated
  const totalInvoicedPct = orderInvoices
    .filter((inv) => inv.status !== 'void')
    .reduce((sum, inv) => sum + (inv.percentage ?? 0), 0)
  const hasFinalInvoice = totalInvoicedPct >= 100

  // Check if all production tasks are completed
  const allTasksCompleted =
    tasksData?.every((t) => t.task.status === 'completed') ?? true
  const canCompleteProduction =
    order.status === 'in_progress' && allTasksCompleted && !hasFinalInvoice

  // Check if all non-void invoices are paid
  const activeInvoices = orderInvoices.filter((inv) => inv.status !== 'void')
  const allInvoicesPaid =
    activeInvoices.length > 0 &&
    activeInvoices.every((inv) => inv.status === 'paid')
  const canCompleteOrder =
    allInvoicesPaid &&
    order.status !== 'completed' &&
    order.status !== 'cancelled' &&
    order.status !== 'rejected'

  return (
    <PageContent>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {order.orderNumber ?? '—'}
            <StatusBadge status={order.status} />
          </span>
        }
        backAction={{ label: ct('back'), href: '/orders' }}
        primaryAction={
          order.status === 'draft'
            ? {
                label: t('editOrder'),
                href: `/orders/${order.id}/edit`,
              }
            : undefined
        }
      />

      {order.validUntil && order.status === 'draft' && (
        <span className="text-sm text-muted-foreground">
          {t('validUntil')}: {dateFormatter.format(order.validUntil)}
        </span>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCopyPortalLink}
          disabled={generateToken.isPending}
        >
          <Link2 className="size-4" />
          {order.orderToken ? t('copyPortalLink') : t('generateLink')}
        </Button>

        {order.status === 'pending' && (
          <>
            <Button
              type="button"
              size="sm"
              onClick={handleApprove}
              disabled={approveOrder.isPending}
            >
              <CheckCircle2 className="size-4" />
              {t('approve')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRejectDialogOpen(true)}
              disabled={rejectOrder.isPending}
            >
              <XCircle className="size-4" />
              {t('reject')}
            </Button>
          </>
        )}

        {canCompleteProduction && (
          <Button
            type="button"
            size="sm"
            onClick={() => setCompleteProductionModalOpen(true)}
          >
            <Truck className="size-4" />
            {pt('markAsShipped')}
          </Button>
        )}

        {canCompleteOrder && (
          <Button
            type="button"
            size="sm"
            onClick={handleCompleteOrder}
            disabled={advanceOrderStatus.isPending}
          >
            <CheckCircle2 className="size-4" />
            {t('completeOrder')}
          </Button>
        )}
      </div>

      {order.status === 'rejected' && order.rejectReason && (
        <Card className="mb-6 border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <XCircle className="size-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium">{t('rejectReason')}</p>
                <p className="text-sm text-muted-foreground">
                  {order.rejectReason}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('summary')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              {customerPhotoAssetId ? (
                <AssetImage
                  assetId={customerPhotoAssetId}
                  assetKind="image"
                  className="size-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                  <User className="size-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {customerName ?? t('guestCustomer')}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {customerPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="size-3" />
                      {customerPhone}
                    </span>
                  )}
                  {customerEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="size-3" />
                      {customerEmail}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {order.notes && (
              <div>
                <p className="text-sm text-muted-foreground">{t('notes')}</p>
                <p className="whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">{t('total')}</p>
              <p className="text-lg font-semibold">
                {currencyFormatter.format(order.total)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('lineItems')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lineItems.map((item) => (
                <LineItemRow
                  key={item.id}
                  item={item}
                  orgId={ctx.org.id}
                  orderId={order.id}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {isApprovedOrLater && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{it('title')}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInvoiceModalOpen(true)}
                >
                  <Plus className="mr-1 size-4" />
                  {it('createInvoice')}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orderInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {it('noInvoices')}
                </p>
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
                                <Button
                                  variant="outline"
                                  size="icon-sm"
                                  asChild
                                >
                                  <a
                                    href={`/api/documents/invoices/${inv.id}/pdf`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Printer className="size-4" />
                                  </a>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {it('printInvoice')}
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon-sm" asChild>
                                  <Link
                                    to="/invoices/$id"
                                    params={{ id: inv.id }}
                                  >
                                    <Eye className="size-4" />
                                  </Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {it('viewInvoice')}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {canMarkPaid && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleMarkInvoicePaid(inv.id)}
                              disabled={markInvoicePaid.isPending}
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
                              {proofPayments.map((p) =>
                                p.proofAssetId ? (
                                  <a
                                    key={p.id}
                                    href={`/api/assets/${p.proofAssetId}/download`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group relative aspect-square overflow-hidden rounded-lg border"
                                  >
                                    <AssetImage
                                      assetId={p.proofAssetId}
                                      assetKind="image"
                                      className="size-full object-cover transition-opacity group-hover:opacity-80"
                                    />
                                  </a>
                                ) : null,
                              )}
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
        )}
      </div>

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('reject')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('rejectReasonPlaceholder')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-3">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('rejectReasonPlaceholder')}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectDialogOpen(false)}>
              {ct('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectOrder.isPending}
            >
              {t('reject')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateInvoiceModal
        open={invoiceModalOpen}
        onOpenChange={setInvoiceModalOpen}
        order={{
          id: order.id,
          orderNumber: order.orderNumber,
          total: order.total,
          invoicedPercentage: invoicedPct,
          invoicedAmount: invoicedAmt,
          remainingPercentage: remainingPct,
          remainingAmount: remainingAmt,
          customerId: order.customerId,
          customerName,
        }}
      />

      <CompleteProductionModal
        open={completeProductionModalOpen}
        onOpenChange={setCompleteProductionModalOpen}
        order={{
          id: order.id,
          orderNumber: order.orderNumber,
          total: order.total,
          invoicedPercentage: invoicedPct,
          invoicedAmount: invoicedAmt,
          remainingPercentage: remainingPct,
          remainingAmount: remainingAmt,
          customerId: order.customerId,
          customerName,
          shippingAddress,
        }}
      />
    </PageContent>
  )
}

function LineItemRow({
  item,
  orgId,
  orderId,
}: {
  item: {
    id: string
    productId: string
    name: string | null
    notes: string | null
    quantity: number
    unitPrice: number
    total: number
  }
  orgId: string
  orderId: string
}) {
  const { data: assets } = useQuery({
    queryKey: ['order-assets', item.id],
    queryFn: () =>
      getAssetsForLineItemFn({ data: { lineItemId: item.id, orgId } }),
  })
  const t = useTranslations('production')
  const task = useTaskByLineItemId(item.id, orderId)

  console.log({ task })

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-medium">{item.name || item.productId}</p>
          <p className="text-sm text-muted-foreground">
            {item.quantity} × {currencyFormatter.format(item.unitPrice)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className="font-medium">{currencyFormatter.format(item.total)}</p>
          {task && (
            <Badge variant="secondary" className="text-xs">
              {task.stage?.name ??
                t(
                  task.task.status === 'queued'
                    ? 'statusQueued'
                    : task.task.status === 'completed'
                      ? 'statusCompleted'
                      : 'statusInProgress',
                )}
            </Badge>
          )}
        </div>
      </div>
      {item.notes && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {item.notes}
        </p>
      )}
      {assets && assets.length > 0 && (
        <div className="flex gap-2 mt-2">
          {assets.map((asset: { id: string }) => (
            <AssetImage
              key={asset.id}
              assetId={asset.id}
              assetKind="image"
              className="size-16 rounded object-cover"
            />
          ))}
        </div>
      )}
    </div>
  )
}
