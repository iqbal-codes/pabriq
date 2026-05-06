import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { db } from '#/db/index'
import type { Requirement } from '#/db/schema'
import {
  taskActivity as activityTable,
  productionStages as stagesTable,
  productionTasks as tasksTable,
} from '#/db/schema'
import { canApproveProductionTask } from '#/features/permissions/model'

export type { Requirement } from '#/db/schema'

export type Stage = {
  id: string
  orgId: string
  name: string
  description: string | null
  needApproval: boolean
  requirements: Requirement[]
  orderIndex: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export type CreateStageInput = {
  orgId: string
  name: string
  description?: string
  needApproval?: boolean
  requirements?: Requirement[]
  orderIndex?: number
}

export type UpdateStageInput = {
  id: string
  orgId: string
  name?: string
  description?: string
  needApproval?: boolean
  requirements?: Requirement[]
  orderIndex?: number
  active?: boolean
}

export type ProductionTask = {
  id: string
  orgId: string
  orderId: string
  stageId: string | null
  status: string
  context: Record<string, string | number | boolean | null> | null
  assignedTo: string | null
  createdAt: Date
  updatedAt: Date
}

export type TaskActivity = {
  id: string
  orgId: string
  taskId: string
  type: string
  fromStageId: string | null
  toStageId: string | null
  data: Record<string, string | number | boolean | null> | null
  actorId: string
  createdAt: Date
}

function generateId(): string {
  return crypto.randomUUID()
}

export async function createStage(input: CreateStageInput): Promise<Stage> {
  const now = new Date()
  const maxOrder = await db
    .select({ value: sql<number>`COALESCE(MAX(order_index), -1)` })
    .from(stagesTable)
    .where(eq(stagesTable.orgId, input.orgId))

  const id = generateId()
  const orderIndex = input.orderIndex ?? (maxOrder[0]?.value ?? -1) + 1

  const rows = await db
    .insert(stagesTable)
    .values({
      id,
      orgId: input.orgId,
      name: input.name,
      description: input.description ?? null,
      needApproval: input.needApproval ?? false,
      requirements: (input.requirements ?? []) as Requirement[],
      orderIndex,
      active: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  return rows[0] as Stage
}

export async function listStages(orgId: string): Promise<Stage[]> {
  const rows = await db
    .select()
    .from(stagesTable)
    .where(eq(stagesTable.orgId, orgId))
    .orderBy(asc(stagesTable.orderIndex))

  return rows as Stage[]
}

export async function getStage(
  id: string,
  orgId: string,
): Promise<Stage | null> {
  const rows = await db
    .select()
    .from(stagesTable)
    .where(and(eq(stagesTable.id, id), eq(stagesTable.orgId, orgId)))
    .limit(1)

  if (rows.length === 0) return null
  return rows[0] as Stage
}

export async function updateStage(input: UpdateStageInput): Promise<Stage> {
  const now = new Date()
  const updates: Record<string, unknown> = { updatedAt: now }

  if (input.name !== undefined) updates.name = input.name
  if (input.description !== undefined) updates.description = input.description
  if (input.needApproval !== undefined)
    updates.needApproval = input.needApproval
  if (input.requirements !== undefined)
    updates.requirements = input.requirements as Requirement[]
  if (input.orderIndex !== undefined) updates.orderIndex = input.orderIndex
  if (input.active !== undefined) updates.active = input.active

  const rows = await db
    .update(stagesTable)
    .set(updates)
    .where(
      and(eq(stagesTable.id, input.id), eq(stagesTable.orgId, input.orgId)),
    )
    .returning()

  if (rows.length === 0) throw new Error('Stage not found')
  return rows[0] as Stage
}

export async function reorderStages(
  orgId: string,
  stageIds: string[],
): Promise<void> {
  for (let i = 0; i < stageIds.length; i++) {
    await db
      .update(stagesTable)
      .set({ orderIndex: i, updatedAt: new Date() })
      .where(and(eq(stagesTable.id, stageIds[i]), eq(stagesTable.orgId, orgId)))
  }
}

export async function toggleStage(
  id: string,
  orgId: string,
  active: boolean,
): Promise<Stage> {
  const rows = await db
    .update(stagesTable)
    .set({ active, updatedAt: new Date() })
    .where(and(eq(stagesTable.id, id), eq(stagesTable.orgId, orgId)))
    .returning()

  if (rows.length === 0) throw new Error('Stage not found')
  return rows[0] as Stage
}

export async function deleteStage(id: string, orgId: string): Promise<void> {
  const result = await db
    .delete(stagesTable)
    .where(and(eq(stagesTable.id, id), eq(stagesTable.orgId, orgId)))
    .returning({ id: stagesTable.id })

  if (result.length === 0) throw new Error('Stage not found')
}

async function logActivity(input: {
  orgId: string
  taskId: string
  type: string
  fromStageId?: string | null
  toStageId?: string | null
  data?: Record<string, unknown>
  actorId: string
}): Promise<void> {
  await db.insert(activityTable).values({
    id: crypto.randomUUID(),
    orgId: input.orgId,
    taskId: input.taskId,
    type: input.type,
    fromStageId: input.fromStageId ?? null,
    toStageId: input.toStageId ?? null,
    data: (input.data ?? {}) as Record<string, unknown>,
    actorId: input.actorId,
    createdAt: new Date(),
  })
}

type AdvanceTaskResult =
  | { ok: true; pendingApproval: false }
  | { ok: true; pendingApproval: true }
  | { ok: false; error: string }

export async function advanceTask(
  taskId: string,
  orgId: string,
  actorId: string,
): Promise<AdvanceTaskResult> {
  const taskRows = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.id, taskId), eq(tasksTable.orgId, orgId)))
    .limit(1)

  if (taskRows.length === 0) throw new Error('Task not found')
  const task = taskRows[0] as ProductionTask

  if (task.status === 'completed' || task.status === 'pending_approval') {
    return { ok: false, error: 'Task cannot be advanced from current status' }
  }

  const isQueued = task.status === 'queued'

  const allStages = await db
    .select()
    .from(stagesTable)
    .where(and(eq(stagesTable.orgId, orgId), eq(stagesTable.active, true)))
    .orderBy(asc(stagesTable.orderIndex))

  if (allStages.length === 0) {
    return { ok: false, error: 'No active production stages' }
  }

  const currentStageIdx = isQueued
    ? -1
    : allStages.findIndex((s) => s.id === task.stageId)

  if (!isQueued && currentStageIdx === -1) {
    return { ok: false, error: 'Current stage not found' }
  }

  const nextStageIdx = currentStageIdx + 1
  if (nextStageIdx >= allStages.length) {
    const now = new Date()
    await db
      .update(tasksTable)
      .set({ status: 'completed', stageId: null, updatedAt: now })
      .where(eq(tasksTable.id, taskId))

    await logActivity({
      orgId,
      taskId,
      type: 'stage_transition',
      fromStageId: task.stageId,
      toStageId: null,
      data: { completedRequirements: [] },
      actorId,
    })

    return { ok: true, pendingApproval: false }
  }

  const nextStage = allStages[nextStageIdx] as Stage

  if (nextStage.needApproval) {
    const now = new Date()
    await db
      .update(tasksTable)
      .set({
        status: 'pending_approval',
        stageId: nextStage.id,
        updatedAt: now,
      })
      .where(eq(tasksTable.id, taskId))

    await logActivity({
      orgId,
      taskId,
      type: 'advancement_requested',
      fromStageId: task.stageId,
      toStageId: nextStage.id,
      data: { fromStage: task.stageId, toStage: nextStage.id },
      actorId,
    })

    return { ok: true, pendingApproval: true }
  }

  const now = new Date()
  await db
    .update(tasksTable)
    .set({ status: 'in_progress', stageId: nextStage.id, updatedAt: now })
    .where(eq(tasksTable.id, taskId))

  await logActivity({
    orgId,
    taskId,
    type: 'stage_transition',
    fromStageId: task.stageId,
    toStageId: nextStage.id,
    data: { completedRequirements: [] },
    actorId,
  })

  return { ok: true, pendingApproval: false }
}

