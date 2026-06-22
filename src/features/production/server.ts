import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import type { CreateStageInput, Stage, UpdateStageInput } from './model'

export type MutationResult = { ok: true } | { ok: false; error: string }

async function resolveOrgId(): Promise<string> {
  const [{ auth }, { db }, { member }, { eq }] = await Promise.all([
    import('#/lib/auth'),
    import('#/db/index'),
    import('#/db/schema'),
    import('drizzle-orm'),
  ])
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error('Not authenticated')

  const memberships = await db
    .select({ orgId: member.organizationId, role: member.role })
    .from(member)
    .where(eq(member.userId, session.user.id))
    .limit(1)

  if (memberships.length === 0) throw new Error('No organization')
  return memberships[0].orgId
}

async function resolveOrgAndRole(): Promise<{ orgId: string; role: string }> {
  const [{ auth }, { db }, { member }, { eq }] = await Promise.all([
    import('#/lib/auth'),
    import('#/db/index'),
    import('#/db/schema'),
    import('drizzle-orm'),
  ])
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error('Not authenticated')

  const memberships = await db
    .select({ orgId: member.organizationId, role: member.role })
    .from(member)
    .where(eq(member.userId, session.user.id))
    .limit(1)

  if (memberships.length === 0) throw new Error('No organization')
  return { orgId: memberships[0].orgId, role: memberships[0].role }
}

export const listStagesFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { board?: string }) => input)
  .handler(async ({ data }): Promise<Stage[]> => {
    const [orgId, { listStages }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    return listStages(orgId, data.board)
  })

export const createStageFn = createServerFn({ method: 'POST' })
  .inputValidator((input: Omit<CreateStageInput, 'orgId'>) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    const [orgId, { createStage }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    try {
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
    const [orgId, { updateStage }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    try {
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
    const [orgId, { reorderStages }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    try {
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
    const [orgId, { toggleStage }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    try {
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
    const [orgId, { deleteStage }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    try {
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
  .inputValidator(
    (input: {
      taskId: string
      requirementResponses?: Record<
        string,
        { value?: string; assetIds?: string[] }
      >
    }) => input,
  )
  .handler(
    async ({
      data,
    }): Promise<
      { ok: true; pendingApproval: boolean } | { ok: false; error: string }
    > => {
      const orgId = await resolveOrgId()
      const [{ auth }, { advanceTask }] = await Promise.all([
        import('#/lib/auth'),
        import('./model'),
      ])
      const headers = getRequestHeaders()
      const session = await auth.api.getSession({ headers })
      try {
        return await advanceTask(
          data.taskId,
          orgId,
          session?.user.id ?? 'unknown',
          data.requirementResponses,
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
    const [{ orgId, role }, { auth }, { approveTaskAdvance }] =
      await Promise.all([
        resolveOrgAndRole(),
        import('#/lib/auth'),
        import('./model'),
      ])
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })
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
    const [{ orgId, role }, { auth }, { rejectTaskAdvance }] =
      await Promise.all([
        resolveOrgAndRole(),
        import('#/lib/auth'),
        import('./model'),
      ])
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })
    try {
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
    const [orgId, { auth }, { saveTaskComment }] = await Promise.all([
      resolveOrgId(),
      import('#/lib/auth'),
      import('./model'),
    ])
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })
    try {
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
  .inputValidator(
    (input: {
      board?: string
      stageId?: string
      search?: string
      archiveAfterHours?: number
    }) => input,
  )
  .handler(async ({ data }) => {
    const [orgId, { listBoardTasks }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    return listBoardTasks(
      orgId,
      {
        board: data.board,
        stageId: data.stageId,
        search: data.search,
      },
      { archiveCompletedAfterHours: data.archiveAfterHours ?? 24 },
    )
  })

export const getTaskDetailFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { taskId: string }) => input)
  .handler(async ({ data }) => {
    const [orgId, { getTaskDetail }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    return getTaskDetail(data.taskId, orgId)
  })

export const listTaskActivitiesFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { taskId: string }) => input)
  .handler(async ({ data }) => {
    const { listTaskActivities } = await import('./model')
    return listTaskActivities(data.taskId)
  })

export const listArchivedTasksFn = createServerFn({ method: 'GET' })
  .inputValidator(
    (input: {
      board?: string
      search?: string
      page?: number
      perPage?: number
    }) => input,
  )
  .handler(async ({ data }) => {
    const [orgId, { listArchivedTasks }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    return listArchivedTasks(orgId, {
      board: data.board,
      search: data.search,
      page: data.page,
      perPage: data.perPage,
    })
  })

export const getTaskCountsFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { board?: string }) => input)
  .handler(async ({ data }) => {
    const [orgId, { getTaskCounts }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    return getTaskCounts(orgId, data.board)
  })

export const listTasksByOrderIdFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { orderId: string }) => input)
  .handler(async ({ data }) => {
    const [orgId, { db }, { productionTasks }, { eq, and }, { listStages }] =
      await Promise.all([
        resolveOrgId(),
        import('#/db/index'),
        import('#/db/schema'),
        import('drizzle-orm'),
        import('./model'),
      ])

    const rows = await db
      .select()
      .from(productionTasks)
      .where(
        and(
          eq(productionTasks.orgId, orgId),
          eq(productionTasks.orderId, data.orderId),
        ),
      )
    const allStages = await listStages(orgId, undefined)
    const stageMap = new Map(allStages.map((s) => [s.id, s]))

    return rows.map((t) => ({
      task: {
        ...t,
        context: t.context as Record<
          string,
          string | number | boolean | null
        > | null,
      },
      stage: t.stageId ? (stageMap.get(t.stageId) ?? null) : null,
    }))
  })
