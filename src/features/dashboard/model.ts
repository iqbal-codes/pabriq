import { and, count, desc, eq, gte, lte, ne } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  customers,
  invoices,
  orders,
  productionStages,
  productionTasks,
} from '#/db/schema'

export type MetricTrend = {
  current: number
  previous: number
  changePercent: number | null
}

export type DashboardMetrics = {
  totalRevenue: number
  totalOrders: number
  overdueInvoices: number
  pendingApprovals: number
  revenueTrend: MetricTrend
  ordersTrend: MetricTrend
}

export type RevenuePoint = {
  date: string
  revenue: number
}

export type RecentOrder = {
  id: string
  orderNumber: string | null
  status: string
  total: number
  customerName: string | null
  createdAt: Date
}

export type TaskStageCount = {
  id: string
  name: string
  board: 'pre_production' | 'production'
  count: number
}

export type Period = '7d' | '30d' | 'thisMonth' | 'lastMonth'

function getPeriodDates(period: Period): { start: Date; end: Date } {
  const now = new Date()
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  )
  let start: Date

  switch (period) {
    case '7d': {
      start = new Date(end)
      start.setDate(start.getDate() - 6)
      start.setHours(0, 0, 0, 0)
      break
    }
    case '30d': {
      start = new Date(end)
      start.setDate(start.getDate() - 29)
      start.setHours(0, 0, 0, 0)
      break
    }
    case 'lastMonth': {
      const lastMonthStart = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
        0,
        0,
        0,
        0,
      )
      const lastMonthEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999,
      )
      return { start: lastMonthStart, end: lastMonthEnd }
    }
    default: {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      break
    }
  }

  return { start, end }
}

function getPreviousPeriodDates(period: Period): { start: Date; end: Date } {
  const { start, end } = getPeriodDates(period)

  if (period === '7d' || period === '30d') {
    const span = end.getTime() - start.getTime()
    const previousEnd = new Date(start.getTime() - 1)
    const previousStart = new Date(previousEnd.getTime() - span)
    previousStart.setHours(0, 0, 0, 0)
    return { start: previousStart, end: previousEnd }
  }

  const previousMonthStart = new Date(
    start.getFullYear(),
    start.getMonth() - 1,
    1,
    0,
    0,
    0,
    0,
  )
  const previousMonthEnd = new Date(
    start.getFullYear(),
    start.getMonth(),
    0,
    23,
    59,
    59,
    999,
  )

  return { start: previousMonthStart, end: previousMonthEnd }
}

function getChangePercent(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null
  }

  return ((current - previous) / previous) * 100
}

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

function createRevenueBuckets(start: Date, end: Date): Map<string, number> {
  const buckets = new Map<string, number>()
  const cursor = new Date(start)

  while (cursor <= end) {
    buckets.set(formatDateKey(cursor), 0)
    cursor.setDate(cursor.getDate() + 1)
  }

  return buckets
}