export async function approveTaskAdvance(
  taskId: string,
  orgId: string,
  actorId: string,
  actorRole: string,
  reviewNotes?: string,
): Promise<AdvanceTaskResult> {
  if (!canApproveProductionTask(actorRole as 'owner' | 'admin' | 'member')) {
    return { ok: false, error: 'Not authorized to approve' }
  }
  const taskRows = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.id, taskId), eq(tasksTable.orgId, orgId)))
    .limit(1)

  if (taskRows.length === 0) throw new Error('Task not found')
  const task = taskRows[0] as ProductionTask

  if (task.status !== 'pending_approval') {
    return { ok: false, error: 'Task is not pending approval' }
  }

  const allStages = await db
    .select()
    .from(stagesTable)
    .where(and(eq(stagesTable.orgId, orgId), eq(stagesTable.active, true)))
    .orderBy(asc(stagesTable.orderIndex))

  const currentStageIdx = allStages.findIndex((s) => s.id === task.stageId)
  const nextStageIdx = currentStageIdx + 1

  await logActivity({
    orgId,
    taskId,
    type: 'approved',
    fromStageId: task.stageId,
    data: { reviewNotes: reviewNotes ?? null },
    actorId,
  })

  if (nextStageIdx >= allStages.length) {
    const now = new Date()
    await db
      .update(tasksTable)
      .set({ status: 'completed', stageId: null, updatedAt: now })
      .where(eq(tasksTable.id, taskId))

    await logActivity({
      orgId,
      taskId,
      type: 'stage_transition',
      fromStageId: task.stageId,
      toStageId: null,
      data: { completedRequirements: [] },
      actorId,
    })

    return { ok: true, pendingApproval: false }
  }

  const nextStage = allStages[nextStageIdx] as Stage
  const now = new Date()
  await db
    .update(tasksTable)
    .set({ status: 'in_progress', stageId: nextStage.id, updatedAt: now })
    .where(eq(tasksTable.id, taskId))

  await logActivity({
    orgId,
    taskId,
    type: 'stage_transition',
    fromStageId: task.stageId,
    toStageId: nextStage.id,
    data: { completedRequirements: [] },
    actorId,
  })

  return { ok: true, pendingApproval: false }
}

