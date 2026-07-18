import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { CHANNEL_ACCESS_STATUSES } from '#/db/schema'
import {
  approveChannelAccess,
  type ChannelAccessRow,
  ChannelError,
  type ChannelErrorCode,
  type ConnectedChannelView,
  connectTelegramChannel,
  disconnectTelegramChannel,
  getConnectedChannel,
  listChannelAccesses,
  revokeChannelAccess,
} from '#/features/channels/model'
import { resolveOrgAndRole } from '#/lib/auth-session-server'

export type ChannelServerError = ChannelErrorCode | 'FORBIDDEN' | 'UNKNOWN'

export type ChannelMutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ChannelServerError }

async function resolveChannelManagerOrgId(): Promise<string> {
  const { orgId, role } = await resolveOrgAndRole()
  if (role !== 'owner' && role !== 'admin') throw new Error('FORBIDDEN')
  return orgId
}

function toMutationError(error: unknown): ChannelServerError {
  if (error instanceof ChannelError) return error.code
  if (error instanceof Error && error.message === 'FORBIDDEN')
    return 'FORBIDDEN'
  return 'UNKNOWN'
}

const connectTelegramInput = z.object({
  botToken: z
    .string()
    .trim()
    .min(10)
    .max(256)
    .regex(/^\d+:[A-Za-z0-9_-]+$/),
})
const accessIdInput = z.object({ id: z.string().uuid() })
const listAccessesInput = z.object({
  status: z.enum(CHANNEL_ACCESS_STATUSES).optional(),
})

export const getConnectedChannelFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ConnectedChannelView | null> => {
    const orgId = await resolveChannelManagerOrgId()
    return getConnectedChannel(orgId)
  },
)

export const listChannelAccessesFn = createServerFn({ method: 'GET' })
  .inputValidator(listAccessesInput)
  .handler(async ({ data }): Promise<ChannelAccessRow[]> => {
    const orgId = await resolveChannelManagerOrgId()
    return listChannelAccesses(orgId, data.status)
  })

export const connectTelegramChannelFn = createServerFn({ method: 'POST' })
  .inputValidator(connectTelegramInput)
  .handler(
    async ({ data }): Promise<ChannelMutationResult<ConnectedChannelView>> => {
      try {
        const orgId = await resolveChannelManagerOrgId()
        const channel = await connectTelegramChannel(orgId, data.botToken)
        return { ok: true, data: channel }
      } catch (error) {
        return { ok: false, error: toMutationError(error) }
      }
    },
  )

export const disconnectTelegramChannelFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({}))
  .handler(
    async (): Promise<
      ChannelMutationResult<{ id: string; status: 'disconnected' }>
    > => {
      try {
        const orgId = await resolveChannelManagerOrgId()
        const result = await disconnectTelegramChannel(orgId)
        return { ok: true, data: result }
      } catch (error) {
        return { ok: false, error: toMutationError(error) }
      }
    },
  )

export const approveChannelAccessFn = createServerFn({ method: 'POST' })
  .inputValidator(accessIdInput)
  .handler(
    async ({
      data,
    }): Promise<ChannelMutationResult<{ id: string; status: 'approved' }>> => {
      try {
        const orgId = await resolveChannelManagerOrgId()
        const result = await approveChannelAccess(orgId, data.id)
        return { ok: true, data: result }
      } catch (error) {
        return { ok: false, error: toMutationError(error) }
      }
    },
  )

export const revokeChannelAccessFn = createServerFn({ method: 'POST' })
  .inputValidator(accessIdInput)
  .handler(
    async ({
      data,
    }): Promise<ChannelMutationResult<{ id: string; status: 'revoked' }>> => {
      try {
        const orgId = await resolveChannelManagerOrgId()
        const result = await revokeChannelAccess(orgId, data.id)
        return { ok: true, data: result }
      } catch (error) {
        return { ok: false, error: toMutationError(error) }
      }
    },
  )
