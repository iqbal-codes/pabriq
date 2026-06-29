import { useParams, useRouteContext } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslations } from 'use-intl'

import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { StatusBadge } from '#/components/status-badge'
import { CreateInvoiceModal } from '#/features/invoices/components/create-invoice-modal'
import {
  useInvoicePaymentProofs,
  useInvoicesList,
} from '#/features/invoices/hooks'
import { CompleteProductionModal } from '#/features/orders/components/complete-production-modal'
import { OrderActionBar } from '#/features/orders/components/order-action-bar'
import { OrderInvoicesSection } from '#/features/orders/components/order-invoices-section'
import { OrderLineItemsCard } from '#/features/orders/components/order-line-items-card'
import { OrderSummaryCard } from '#/features/orders/components/order-summary-card'
import { RejectReasonDialog } from '#/features/orders/components/reject-reason-dialog'
import { RejectedReasonBanner } from '#/features/orders/components/rejected-reason-banner'
import { useOrderDerivedState } from '#/features/orders/components/use-order-derived-state'
import { useOrderMutations } from '#/features/orders/components/use-order-mutations'
import { dateFormatter } from '#/features/orders/components/view-order-utils'
import { useOrder } from '#/features/orders/hooks'
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
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const t = useTranslations('orders')
  const ct = useTranslations('common')

  const { data: invoicesData } = useInvoicesList({
    orgId: ctx.org.id,
    orderId: id,
    page: 1,
    perPage: 50,
  })
  const { data: tasksData } = useTasksByOrderId(id)
  const orderInvoices = invoicesData?.rows ?? []

  const derived = useOrderDerivedState({
    data,
    orderInvoices,
    tasksData,
  })

  const mutations = useOrderMutations({
    data,
    rejectReason,
    onRejectSuccess: () => {
      setRejectDialogOpen(false)
      setRejectReason('')
    },
  })

  const invoiceIds = orderInvoices.map((inv) => inv.id)
  const { data: invoicePayments } = useInvoicePaymentProofs(invoiceIds)

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
        onCopyPortalLink={mutations.handleCopyPortalLink}
        isGeneratingLink={mutations.isGeneratingLink}
        onApprove={mutations.handleApprove}
        isApproving={mutations.isApproving}
        onReject={() => setRejectDialogOpen(true)}
        isRejecting={mutations.isRejecting}
        onCompleteProduction={() => setCompleteProductionModalOpen(true)}
        onCompleteOrder={mutations.handleCompleteOrder}
        isCompletingOrder={mutations.isCompletingOrder}
        canCompleteProduction={derived.canCompleteProduction}
        canCompleteOrder={derived.canCompleteOrder}
      />

      <RejectedReasonBanner reason={order.rejectReason ?? null} />

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

        {derived.isApprovedOrLater && (
          <OrderInvoicesSection
            orderInvoices={orderInvoices}
            invoicePayments={invoicePayments ?? {}}
            onCreateInvoice={() => setInvoiceModalOpen(true)}
            onMarkInvoicePaid={mutations.handleMarkInvoicePaid}
            isMarkingPaid={mutations.isMarkingPaid}
          />
        )}
      </div>

      <RejectReasonDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        onReject={mutations.handleReject}
        isRejecting={mutations.isRejecting}
      />

      <CreateInvoiceModal
        open={invoiceModalOpen}
        onOpenChange={setInvoiceModalOpen}
        order={{
          id: order.id,
          orderNumber: order.orderNumber,
          total: order.total,
          invoicedPercentage: derived.invoicedPct,
          invoicedAmount: derived.invoicedAmt,
          remainingPercentage: derived.remainingPct,
          remainingAmount: derived.remainingAmt,
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
          invoicedPercentage: derived.invoicedPct,
          invoicedAmount: derived.invoicedAmt,
          remainingPercentage: derived.remainingPct,
          remainingAmount: derived.remainingAmt,
          customerId: order.customerId,
          customerName,
          shippingAddress,
        }}
      />
    </PageContent>
  )
}
