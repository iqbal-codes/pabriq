import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '#/db/index'
import * as schema from '#/db/schema'
import { listCustomers } from '#/features/customers/model'
import { listInvoices } from '#/features/invoices/model'
import { listOrders } from '#/features/orders/model'
import { listBoardTasks } from '#/features/production/model'
import { listProducts } from '#/features/products/model'

export const assistantDomains = [
  'customers',
  'products',
  'orders',
  'invoices',
  'production',
] as const

export type AssistantDomain = (typeof assistantDomains)[number]

export type AssistantRole = 'owner' | 'admin' | 'member'

export type AssistantToolContext = {
  orgId: string
  userId: string
  role: AssistantRole
}

export type AssistantRecord = {
  domain: AssistantDomain
  id: string
  title: string
  subtitle: string | null
  href: string | null
  metadata: Record<string, string | number | boolean | null>
}

export type AssistantSearchResult = {
  records: AssistantRecord[]
  omittedDomains: AssistantDomain[]
}

export type AssistantOverview = {
  customers: number | null
  activeProducts: number | null
  openOrders: number | null
  unpaidInvoices: number | null
  activeProductionTasks: number | null
  omittedDomains: AssistantDomain[]
}

export type AssistantChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export type AssistantMemoryScope = {
  thread: string
  resource: string
}

export function getAssistantAllowedDomains(
  role: AssistantRole,
): readonly AssistantDomain[] {
  if (role === 'owner' || role === 'admin') {
    return assistantDomains
  }
  // member can only access production
  return ['production'] as const
}

export function buildAssistantMemoryScope(
  context: Pick<AssistantToolContext, 'orgId' | 'userId'>,
): AssistantMemoryScope {
  return {
    thread: `assistant:${context.orgId}:${context.userId}`,
    resource: `org:${context.orgId}:user:${context.userId}`,
  }
}

export function normalizeMastraMemoryMessages(
  messages: unknown[],
): AssistantChatMessage[] {
  const result: AssistantChatMessage[] = []

  for (const msg of messages) {
    const record = msg as Record<string, unknown>
    const role = record.role as string | undefined
    if (role !== 'user' && role !== 'assistant') continue

    const createdAt = record.createdAt as string | Date | undefined
    const id = (record.id as string | undefined) ?? crypto.randomUUID()

    const text = extractTextContent(record.content)
    if (!text) continue

    result.push({
      id,
      role: role as 'user' | 'assistant',
      content: text,
      createdAt:
        createdAt instanceof Date
          ? createdAt.toISOString()
          : (createdAt ?? new Date().toISOString()),
    })
  }

  result.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
  return result
}

function extractTextContent(content: unknown): string | null {
  if (typeof content === 'string' && content.trim()) return content.trim()
  if (content && typeof content === 'object') {
    const obj = content as Record<string, unknown>
    if (typeof obj.text === 'string' && obj.text.trim()) return obj.text.trim()
    if (typeof obj.content === 'string' && obj.content.trim())
      return obj.content.trim()
    if (Array.isArray(obj)) {
      const texts: string[] = []
      for (const part of obj) {
        if (
          part &&
          typeof part === 'object' &&
          (part as Record<string, unknown>).type === 'text' &&
          typeof (part as Record<string, unknown>).text === 'string'
        ) {
          texts.push((part as Record<string, unknown>).text as string)
        }
      }
      if (texts.length > 0) return texts.join('\n').trim()
    }
  }
  return null
}

export async function searchAssistantBusinessRecords(input: {
  context: AssistantToolContext
  query: string
  domains?: AssistantDomain[]
  limit?: number
}): Promise<AssistantSearchResult> {
  const allowed = getAssistantAllowedDomains(input.context.role)
  const requested = input.domains ?? [...assistantDomains]
  const filtered = requested.filter((d) => allowed.includes(d))
  const omittedDomains = requested.filter((d) => !allowed.includes(d))

  if (filtered.length === 0) {
    return { records: [], omittedDomains }
  }

  const limit = input.limit ?? 3
  const records: AssistantRecord[] = []

  await Promise.all(
    filtered.map(async (domain) => {
      const domainRecords = await searchDomain(
        domain,
        input.context.orgId,
        input.query,
        limit,
      )
      records.push(...domainRecords)
    }),
  )

  return { records, omittedDomains }
}

