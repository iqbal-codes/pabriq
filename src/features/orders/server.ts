import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import type {
  CreateDraftOrderInput,
  GetOrderResult,
  ListOrdersParams,
  ListOrdersResult,
  UpdateDraftOrderInput,
} from './model'

async function resolveOrgId(): Promise<string> {
  const { auth } = await import('#/lib/auth')
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error('Not authenticated')

  const { db } = await import('#/db/index')
  const { member } = await import('#/db/schema')
  const { eq } = await import('drizzle-orm')
  const memberships = await db
    .select({ orgId: member.organizationId })
    .from(member)
    .where(eq(member.userId, session.user.id))
    .limit(1)

  if (memberships.length === 0) throw new Error('No organization')
  return memberships[0].orgId
}

export const listOrdersFn = createServerFn({ method: 'GET' })
  .inputValidator((data: ListOrdersParams) => data)
  .handler(async ({ data }): Promise<ListOrdersResult> => {
    const { listOrders } = await import('./model')
    return listOrders(data)
  })

export const getOrderFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { id: string; orgId: string }) => input)
  .handler(async ({ data }): Promise<GetOrderResult | null> => {
    const { getOrder } = await import('./model')
    return getOrder(data.id, data.orgId)
  })

export const createDraftOrderFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: Omit<CreateDraftOrderInput, 'orgId'> & { orgId: string }) => input,
  )
  .handler(async ({ data }) => {
    const orgId = await resolveOrgId()
    const { createDraftOrder } = await import('./model')
    return createDraftOrder(orgId, {
      customerId: data.customerId,
      notes: data.notes,
      lineItems: data.lineItems,
    })
  })

export const updateDraftOrderFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (
      input: { id: string; orgId: string } & Omit<
        UpdateDraftOrderInput,
        'orgId'
      >,
    ) => input,
  )
  .handler(async ({ data }) => {
    const orgId = await resolveOrgId()
    const { updateDraftOrder } = await import('./model')
    return updateDraftOrder(data.id, orgId, {
      customerId: data.customerId,
      notes: data.notes,
      lineItems: data.lineItems,
    })
  })

export const getAssetsForLineItemFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { lineItemId: string; orgId: string }) => input)
  .handler(async ({ data }) => {
    const { getAssetsForLineItem } = await import('./model')
    return getAssetsForLineItem(data.lineItemId, data.orgId)
  })