export async function rejectTaskAdvance(
  taskId: string,
  orgId: string,
  actorId: string,
  actorRole: string,
  reviewNotes?: string,
): Promise<void> {
  if (!canApproveProductionTask(actorRole as 'owner' | 'admin' | 'member')) {
    throw new Error('Not authorized')
  }
  const taskRows = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.id, taskId), eq(tasksTable.orgId, orgId)))
    .limit(1)

  if (taskRows.length === 0) throw new Error('Task not found')
  const task = taskRows[0] as ProductionTask

  if (task.status !== 'pending_approval') {
    throw new Error('Task is not pending approval')
  }

  const now = new Date()
  await db
    .update(tasksTable)
    .set({ status: 'in_progress', updatedAt: now })
    .where(eq(tasksTable.id, taskId))

  await logActivity({
    orgId,
    taskId,
    type: 'rejected',
    fromStageId: task.stageId,
    data: { reviewNotes: reviewNotes ?? null },
    actorId,
  })
}

export async function saveTaskComment(
  taskId: string,
  orgId: string,
  actorId: string,
  text: string,
): Promise<void> {
  const taskRows = await db
    .select({ id: tasksTable.id })
    .from(tasksTable)
    .where(and(eq(tasksTable.id, taskId), eq(tasksTable.orgId, orgId)))
    .limit(1)

  if (taskRows.length === 0) throw new Error('Task not found')

  await logActivity({
    orgId,
    taskId,
    type: 'comment',
    data: { text },
    actorId,
  })
}

export async function listTaskActivities(
  taskId: string,
): Promise<TaskActivity[]> {
  const rows = await db
    .select()
    .from(activityTable)
    .where(eq(activityTable.taskId, taskId))
    .orderBy(desc(activityTable.createdAt))

  return rows as TaskActivity[]
}

export async function getTaskDetail(
  taskId: string,
  orgId: string,
): Promise<ProductionTask | null> {
  const rows = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.id, taskId), eq(tasksTable.orgId, orgId)))
    .limit(1)

  if (rows.length === 0) return null
  return rows[0] as ProductionTask
}

export type BoardTask = {
  task: ProductionTask
  stage: Stage | null
}

export async function listBoardTasks(
  orgId: string,
  filter?: { stageId?: string; search?: string },
): Promise<{
  queued: BoardTask[]
  stages: Map<string, BoardTask[]>
  done: BoardTask[]
}> {
  const allStages = await listStages(orgId)
  const stageMap = new Map(allStages.map((s) => [s.id, s]))

  let tasks = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.orgId, orgId))

  if (filter?.search) {
    const searchStr = filter.search
    tasks = tasks.filter((t) => {
      const ctx = t.context as Record<
        string,
        string | number | boolean | null
      > | null
      return (
        t.id.includes(searchStr) ||
        ((ctx?.productName as string) ?? '')
          .toLowerCase()
          .includes(searchStr.toLowerCase())
      )
    })
  }

  if (filter?.stageId) {
    tasks = tasks.filter((t) => t.stageId === filter.stageId)
  }

  const queued: BoardTask[] = []
  const stages = new Map<string, BoardTask[]>()
  const done: BoardTask[] = []

  for (const task of tasks as ProductionTask[]) {
    const bt: BoardTask = {
      task,
      stage: task.stageId ? (stageMap.get(task.stageId) ?? null) : null,
    }

    if (task.status === 'queued') {
      queued.push(bt)
    } else if (task.status === 'completed') {
      done.push(bt)
    } else {
      const sid = task.stageId ?? '__null'
      if (!stages.has(sid)) stages.set(sid, [])
      stages.get(sid)?.push(bt)
    }
  }

  return { queued, stages, done }
}
