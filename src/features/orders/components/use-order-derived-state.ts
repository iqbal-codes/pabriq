import type { InvoiceRow } from '#/features/invoices/model'
import type { GetOrderResult } from '#/features/orders/model'

type OrderTaskSummary = { task: { status: string } }

const APPROVED_STATUSES = new Set([
  'approved',
  'in_progress',
  'production',
  'in_delivery',
  'completed',
])

export type OrderDerivedState = {
  isApprovedOrLater: boolean
  canCreateInvoice: boolean
  invoicedPct: number
  invoicedAmt: number
  remainingPct: number
  remainingAmt: number
  canCompleteProduction: boolean
  canCompleteOrder: boolean
}

export function useOrderDerivedState(params: {
  data: GetOrderResult | null | undefined
  orderInvoices: InvoiceRow[]
  tasksData: OrderTaskSummary[] | undefined
}): OrderDerivedState {
  const { data, orderInvoices, tasksData } = params

  const orderStatus = data?.order.status

  const isApprovedOrLater = orderStatus
    ? APPROVED_STATUSES.has(orderStatus)
    : false

  const paidInvoices = orderInvoices.filter((inv) => inv.status === 'paid')
  const invoicedPct = paidInvoices.reduce(
    (sum, inv) => sum + (inv.percentage ?? 0),
    0,
  )
  const invoicedAmt = paidInvoices.reduce((sum, inv) => sum + inv.total, 0)
  const remainingPct = Math.max(0, 100 - invoicedPct)
  const remainingAmt = data ? Math.max(0, data.order.total - invoicedAmt) : 0

  // Check if a final invoice (100%) has already been generated
  const totalInvoicedPct = orderInvoices
    .filter((inv) => inv.status !== 'void')
    .reduce((sum, inv) => sum + (inv.percentage ?? 0), 0)
  const hasFinalInvoice = totalInvoicedPct >= 100

  // Check if all production tasks are completed
  const allTasksCompleted =
    tasksData?.every((t) => t.task.status === 'completed') ?? true
  const canCompleteProduction =
    orderStatus === 'in_progress' && allTasksCompleted && !hasFinalInvoice

  // Check if all non-void invoices are paid
  const activeInvoices = orderInvoices.filter((inv) => inv.status !== 'void')
  const allInvoicesPaid =
    activeInvoices.length > 0 &&
    activeInvoices.every((inv) => inv.status === 'paid')
  const isTerminalOrder =
    orderStatus === 'completed' ||
    orderStatus === 'cancelled' ||
    orderStatus === 'rejected'
  const canCompleteOrder = allInvoicesPaid && !isTerminalOrder
  // Allow creating invoices only while the order is active and there is
  // remaining percentage left to invoice.
  const canCreateInvoice =
    isApprovedOrLater && !isTerminalOrder && remainingPct > 0

  return {
    isApprovedOrLater,
    canCreateInvoice,
    invoicedPct,
    invoicedAmt,
    remainingPct,
    remainingAmt,
    canCompleteProduction,
    canCompleteOrder,
  }
}
