import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouteContext } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'

import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { StatusBadge } from '#/components/status-badge'
import { Button } from '#/components/ui/button'
import { CreateInvoiceModal } from '#/features/invoices/components/create-invoice-modal'
import {
  useInvoicePaymentProofs,
  useInvoicesList,
  useMarkInvoicePaid,
} from '#/features/invoices/hooks'
import { CompleteProductionModal } from '#/features/orders/components/complete-production-modal'
import { OrderActionBar } from '#/features/orders/components/order-action-bar'
import { OrderInvoicesCard } from '#/features/orders/components/order-invoices-card'
import { OrderLineItemsCard } from '#/features/orders/components/order-line-items-card'
import { OrderSummaryCard } from '#/features/orders/components/order-summary-card'
import { RejectReasonDialog } from '#/features/orders/components/reject-reason-dialog'
import { dateFormatter } from '#/features/orders/components/view-order-utils'
import { useAdvanceOrderStatus, useOrder } from '#/features/orders/hooks'
import { generateOrderTokenFn } from '#/features/portal/server'
import { useTasksByOrderId } from '#/features/production/hooks'

export function ViewOrderPage() {
  const { id } = useParams({ from: '/_org/orders/$id/' })
  const ctx = useRouteContext({ from: '/_org/orders/$id/' }) as {
    org: { id: string }
  }
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
  const it = useTranslations('invoices')

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

      <OrderActionBar
        order={order}
        onCopyPortalLink={handleCopyPortalLink}
        isGeneratingLink={generateToken.isPending}
        onApprove={handleApprove}
        isApproving={approveOrder.isPending}
        onReject={() => setRejectDialogOpen(true)}
        isRejecting={rejectOrder.isPending}
        onCompleteProduction={() => setCompleteProductionModalOpen(true)}
        onCompleteOrder={handleCompleteOrder}
        isCompletingOrder={advanceOrderStatus.isPending}
        canCompleteProduction={canCompleteProduction}
        canCompleteOrder={canCompleteOrder}
      />

      {order.status === 'rejected' && order.rejectReason && (
        <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <div className="size-5 text-destructive mt-0.5">✕</div>
            <div>
              <p className="font-medium">{t('rejectReason')}</p>
              <p className="text-sm text-muted-foreground">
                {order.rejectReason}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        <OrderSummaryCard
          customerName={customerName}
          customerPhone={customerPhone}
          customerEmail={customerEmail}
          customerPhotoAssetId={customerPhotoAssetId}
          orderNotes={order.notes}
          orderTotal={order.total}
        />

        <OrderLineItemsCard
          lineItems={lineItems}
          orgId={ctx.org.id}
          orderId={order.id}
        />

        {isApprovedOrLater && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{it('title')}</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInvoiceModalOpen(true)}
              >
                <span className="mr-1">+</span>
                {it('createInvoice')}
              </Button>
            </div>
            <OrderInvoicesCard
              orderInvoices={orderInvoices}
              invoicePayments={invoicePayments ?? {}}
              onMarkInvoicePaid={handleMarkInvoicePaid}
              isMarkingPaid={markInvoicePaid.isPending}
            />
          </div>
        )}
      </div>

      <RejectReasonDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        onReject={handleReject}
        isRejecting={rejectOrder.isPending}
      />

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
