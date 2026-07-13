import { useParams, useRouteContext } from '@tanstack/react-router'
import {
  CheckCircle2,
  Factory,
  FileText,
  Link2,
  Printer,
  Truck,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import type { PageAction } from '#/components/app/page-shell/page-shell-types'
import type { ShippingAddress } from '#/features/address/model'
import { CreateInvoiceModal } from '#/features/invoices/components/create-invoice-modal'
import { ManualPaymentConfirmationDialog } from '#/features/invoices/components/manual-payment-confirmation-dialog'
import type {
  InvoicePaymentProof,
  InvoiceRow,
} from '#/features/invoices/model'
import {
  useInvoicePaymentProofs,
  useInvoicesList,
} from '#/features/invoices/hooks'
import { CompleteProductionModal } from '#/features/orders/components/complete-production-modal'
import { OrderDetailSection } from '#/features/orders/components/order-detail-section'
import { OrderInvoicesSection } from '#/features/orders/components/order-invoices-section'
import { OrderLineItemsCard } from '#/features/orders/components/order-line-items-card'
import { OrderQuantityAdjustmentModal } from '#/features/orders/components/order-quantity-adjustment-modal'
import { OrderStatusBadge } from '#/features/orders/components/order-status-badge'
import { RejectReasonDialog } from '#/features/orders/components/reject-reason-dialog'
import { RejectedReasonBanner } from '#/features/orders/components/rejected-reason-banner'
import type { OrderDerivedState } from '#/features/orders/components/use-order-derived-state'
import { useOrderDerivedState } from '#/features/orders/components/use-order-derived-state'
import type { OrderMutations } from '#/features/orders/components/use-order-mutations'
import { useOrderMutations } from '#/features/orders/components/use-order-mutations'
import {
  currencyFormatter,
  dateFormatter,
} from '#/features/orders/components/view-order-utils'
import type { Order, OrderLineItem } from '#/features/orders/model'
import { useOrder, useOrderAdminTimeline } from '#/features/orders/hooks'
import {
  canAdjustConfirmedOrder,
  type Role,
} from '#/features/permissions/model'
import { OrderFlowTimeline } from '#/features/portal/components/order-flow-timeline'
import { useTasksByOrderId } from '#/features/production/hooks'
import type { ProductRow } from '#/features/products/model'
import { useProductsList } from '#/features/products/hooks'

// ── buildOrderActions ───────────────────────────────────────────

type BuildOrderActionsParams = {
  order: Order
  derived: OrderDerivedState
  mutations: OrderMutations
  unpaidInvoice: InvoiceRow | undefined
  isManualTransfer: boolean
  orderInvoices: InvoiceRow[]
  // ReturnType required — use-intl's Translator is generic and not re-exported as a named type.
  t: ReturnType<typeof useTranslations<'orders'>>
  prt: ReturnType<typeof useTranslations<'production'>>
  setInvoiceModalOpen: (open: boolean) => void
  setRejectDialogOpen: (open: boolean) => void
  setPaymentConfirmationOpen: (open: boolean) => void
  setCompleteProductionModalOpen: (open: boolean) => void
}

function buildOrderActions({
  order,
  derived,
  mutations,
  unpaidInvoice,
  isManualTransfer,
  orderInvoices,
  t,
  prt,
  setInvoiceModalOpen,
  setRejectDialogOpen,
  setPaymentConfirmationOpen,
  setCompleteProductionModalOpen,
}: BuildOrderActionsParams): {
  primaryAction: PageAction | undefined
  secondaryActions: PageAction[]
} {
  const primaryAction: PageAction | undefined =
    order.status === 'draft'
      ? { label: t('editOrder'), href: `/orders/${order.id}/edit` }
      : order.status === 'pending'
        ? {
            label: t('approve'),
            icon: CheckCircle2,
            onClick: mutations.handleApprove,
            isLoading: mutations.isApproving,
          }
        : derived.canSendDpInvoice
          ? {
              label: t('sendDpInvoice'),
              icon: FileText,
              onClick: () => setInvoiceModalOpen(true),
            }
          : unpaidInvoice && isManualTransfer
            ? {
                label: orderInvoices.some((inv) => inv.status === 'paid')
                  ? t('confirmSettlementPayment')
                  : t('confirmDpPayment'),
                icon: CheckCircle2,
                onClick: () => setPaymentConfirmationOpen(true),
                isLoading: mutations.isMarkingPaid,
              }
            : derived.canStartProduction
              ? {
                  label: prt('startOrderProduction'),
                  icon: Factory,
                  onClick: mutations.handleStartProduction,
                  isLoading: mutations.isStartingProduction,
                }
              : derived.canSendSettlementInvoice
                ? {
                    label: t('sendSettlementInvoice'),
                    icon: FileText,
                    onClick: () => setInvoiceModalOpen(true),
                  }
                : derived.canCompleteProduction
                  ? {
                      label: prt('markAsShipped'),
                      icon: Truck,
                      onClick: () => setCompleteProductionModalOpen(true),
                    }
                  : derived.canCompleteOrder
                    ? {
                        label: t('completeOrder'),
                        icon: CheckCircle2,
                        onClick: mutations.handleCompleteOrder,
                        isLoading: mutations.isCompletingOrder,
                      }
                    : undefined

  const secondaryActions: PageAction[] = [
    {
      label: order.orderToken ? t('copyPortalLink') : t('generateLink'),
      icon: Link2,
      onClick: mutations.handleCopyPortalLink,
      isLoading: mutations.isGeneratingLink,
    },
  ]

  if (order.status !== 'draft') {
    secondaryActions.push({
      label: t('downloadQuotation'),
      icon: Printer,
      href: `/api/documents/orders/${order.id}/quotation`,
    })
  }

  if (order.status === 'pending') {
    secondaryActions.push({
      label: t('reject'),
      icon: XCircle,
      onClick: () => setRejectDialogOpen(true),
    })
  }

  return { primaryAction, secondaryActions }
}

// ── OrderModals ─────────────────────────────────────────────────

type OrderModalsProps = {
  order: Order
  derived: OrderDerivedState
  customerName: string | null
  shippingAddress: ShippingAddress | null
  mutations: OrderMutations
  rejectDialogOpen: boolean
  setRejectDialogOpen: (open: boolean) => void
  rejectReason: string
  setRejectReason: (reason: string) => void
  invoiceModalOpen: boolean
  setInvoiceModalOpen: (open: boolean) => void
  paymentConfirmationOpen: boolean
  setPaymentConfirmationOpen: (open: boolean) => void
  completeProductionModalOpen: boolean
  setCompleteProductionModalOpen: (open: boolean) => void
  adjustingLineItemId: string | null
  setAdjustingLineItemId: (id: string | null) => void
  unpaidInvoice: InvoiceRow | undefined
  isManualTransfer: boolean
  invoicePayments: Record<string, InvoicePaymentProof[]>
  lineItems: OrderLineItem[]
  products: ProductRow[]
}

function OrderModals({
  order,
  derived,
  customerName,
  shippingAddress,
  mutations,
  rejectDialogOpen,
  setRejectDialogOpen,
  rejectReason,
  setRejectReason,
  invoiceModalOpen,
  setInvoiceModalOpen,
  paymentConfirmationOpen,
  setPaymentConfirmationOpen,
  completeProductionModalOpen,
  setCompleteProductionModalOpen,
  adjustingLineItemId,
  setAdjustingLineItemId,
  unpaidInvoice,
  isManualTransfer,
  invoicePayments,
  lineItems,
  products,
}: OrderModalsProps) {
  return (
    <>
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
          shippingAddress,
        }}
      />

      {unpaidInvoice && isManualTransfer && (
        <ManualPaymentConfirmationDialog
          open={paymentConfirmationOpen}
          onOpenChange={setPaymentConfirmationOpen}
          invoice={unpaidInvoice}
          paymentProofs={invoicePayments[unpaidInvoice.id] ?? []}
          onConfirm={() => mutations.handleMarkInvoicePaid(unpaidInvoice.id)}
          isConfirming={mutations.isMarkingPaid}
        />
      )}

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

      {adjustingLineItemId && (
        <OrderQuantityAdjustmentModal
          key={adjustingLineItemId}
          open={adjustingLineItemId !== null}
          onOpenChange={(open) => {
            if (!open) setAdjustingLineItemId(null)
          }}
          orderId={order.id}
          selectedLineItemId={adjustingLineItemId}
          lineItems={lineItems.map((li) => ({
            id: li.id,
            productId: li.productId,
            productName: li.productName,
            designName: li.designName,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            total: li.total,
            isRepeatOrder: li.isRepeatOrder,
          }))}
          products={products}
          onSuccess={() => {
            setAdjustingLineItemId(null)
          }}
        />
      )}
    </>
  )
}

