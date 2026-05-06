import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import type { CreateStageInput, Stage, UpdateStageInput } from './model'

export type MutationResult = { ok: true } | { ok: false; error: string }

async function resolveOrgId(): Promise<string> {
  const { auth } = await import('#/lib/auth')
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error('Not authenticated')

  const { db } = await import('#/db/index')
  const { member } = await import('#/db/schema')
  const { eq } = await import('drizzle-orm')
  const memberships = await db
    .select({ orgId: member.organizationId, role: member.role })
    .from(member)
    .where(eq(member.userId, session.user.id))
    .limit(1)

  if (memberships.length === 0) throw new Error('No organization')
  return memberships[0].orgId
}

async function resolveOrgAndRole(): Promise<{ orgId: string; role: string }> {
  const { auth } = await import('#/lib/auth')
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error('Not authenticated')

  const { db } = await import('#/db/index')
  const { member } = await import('#/db/schema')
  const { eq } = await import('drizzle-orm')
  const memberships = await db
    .select({ orgId: member.organizationId, role: member.role })
    .from(member)
    .where(eq(member.userId, session.user.id))
    .limit(1)

  if (memberships.length === 0) throw new Error('No organization')
  return { orgId: memberships[0].orgId, role: memberships[0].role }
}

export const listStagesFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Stage[]> => {
    const orgId = await resolveOrgId()
    const { listStages } = await import('./model')
    return listStages(orgId)
  },
)

export const createStageFn = createServerFn({ method: 'POST' })
  .inputValidator((input: Omit<CreateStageInput, 'orgId'>) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    const orgId = await resolveOrgId()
    try {
      const { createStage } = await import('./model')
      await createStage({ ...data, orgId })
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })

export const updateStageFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: Omit<UpdateStageInput, 'orgId'> & { id: string }) => input,
  )
  .handler(async ({ data }): Promise<MutationResult> => {
    const orgId = await resolveOrgId()
    try {
      const { updateStage } = await import('./model')
      await updateStage({ ...data, orgId })
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })

export const reorderStagesFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { stageIds: string[] }) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    const orgId = await resolveOrgId()
    try {
      const { reorderStages } = await import('./model')
      await reorderStages(orgId, data.stageIds)
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })

export const toggleStageFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string; active: boolean }) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    const orgId = await resolveOrgId()
    try {
      const { toggleStage } = await import('./model')
      await toggleStage(data.id, orgId, data.active)
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })

export const deleteStageFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    const orgId = await resolveOrgId()
    try {
      const { deleteStage } = await import('./model')
      await deleteStage(data.id, orgId)
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })

export const advanceTaskFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { taskId: string }) => input)
  .handler(
    async ({
      data,
    }): Promise<
      { ok: true; pendingApproval: boolean } | { ok: false; error: string }
    > => {
      const orgId = await resolveOrgId()
      const { auth } = await import('#/lib/auth')
      const headers = getRequestHeaders()
      const session = await auth.api.getSession({ headers })
      try {
        const { advanceTask } = await import('./model')
        return await advanceTask(
          data.taskId,
          orgId,
          session?.user.id ?? 'unknown',
        )
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        }
      }
    },
  )

export const approveTaskAdvanceFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { taskId: string; reviewNotes?: string }) => input)
  .handler(async ({ data }) => {
    const { orgId, role } = await resolveOrgAndRole()
    const { auth } = await import('#/lib/auth')
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })
    const { approveTaskAdvance } = await import('./model')
    return approveTaskAdvance(
      data.taskId,
      orgId,
      session?.user.id ?? 'unknown',
      role,
      data.reviewNotes,
    )
  })

export const rejectTaskAdvanceFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { taskId: string; reviewNotes?: string }) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    const { orgId, role } = await resolveOrgAndRole()
    try {
      const { auth } = await import('#/lib/auth')
      const headers = getRequestHeaders()
      const session = await auth.api.getSession({ headers })
      const { rejectTaskAdvance } = await import('./model')
      await rejectTaskAdvance(
        data.taskId,
        orgId,
        session?.user.id ?? 'unknown',
        role,
        data.reviewNotes,
      )
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })

export const saveTaskCommentFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { taskId: string; text: string }) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    const orgId = await resolveOrgId()
    try {
      const { auth } = await import('#/lib/auth')
      const headers = getRequestHeaders()
      const session = await auth.api.getSession({ headers })
      const { saveTaskComment } = await import('./model')
      await saveTaskComment(
        data.taskId,
        orgId,
        session?.user.id ?? 'unknown',
        data.text,
      )
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })

export const listBoardTasksFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { stageId?: string; search?: string }) => input)
  .handler(async ({ data }) => {
    const orgId = await resolveOrgId()
    const { listBoardTasks } = await import('./model')
    return listBoardTasks(orgId, { stageId: data.stageId, search: data.search })
  })

export const getTaskDetailFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { taskId: string }) => input)
  .handler(async ({ data }) => {
    const orgId = await resolveOrgId()
    const { getTaskDetail } = await import('./model')
    return getTaskDetail(data.taskId, orgId)
  })

export const listTaskActivitiesFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { taskId: string }) => input)
  .handler(async ({ data }) => {
    const { listTaskActivities } = await import('./model')
    return listTaskActivities(data.taskId)
  })
