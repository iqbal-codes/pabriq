import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
  ChannelAccessRow,
  ChannelErrorCode,
  ConnectedChannelView,
} from '#/features/channels/model'
import { resolveOrgAndRole } from '#/lib/auth-session-server'

const CHANNEL_ACCESS_STATUSES = ['pending', 'approved', 'revoked'] as const

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
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  ) {
    return (error as { code: ChannelServerError }).code
  }
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
    const [orgId, { getConnectedChannel }] = await Promise.all([
      resolveChannelManagerOrgId(),
      import('#/features/channels/model'),
    ])
    return getConnectedChannel(orgId)
  },
)

export const listChannelAccessesFn = createServerFn({ method: 'GET' })
  .inputValidator(listAccessesInput)
  .handler(async ({ data }): Promise<ChannelAccessRow[]> => {
    const [orgId, { listChannelAccesses }] = await Promise.all([
      resolveChannelManagerOrgId(),
      import('#/features/channels/model'),
    ])
    return listChannelAccesses(orgId, data.status)
  })

export const connectTelegramChannelFn = createServerFn({ method: 'POST' })
  .inputValidator(connectTelegramInput)
  .handler(
    async ({ data }): Promise<ChannelMutationResult<ConnectedChannelView>> => {
      try {
        const [orgId, { connectTelegramChannel }] = await Promise.all([
          resolveChannelManagerOrgId(),
          import('#/features/channels/model'),
        ])
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
        const [orgId, { disconnectTelegramChannel }] = await Promise.all([
          resolveChannelManagerOrgId(),
          import('#/features/channels/model'),
        ])
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
        const [orgId, { approveChannelAccess }] = await Promise.all([
          resolveChannelManagerOrgId(),
          import('#/features/channels/model'),
        ])
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
        const [orgId, { revokeChannelAccess }] = await Promise.all([
          resolveChannelManagerOrgId(),
          import('#/features/channels/model'),
        ])
        const result = await revokeChannelAccess(orgId, data.id)
        return { ok: true, data: result }
      } catch (error) {
        return { ok: false, error: toMutationError(error) }
      }
    },
  )
