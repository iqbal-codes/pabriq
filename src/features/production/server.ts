import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import type { OrderTaskEvent } from '#/features/portal/model'
import { resolveOrgId } from '#/lib/auth-session-server'
import type { MutationResult } from '#/lib/server-results'
import type { CreateStageInput, Stage, UpdateStageInput } from './model'

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
async function resolveManageStagesOrgId(): Promise<string> {
  const { orgId, role } = await resolveOrgAndRole()
  const { canManageStages } = await import('#/features/permissions/model')
  if (!canManageStages(role as 'owner' | 'admin' | 'member')) {
    throw new Error('Not authorized')
  }
  return orgId
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
      resolveManageStagesOrgId(),
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
      resolveManageStagesOrgId(),
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
      resolveManageStagesOrgId(),
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
      resolveManageStagesOrgId(),
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
      resolveManageStagesOrgId(),
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
      sort?: { field: string; direction: 'asc' | 'desc' } | null
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
      sort: data.sort,
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

    const [rows, allStages] = await Promise.all([
      db
        .select()
        .from(productionTasks)
        .where(
          and(
            eq(productionTasks.orgId, orgId),
            eq(productionTasks.orderId, data.orderId),
          ),
        ),
      listStages(orgId, undefined),
    ])
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

export const getOrderTasksTimelineFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { orderId: string }) => input)
  .handler(async ({ data }): Promise<OrderTaskEvent[]> => {
    const [
      orgId,
      { db },
      { productionStages, productionTasks, taskActivity },
      { eq, and, or, inArray, asc },
      { buildTimelineEvents, extractActivityIndexes },
    ] = await Promise.all([
      resolveOrgId(),
      import('#/db/index'),
      import('#/db/schema'),
      import('drizzle-orm'),
      import('#/features/portal/model'),
    ])

    // Get all production stages for this org
    const allStages = await db
      .select({
        id: productionStages.id,
        name: productionStages.name,
        requirements: productionStages.requirements,
      })
      .from(productionStages)
      .where(eq(productionStages.orgId, orgId))
    const stageNameMap = new Map(allStages.map((s) => [s.id, s.name]))
    const stageReqMap = new Map<
      string,
      Array<{ id: string; label: string; type: string }>
    >()
    for (const stage of allStages) {
      const requirements = stage.requirements as unknown as Array<{
        id: string
        label: string
        type: string
      }> | null
      if (requirements && requirements.length > 0) {
        stageReqMap.set(stage.id, requirements)
      }
    }

    // Query production_tasks for this order
    const tasks = (
      await db
        .select({
          id: productionTasks.id,
          taskNumber: productionTasks.taskNumber,
          lineItemId: productionTasks.lineItemId,
          context: productionTasks.context,
          stageId: productionTasks.stageId,
          status: productionTasks.status,
        })
        .from(productionTasks)
        .where(
          and(
            eq(productionTasks.orgId, orgId),
            eq(productionTasks.orderId, data.orderId),
          ),
        )
    ).map((t) => ({
      ...t,
      context: t.context as { productName?: string } | null,
    }))

    if (tasks.length === 0) return []
    const taskIds = tasks.map((t) => t.id)

    // Query task_activity for stage transitions
    const activities = (
      await db
        .select({
          id: taskActivity.id,
          taskId: taskActivity.taskId,
          type: taskActivity.type,
          fromStageId: taskActivity.fromStageId,
          toStageId: taskActivity.toStageId,
          data: taskActivity.data,
          createdAt: taskActivity.createdAt,
        })
        .from(taskActivity)
        .where(
          and(
            inArray(taskActivity.taskId, taskIds),
            or(
              eq(taskActivity.type, 'stage_transition'),
              eq(taskActivity.type, 'created'),
              eq(taskActivity.type, 'completed'),
              eq(taskActivity.type, 'board_transition'),
            ),
          ),
        )
        .orderBy(asc(taskActivity.createdAt))
    ).map((act) => ({
      ...act,
      data: act.data as unknown,
    }))

    const activityIndexes = extractActivityIndexes(activities)

    // Build index: taskId → all activities (for stage transitions)
    const activitiesByTaskId = new Map<string, typeof activities>()
    for (const activity of activities) {
      const list = activitiesByTaskId.get(activity.taskId) ?? []
      list.push(activity)
      activitiesByTaskId.set(activity.taskId, list)
    }

    const events = buildTimelineEvents({
      tasks,
      stageNameMap,
      stageReqMap,
      activityIndexes,
      activitiesByTaskId,
    })

    return events.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
  })