async function searchDomain(
  domain: AssistantDomain,
  orgId: string,
  query: string,
  limit: number,
): Promise<AssistantRecord[]> {
  switch (domain) {
    case 'customers': {
      const result = await listCustomers({
        orgId,
        search: query,
        page: 1,
        perPage: limit,
      })
      return result.rows.map(
        (row): AssistantRecord => ({
          domain: 'customers',
          id: row.id,
          title: row.name,
          subtitle: row.email ?? row.phone ?? null,
          href: `/customers/${row.id}`,
          metadata: { active: row.active },
        }),
      )
    }
    case 'products': {
      const rows = await listProducts({
        orgId,
        search: query,
        activeOnly: true,
        sortBy: 'name',
        sortDir: 'asc',
      })
      return rows.slice(0, limit).map(
        (row): AssistantRecord => ({
          domain: 'products',
          id: row.id,
          title: row.name,
          subtitle: row.description ?? null,
          href: `/products/${row.id}`,
          metadata: { active: row.active },
        }),
      )
    }
    case 'orders': {
      const result = await listOrders({
        orgId,
        search: query,
        page: 1,
        perPage: limit,
      })
      return result.rows.map(
        (row): AssistantRecord => ({
          domain: 'orders',
          id: row.id,
          title: row.orderNumber ?? row.id,
          subtitle: row.customerName ?? null,
          href: `/orders/${row.id}`,
          metadata: { status: row.status, total: row.total },
        }),
      )
    }
    case 'invoices': {
      const result = await listInvoices({
        orgId,
        q: query,
        page: 1,
        perPage: limit,
      })
      return result.rows.map(
        (row): AssistantRecord => ({
          domain: 'invoices',
          id: row.id,
          title: row.invoiceNumber,
          subtitle: row.customerName ?? null,
          href: `/invoices/${row.id}`,
          metadata: { status: row.status, total: row.total },
        }),
      )
    }
    case 'production': {
      const board = await listBoardTasks(orgId, { search: query })
      const stageTasks = [...board.stages.values()].flat()
      const allTasks = [...board.queued, ...stageTasks, ...board.done]
      return allTasks.slice(0, limit).map(
        (bt): AssistantRecord => ({
          domain: 'production',
          id: bt.task.id,
          title: bt.task.taskNumber ?? bt.task.id,
          subtitle:
            (bt.task.context as Record<string, string | null> | null)
              ?.productName ?? null,
          href: '/production',
          metadata: { status: bt.task.status, board: bt.task.board },
        }),
      )
    }
  }
}

export async function getAssistantBusinessOverview(
  context: AssistantToolContext,
): Promise<AssistantOverview> {
  const allowed = getAssistantAllowedDomains(context.role)
  const omittedDomains = assistantDomains.filter(
    (d) => !allowed.includes(d),
  ) as AssistantDomain[]

  const canAccess = (domain: AssistantDomain) => allowed.includes(domain)

  const [
    customers,
    activeProducts,
    openOrders,
    unpaidInvoices,
    activeProductionTasks,
  ] = await Promise.all([
    canAccess('customers')
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(schema.customers)
          .where(eq(schema.customers.orgId, context.orgId))
          .then((r) => Number(r[0]?.count ?? 0))
      : Promise.resolve(null),
    canAccess('products')
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(schema.products)
          .where(
            and(
              eq(schema.products.orgId, context.orgId),
              eq(schema.products.active, true),
            ),
          )
          .then((r) => Number(r[0]?.count ?? 0))
      : Promise.resolve(null),
    canAccess('orders')
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(schema.orders)
          .where(
            and(
              eq(schema.orders.orgId, context.orgId),
              sql`${schema.orders.status} NOT IN ('completed', 'cancelled')`,
            ),
          )
          .then((r) => Number(r[0]?.count ?? 0))
      : Promise.resolve(null),
    canAccess('invoices')
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(schema.invoices)
          .where(
            and(
              eq(schema.invoices.orgId, context.orgId),
              sql`${schema.invoices.status} IN ('unpaid', 'partially_paid')`,
            ),
          )
          .then((r) => Number(r[0]?.count ?? 0))
      : Promise.resolve(null),
    canAccess('production')
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(schema.productionTasks)
          .where(
            and(
              eq(schema.productionTasks.orgId, context.orgId),
              isNull(schema.productionTasks.archivedAt),
            ),
          )
          .then((r) => Number(r[0]?.count ?? 0))
      : Promise.resolve(null),
  ])

  return {
    customers,
    activeProducts,
    openOrders,
    unpaidInvoices,
    activeProductionTasks,
    omittedDomains,
  }
}
