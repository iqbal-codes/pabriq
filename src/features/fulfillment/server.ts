import { createServerFn } from '@tanstack/react-start'
import {
  createFulfillmentForOrder,
  type FulfillmentInitParams,
  type FulfillmentRecord,
  getFulfillmentForOrder,
  type TransitionFulfillmentParams,
  transitionFulfillment,
} from '#/features/fulfillment/model'
import { resolveOrgId } from '#/lib/auth-session-server'
import type { MutationResult } from '#/lib/server-results'

export const getFulfillmentFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { orderId: string }) => input)
  .handler(async ({ data }): Promise<FulfillmentRecord | null> => {
    const orgId = await resolveOrgId()
    return getFulfillmentForOrder(data.orderId, orgId)
  })

export const initFulfillmentFn = createServerFn({ method: 'POST' })
  .inputValidator((input: Omit<FulfillmentInitParams, 'orgId'>) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const orgId = await resolveOrgId()
      await createFulfillmentForOrder({ ...data, orgId })
      return { ok: true }
    } catch (err: unknown) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  })

export const transitionFulfillmentFn = createServerFn({ method: 'POST' })
  .inputValidator((input: Omit<TransitionFulfillmentParams, 'orgId'>) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const orgId = await resolveOrgId()
      await transitionFulfillment({ ...data, orgId })
      return { ok: true }
    } catch (err: unknown) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  })