export async function getDashboardMetrics(
  orgId: string,
  period: Period = 'thisMonth',
): Promise<DashboardMetrics> {
  const { start, end } = getPeriodDates(period)
  const previousPeriod = getPreviousPeriodDates(period)
  const today = formatDateKey(new Date())

  const [
    currentRevenueRows,
    previousRevenueRows,
    currentOrdersResult,
    previousOrdersResult,
    overdueInvoicesResult,
    pendingApprovalsResult,
  ] = await Promise.all([
    db
      .select({ total: orders.total })
      .from(orders)
      .where(
        and(
          eq(orders.orgId, orgId),
          eq(orders.status, 'completed'),
          gte(orders.createdAt, start),
          lte(orders.createdAt, end),
        ),
      ),
    db
      .select({ total: orders.total })
      .from(orders)
      .where(
        and(
          eq(orders.orgId, orgId),
          eq(orders.status, 'completed'),
          gte(orders.createdAt, previousPeriod.start),
          lte(orders.createdAt, previousPeriod.end),
        ),
      ),
    db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          eq(orders.orgId, orgId),
          gte(orders.createdAt, start),
          lte(orders.createdAt, end),
        ),
      ),
    db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          eq(orders.orgId, orgId),
          gte(orders.createdAt, previousPeriod.start),
          lte(orders.createdAt, previousPeriod.end),
        ),
      ),
    db
      .select({ count: count() })
      .from(invoices)
      .where(
        and(
          eq(invoices.orgId, orgId),
          eq(invoices.status, 'unpaid'),
          lte(invoices.dueDate, today),
        ),
      ),
    db
      .select({ count: count() })
      .from(orders)
      .where(and(eq(orders.orgId, orgId), eq(orders.status, 'pending'))),
  ])

  const totalRevenue = currentRevenueRows.reduce(
    (sum, row) => sum + Number(row.total ?? 0),
    0,
  )
  const previousRevenue = previousRevenueRows.reduce(
    (sum, row) => sum + Number(row.total ?? 0),
    0,
  )
  const totalOrders = Number(currentOrdersResult[0]?.count ?? 0)
  const previousOrders = Number(previousOrdersResult[0]?.count ?? 0)

  return {
    totalRevenue,
    totalOrders,
    overdueInvoices: Number(overdueInvoicesResult[0]?.count ?? 0),
    pendingApprovals: Number(pendingApprovalsResult[0]?.count ?? 0),
    revenueTrend: {
      current: totalRevenue,
      previous: previousRevenue,
      changePercent: getChangePercent(totalRevenue, previousRevenue),
    },
    ordersTrend: {
      current: totalOrders,
      previous: previousOrders,
      changePercent: getChangePercent(totalOrders, previousOrders),
    },
  }
}

export async function getRevenueSeries(
  orgId: string,
  period: Period = 'thisMonth',
): Promise<RevenuePoint[]> {
  const { start, end } = getPeriodDates(period)
  const rows = await db
    .select({
      createdAt: orders.createdAt,
      total: orders.total,
    })
    .from(orders)
    .where(
      and(
        eq(orders.orgId, orgId),
        gte(orders.createdAt, start),
        lte(orders.createdAt, end),
        eq(orders.status, 'completed'),
      ),
    )

  const buckets = createRevenueBuckets(start, end)

  for (const row of rows) {
    const key = formatDateKey(row.createdAt)
    buckets.set(key, (buckets.get(key) ?? 0) + Number(row.total ?? 0))
  }

  return [...buckets.entries()].map(([date, revenue]) => ({ date, revenue }))
}

export async function getRecentOrders(
  orgId: string,
  limit = 5,
): Promise<RecentOrder[]> {
  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      total: orders.total,
      customerName: customers.name,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .leftJoin(customers, eq(customers.id, orders.customerId))
    .where(eq(orders.orgId, orgId))
    .orderBy(desc(orders.createdAt))
    .limit(limit)

  return rows.map((row) => ({
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    total: Number(row.total),
    customerName: row.customerName,
    createdAt: row.createdAt,
  }))
}

export async function getTaskStageCounts(
  orgId: string,
): Promise<TaskStageCount[]> {
  const [stages, tasks] = await Promise.all([
    db
      .select({
        id: productionStages.id,
        name: productionStages.name,
        board: productionStages.board,
        orderIndex: productionStages.orderIndex,
      })
      .from(productionStages)
      .where(
        and(
          eq(productionStages.orgId, orgId),
          eq(productionStages.active, true),
        ),
      )
      .orderBy(productionStages.orderIndex),
    db
      .select({
        stageId: productionTasks.stageId,
        status: productionTasks.status,
      })
      .from(productionTasks)
      .where(
        and(
          eq(productionTasks.orgId, orgId),
          // Only count active tasks (not completed)
          ne(productionTasks.status, 'completed'),
        ),
      ),
  ])

  const counts = new Map<string, number>()
  let queueCount = 0

  for (const task of tasks) {
    if (task.stageId === null) {
      queueCount += 1
      continue
    }

    counts.set(task.stageId, (counts.get(task.stageId) ?? 0) + 1)
  }

  const result: TaskStageCount[] = [
    {
      id: 'queue',
      name: 'queue',
      board: 'pre_production' as const,
      count: queueCount,
    },
  ]

  // Then add all stages
  for (const stage of stages) {
    result.push({
      id: stage.id,
      name: stage.name,
      board: stage.board as 'pre_production' | 'production',
      count: counts.get(stage.id) ?? 0,
    })
  }

  return result
}
