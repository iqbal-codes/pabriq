import { Link, useParams, useRouteContext } from '@tanstack/react-router'
import {
  CheckCircle2,
  Copy,
  Factory,
  FileText,
  Link2,
  Printer,
  Settings2,
  Truck,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { AvatarPhoto } from '#/components/app/avatar-photo'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import type { PageAction } from '#/components/app/page-shell/page-shell-types'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { CreateInvoiceModal } from '#/features/invoices/components/create-invoice-modal'
import {
  useInvoicePaymentProofs,
  useInvoicesList,
  usePaymentMethods,
} from '#/features/invoices/hooks'
import { CompleteProductionModal } from '#/features/orders/components/complete-production-modal'
import { OrderInvoicesSection } from '#/features/orders/components/order-invoices-section'
import { OrderLineItemsCard } from '#/features/orders/components/order-line-items-card'
import { OrderStatusBadge } from '#/features/orders/components/order-status-badge'
import { RejectReasonDialog } from '#/features/orders/components/reject-reason-dialog'
import { OrderHistoryCard } from '#/features/orders/components/order-history-card'
import { RejectedReasonBanner } from '#/features/orders/components/rejected-reason-banner'
import { useOrderDerivedState } from '#/features/orders/components/use-order-derived-state'
import { useOrderMutations } from '#/features/orders/components/use-order-mutations'
import {
  currencyFormatter,
  dateFormatter,
} from '#/features/orders/components/view-order-utils'
import { useOrder } from '#/features/orders/hooks'
import { useTasksByOrderId } from '#/features/production/hooks'
import { OrderQuantityAdjustmentModal } from '#/features/orders/components/order-quantity-adjustment-modal'
import {
  canAdjustConfirmedOrder,
  type Role,
} from '#/features/permissions/model'
import { useProductsList } from '#/features/products/hooks'

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

export function ViewOrderPage() {
  const { id } = useParams({ from: '/_org/orders/$id/' })
  const ctx = useRouteContext({ from: '/_org/orders/$id/' }) as {
    org: { id: string; role: Role }
  }
  const { data } = useOrder({ id, orgId: ctx.org.id })
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [completeProductionModalOpen, setCompleteProductionModalOpen] =
    useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [adjustQuantityOpen, setAdjustQuantityOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const t = useTranslations('orders')
  const ct = useTranslations('common')
  const st = useTranslations('status')
  const pt = useTranslations('portal')
  const prt = useTranslations('production')

  const { data: invoicesData } = useInvoicesList({
    orgId: ctx.org.id,
    orderId: id,
    page: 1,
    perPage: 50,
  })
  const { data: tasksData } = useTasksByOrderId(id)
  const { data: paymentMethods } = usePaymentMethods()
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

  // ── Payment state for DP flow ─────────────────────────────────
  const unpaidInvoice = orderInvoices.find(
    (inv) => inv.status === 'unpaid' || inv.status === 'partially_paid',
  )
  const unpaidPaymentMethod = unpaidInvoice?.paymentMethodId
    ? (paymentMethods?.find((pm) => pm.id === unpaidInvoice.paymentMethodId) ??
      null)
    : null
  const isManualTransfer =
    unpaidPaymentMethod?.type === 'bank_transfer' ||
    unpaidPaymentMethod?.type === 'cash' ||
    !unpaidPaymentMethod

  // ── Header actions ────────────────────────────────────────────

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
                onClick: () =>
                  mutations.handleMarkInvoicePaid(unpaidInvoice.id),
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
  // Check for paid final invoice: newest non-void after at least one paid non-void
  const nonVoidInvoices = orderInvoices.filter((inv) => inv.status !== 'void')
  const hasPaidInvoice = nonVoidInvoices.some((inv) => inv.status === 'paid')
  const sortedByCreatedAt = [...nonVoidInvoices].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  const hasPaidFinalInvoice =
    hasPaidInvoice && sortedByCreatedAt[0]?.status === 'paid'

  if (
    canAdjustConfirmedOrder(ctx.org.role) &&
    ['approved', 'in_progress', 'production'].includes(order.status) &&
    !hasPaidFinalInvoice
  ) {
    secondaryActions.push({
      label: t('adjustQuantity'),
      icon: Settings2,
      onClick: () => setAdjustQuantityOpen(true),
    })
  }

  return (
    <PageContent>
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
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left Pane */}
        <div className="lg:col-span-2 space-y-6">
          <RejectedReasonBanner reason={order.rejectReason ?? null} />

          <OrderLineItemsCard
            lineItems={lineItems}
            orgId={ctx.org.id}
            orderId={order.id}
          />

          {derived.isApprovedOrLater && (
            <OrderInvoicesSection
              orderInvoices={orderInvoices}
              invoicePayments={invoicePayments ?? {}}
            />
          )}
        </div>

        {/* Right Pane */}
        <div className="lg:col-span-1 space-y-6">
          {/* Order Details Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('summary')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Total Amount */}
              <div>
                <p className="text-sm text-muted-foreground">{t('total')}</p>
                <p className="text-2xl font-bold font-mono">
                  {currencyFormatter.format(order.total)}
                </p>
              </div>

              {/* Invoiced / Remaining */}
              {derived.isApprovedOrLater && (
                <div className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-muted-foreground">
                      {t('paymentPaid')}
                    </p>
                    <div className="text-right">
                      <p className="font-mono text-sm">
                        {currencyFormatter.format(derived.invoicedAmt)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {derived.invoicedPct}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-muted-foreground">
                      {t('paymentUnpaid')}
                    </p>
                    <div className="text-right">
                      <p className="font-mono text-sm">
                        {currencyFormatter.format(derived.remainingAmt)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {derived.remainingPct}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t('createdAt')}
                  </p>
                  <p className="text-sm">
                    {dateFormatter.format(order.createdAt)}
                  </p>
                </div>
                {order.validUntil && order.status === 'draft' && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t('validUntil')}
                    </p>
                    <p className="text-sm">
                      {dateFormatter.format(order.validUntil)}
                    </p>
                  </div>
                )}
                {order.approvedAt && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {st('approved')}
                    </p>
                    <p className="text-sm">
                      {dateFormatter.format(order.approvedAt)}
                    </p>
                  </div>
                )}
                {order.shippedAt && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {st('in_delivery')}
                    </p>
                    <p className="text-sm">
                      {dateFormatter.format(order.shippedAt)}
                    </p>
                  </div>
                )}
                {order.deliveredAt && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {st('completed')}
                    </p>
                    <p className="text-sm">
                      {dateFormatter.format(order.deliveredAt)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <OrderHistoryCard orderId={order.id} />

          {/* Customer Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('customer')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3 mb-4">
                <AvatarPhoto
                  assetId={customerPhotoAssetId}
                  name={customerName ?? t('guestCustomer')}
                  className="size-10"
                />
                <div className="min-w-0 flex-1">
                  {order.customerId ? (
                    <Link
                      to="/customers/$id"
                      params={{ id: order.customerId }}
                      className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                      {customerName ?? t('guestCustomer')}
                    </Link>
                  ) : (
                    <p className="font-medium">
                      {customerName ?? t('guestCustomer')}
                    </p>
                  )}
                  <div className="flex flex-col">
                    {customerPhone && (
                      <a
                        href={`https://wa.me/${customerPhone.replace(/^0/, '62')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        {customerPhone}
                      </a>
                    )}
                    {customerEmail && (
                      <a
                        href={`mailto:${customerEmail}`}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        {customerEmail}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              {shippingAddress && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    {pt('shippingAddress')}
                  </p>
                  <p className="text-sm">{shippingAddress.streetAddress}</p>
                  <p className="text-sm text-muted-foreground">
                    {shippingAddress.areaName}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shipping Detail Card */}
          {(order.courier || order.trackingNumber || shippingFee > 0) && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Truck className="size-4" />
                  <CardTitle>{t('shippingDetail')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.courier && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {prt('courier')}
                    </p>
                    <p className="font-medium">{order.courier}</p>
                  </div>
                )}
                {order.trackingNumber && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {prt('trackingNumber')}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono">{order.trackingNumber}</p>
                      <CopyButton text={order.trackingNumber} />
                    </div>
                  </div>
                )}
                {shippingFee > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {prt('shipmentFee')}
                    </p>
                    <p className="font-medium font-mono">
                      {currencyFormatter.format(shippingFee)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes Card */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>{t('notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
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
          shippingAddress,
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

      <OrderQuantityAdjustmentModal
        open={adjustQuantityOpen}
        onOpenChange={setAdjustQuantityOpen}
        orderId={order.id}
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
          setAdjustQuantityOpen(false)
        }}
      />
    </PageContent>
  )
}