// ── ViewOrderPage ───────────────────────────────────────────────

export function ViewOrderPage() {
  const { id } = useParams({ from: '/_org/orders/$id/' })
  const ctx = useRouteContext({ from: '/_org/orders/$id/' }) as {
    org: { id: string; role: Role }
  }
  const { data } = useOrder({ id, orgId: ctx.org.id })
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [paymentConfirmationOpen, setPaymentConfirmationOpen] = useState(false)
  const [completeProductionModalOpen, setCompleteProductionModalOpen] =
    useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [adjustingLineItemId, setAdjustingLineItemId] = useState<string | null>(
    null,
  )
  const t = useTranslations('orders')
  const ct = useTranslations('common')
  const prt = useTranslations('production')

  const { data: invoicesData } = useInvoicesList({
    orgId: ctx.org.id,
    orderId: id,
    page: 1,
    perPage: 50,
  })
  const { data: tasksData } = useTasksByOrderId(id)
  const { data: productsData } = useProductsList({
    orgId: ctx.org.id,
    perPage: 200,
  })
  const products = productsData?.rows ?? []
  const orderInvoices = invoicesData?.rows ?? []
  const shippingFee = orderInvoices
    .filter((invoice) => invoice.status !== 'void')
    .reduce((sum, invoice) => sum + (invoice.shippingFee ?? 0), 0)

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

  const { data: timelineEvents = [] } = useOrderAdminTimeline(id, ctx.org.id)

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

  const validUntilDescription =
    order.validUntil && order.status === 'draft'
      ? `${t('validUntil')}: ${dateFormatter.format(order.validUntil)}`
      : undefined

  const unpaidInvoice = orderInvoices.find(
    (inv) => inv.status === 'unpaid' || inv.status === 'partially_paid',
  )
  const isManualTransfer = unpaidInvoice?.paymentProvider !== 'midtrans'

  const { primaryAction, secondaryActions } = buildOrderActions({
    order,
    derived,
    mutations,
    unpaidInvoice,
    isManualTransfer,
    orderInvoices,
    t,
    prt,
    setInvoiceModalOpen,
    setRejectDialogOpen,
    setPaymentConfirmationOpen,
    setCompleteProductionModalOpen,
  })

  const nonVoidInvoices = orderInvoices.filter((inv) => inv.status !== 'void')
  const hasPaidInvoice = nonVoidInvoices.some((inv) => inv.status === 'paid')
  const sortedByCreatedAt = [...nonVoidInvoices].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  const hasPaidFinalInvoice =
    hasPaidInvoice && sortedByCreatedAt[0]?.status === 'paid'

  const canAdjust =
    canAdjustConfirmedOrder(ctx.org.role) &&
    ['approved', 'in_progress', 'production'].includes(order.status) &&
    !hasPaidFinalInvoice

  return (
    <PageContent className="max-w-3xl">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {order.orderNumber ?? '—'}
            <OrderStatusBadge status={order.status} />
          </span>
        }
        description={validUntilDescription}
        backAction={{ label: ct('back'), href: '/orders' }}
        primaryAction={primaryAction}
        secondaryActions={secondaryActions}
        mobileVisible
      />

      <div className="max-w-3xl space-y-6">
        <RejectedReasonBanner reason={order.rejectReason ?? null} />
        <OrderDetailSection
          order={order}
          customerName={customerName}
          customerPhone={customerPhone}
          customerEmail={customerEmail}
          customerPhotoAssetId={customerPhotoAssetId}
          shippingAddress={shippingAddress}
          shippingFee={shippingFee}
          invoicedAmt={derived.invoicedAmt}
          remainingAmt={derived.remainingAmt}
          invoicedPct={derived.invoicedPct}
          remainingPct={derived.remainingPct}
          isApprovedOrLater={derived.isApprovedOrLater}
          currencyFormatter={currencyFormatter}
          dateFormatter={dateFormatter}
        />
        <OrderFlowTimeline events={timelineEvents} />
        {derived.isApprovedOrLater && (
          <OrderInvoicesSection
            orderInvoices={orderInvoices}
            invoicePayments={invoicePayments ?? {}}
          />
        )}
        <OrderLineItemsCard
          lineItems={lineItems}
          orgId={ctx.org.id}
          orderId={order.id}
          onAdjustQuantity={canAdjust ? setAdjustingLineItemId : undefined}
        />
      </div>

      <OrderModals
        order={order}
        derived={derived}
        customerName={customerName}
        shippingAddress={shippingAddress}
        mutations={mutations}
        rejectDialogOpen={rejectDialogOpen}
        setRejectDialogOpen={setRejectDialogOpen}
        rejectReason={rejectReason}
        setRejectReason={setRejectReason}
        invoiceModalOpen={invoiceModalOpen}
        setInvoiceModalOpen={setInvoiceModalOpen}
        paymentConfirmationOpen={paymentConfirmationOpen}
        setPaymentConfirmationOpen={setPaymentConfirmationOpen}
        completeProductionModalOpen={completeProductionModalOpen}
        setCompleteProductionModalOpen={setCompleteProductionModalOpen}
        adjustingLineItemId={adjustingLineItemId}
        setAdjustingLineItemId={setAdjustingLineItemId}
        unpaidInvoice={unpaidInvoice}
        isManualTransfer={isManualTransfer}
        invoicePayments={invoicePayments ?? {}}
        lineItems={lineItems}
        products={products}
      />
    </PageContent>
  )
}
