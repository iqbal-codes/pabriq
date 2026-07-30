import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db/index'
import { user } from '#/db/schema'
import type {
  AdminAuditEvent,
  AdminDashboardMetrics,
  AdminMigrationSummary,
  AdminOrgSummary,
  AdminPlanSummary,
  AdminSubscriptionSummary,
} from '#/features/admin/model'
import {
  createOrganizationExport,
  createPlan,
  createPlanVersion,
  deactivatePlan,
  getAdminDashboardMetrics,
  getProductionBottlenecks,
  grantPlatformAdmin,
  listAuditEvents,
  listMigrations,
  listOrganizations,
  listPlans,
  listPlatformAdmins,
  listSubscriptions,
  recordAuditEvent,
  restoreOrganization,
  revokePlatformAdmin,
  suspendOrganization,
} from '#/features/admin/model'
import { resolvePlatformAdmin } from '#/lib/auth-session-server'
import { wrapError } from '#/lib/server-results'

type AdminResult<T> = { ok: true; data: T } | { ok: false; error: string }

async function requirePlatformAdmin(): Promise<{
  actorId: string
  actorName: string
}> {
  const { isAdmin, session } = await resolvePlatformAdmin()
  if (!isAdmin || !session) {
    throw new Error('Not authorized')
  }
  return {
    actorId: session.user.id,
    actorName: session.user.name ?? session.user.email,
  }
}

async function requirePlatformAdminOrRole(
  allowedRoles: string[],
): Promise<{ actorId: string; actorName: string }> {
  // First try platform admin
  const { isAdmin, session } = await resolvePlatformAdmin()
  if (isAdmin && session) {
    return {
      actorId: session.user.id,
      actorName: session.user.name ?? session.user.email,
    }
  }

  // Fall back to org role check
  const { resolveOrgAndRole } = await import('#/lib/auth-session-server')
  const { role } = await resolveOrgAndRole()
  if (!allowedRoles.includes(role)) {
    throw new Error('Not authorized')
  }

  return {
    actorId: 'system',
    actorName: `role:${role}`,
  }
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const getAdminDashboardMetricsFn = createServerFn({
  method: 'GET',
}).handler(async (): Promise<AdminDashboardMetrics> => {
  await requirePlatformAdmin()
  return getAdminDashboardMetrics()
})

// ─── Organizations ───────────────────────────────────────────────────────────

export const listOrganizationsFn = createServerFn({ method: 'GET' })
  .inputValidator((input: unknown) => {
    const schema = z.object({
      search: z.string().optional(),
    })
    return schema.parse(input)
  })
  .handler(async ({ data }): Promise<AdminOrgSummary[]> => {
    await requirePlatformAdmin()
    return listOrganizations(data.search)
  })

export const suspendOrganizationFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string(),
        reason: z.string().trim().min(1).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<AdminResult<{ orgId: string }>> => {
    try {
      const { actorId, actorName } = await requirePlatformAdmin()
      await suspendOrganization(data.orgId, data.reason, actorId, actorName)
      return { ok: true, data: { orgId: data.orgId } }
    } catch (err: unknown) {
      return wrapError(err)
    }
  })

export const restoreOrganizationFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string(),
        reason: z.string().trim().min(1).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<AdminResult<{ orgId: string }>> => {
    try {
      const { actorId, actorName } = await requirePlatformAdmin()
      await restoreOrganization(data.orgId, data.reason, actorId, actorName)
      return { ok: true, data: { orgId: data.orgId } }
    } catch (err: unknown) {
      return wrapError(err)
    }
  })

export const createOrganizationExportFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) =>
    z.object({ orgId: z.string() }).parse(input),
  )
  .handler(async ({ data }): Promise<AdminResult<{ orgId: string }>> => {
    try {
      const { actorId, actorName } = await requirePlatformAdmin()
      await createOrganizationExport(data.orgId, actorId, actorName)
      return { ok: true, data: { orgId: data.orgId } }
    } catch (err: unknown) {
      return wrapError(err)
    }
  })

// ─── Plans ───────────────────────────────────────────────────────────────────

export const listPlansFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AdminPlanSummary[]> => {
    await requirePlatformAdmin()
    return listPlans()
  },
)

export const createPlanFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) =>
    z
      .object({
        slug: z.string().trim().min(1).max(50),
        name: z.string().trim().min(1).max(100),
        version: z.number().int().min(1),
        description: z.string().optional(),
        entitlements: z.record(z.string(), z.unknown()),
        monthlyPriceCents: z.number().int().min(0),
        annualPriceCents: z.number().int().min(0),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<AdminResult<{ id: string }>> => {
    try {
      const { actorId, actorName } = await requirePlatformAdmin()
      const plan = await createPlan({
        slug: data.slug,
        name: data.name,
        version: data.version,
        description: data.description,
        entitlements: data.entitlements as Parameters<
          typeof createPlan
        >[0]['entitlements'],
        monthlyPriceCents: data.monthlyPriceCents,
        annualPriceCents: data.annualPriceCents,
      })
      await recordAuditEvent({
        actorId,
        actorName,
        action: 'plan.created',
        reason: `Created plan: ${data.name} v${data.version}`,
        details: { planId: plan.id, slug: data.slug },
      })
      return { ok: true, data: { id: plan.id } }
    } catch (err: unknown) {
      return wrapError(err)
    }
  })

export const createPlanVersionFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) =>
    z
      .object({
        planId: z.string(),
        slug: z.string().trim().min(1).max(50),
        name: z.string().trim().min(1).max(100),
        description: z.string().optional(),
        entitlements: z.record(z.string(), z.unknown()),
        monthlyPriceCents: z.number().int().min(0),
        annualPriceCents: z.number().int().min(0),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<AdminResult<{ id: string }>> => {
    try {
      const { actorId, actorName } = await requirePlatformAdmin()
      const plan = await createPlanVersion({
        planId: data.planId,
        slug: data.slug,
        name: data.name,
        description: data.description,
        entitlements: data.entitlements as Parameters<
          typeof createPlanVersion
        >[0]['entitlements'],
        monthlyPriceCents: data.monthlyPriceCents,
        annualPriceCents: data.annualPriceCents,
      })
      await recordAuditEvent({
        actorId,
        actorName,
        action: 'plan.versioned',
        reason: `Versioned plan: ${data.name} → v${plan.version}`,
        details: { planId: plan.id, slug: data.slug, version: plan.version },
      })
      return { ok: true, data: { id: plan.id } }
    } catch (err: unknown) {
      return wrapError(err)
    }
  })

export const deactivatePlanFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) =>
    z.object({ planId: z.string() }).parse(input),
  )
  .handler(async ({ data }): Promise<AdminResult<{ planId: string }>> => {
    try {
      const { actorId, actorName } = await requirePlatformAdmin()
      await deactivatePlan(data.planId)
      await recordAuditEvent({
        actorId,
        actorName,
        action: 'plan.updated',
        reason: `Deactivated plan: ${data.planId}`,
        details: { planId: data.planId, deactivated: true },
      })
      return { ok: true, data: { planId: data.planId } }
    } catch (err: unknown) {
      return wrapError(err)
    }
  })

// ─── Subscriptions ───────────────────────────────────────────────────────────

export const listSubscriptionsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AdminSubscriptionSummary[]> => {
    await requirePlatformAdmin()
    return listSubscriptions()
  },
)

// ─── Audit Log ───────────────────────────────────────────────────────────────

export const listAuditEventsFn = createServerFn({ method: 'GET' })
  .inputValidator((input: unknown) =>
    z
      .object({
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
        action: z.string().optional(),
        organizationId: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<AdminAuditEvent[]> => {
    await requirePlatformAdmin()
    return listAuditEvents(data.limit, data.offset, {
      action: data.action as Parameters<typeof listAuditEvents>[2] extends
        | { action?: infer A }
        | undefined
        ? A
        : never | undefined,
      organizationId: data.organizationId,
    })
  })

// ─── Migrations ──────────────────────────────────────────────────────────────

export const listMigrationsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AdminMigrationSummary[]> => {
    await requirePlatformAdmin()
    return listMigrations()
  },
)

// ─── Platform Admin Users ────────────────────────────────────────────────────

export const listPlatformAdminsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requirePlatformAdmin()
    return listPlatformAdmins()
  },
)

export const grantPlatformAdminFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) =>
    z
      .object({
        email: z.string().email(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<AdminResult<{ userId: string }>> => {
    try {
      const { actorId, actorName } = await requirePlatformAdmin()

      // Find user by email
      const [foundUser] = await db
        .select({ id: user.id, name: user.name, email: user.email })
        .from(user)
        .where(eq(user.email, data.email))
        .limit(1)

      if (!foundUser) {
        return { ok: false, error: `User not found: ${data.email}` }
      }

      await grantPlatformAdmin(foundUser.id, actorId)
      await recordAuditEvent({
        actorId,
        actorName,
        action: 'admin.action',
        reason: `Granted platform admin to: ${foundUser.email}`,
        details: { targetUserId: foundUser.id, targetEmail: foundUser.email },
      })
      return { ok: true, data: { userId: foundUser.id } }
    } catch (err: unknown) {
      return wrapError(err)
    }
  })

export const revokePlatformAdminFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string() }).parse(input),
  )
  .handler(async ({ data }): Promise<AdminResult<{ userId: string }>> => {
    try {
      const { actorId, actorName } = await requirePlatformAdmin()
      await revokePlatformAdmin(data.userId, actorId)
      await recordAuditEvent({
        actorId,
        actorName,
        action: 'admin.action',
        reason: `Revoked platform admin: ${data.userId}`,
        details: { targetUserId: data.userId },
      })
      return { ok: true, data: { userId: data.userId } }
    } catch (err: unknown) {
      return wrapError(err)
    }
  })

// ─── Production Bottlenecks (Owner/Admin view) ───────────────────────────────

export const getProductionBottlenecksFn = createServerFn({ method: 'GET' })
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string(),
        limit: z.number().int().min(1).max(100).default(10),
      })
      .parse(input),
  )
  .handler(
    async ({
      data,
    }): Promise<
      AdminResult<
        Array<{
          taskId: string
          taskNumber: string | null
          stageName: string | null
          productName: string
          status: string
          board: string
          createdAt: string
        }>
      >
    > => {
      try {
        await requirePlatformAdminOrRole(['owner', 'admin'])
        const result = await getProductionBottlenecks(data.orgId, data.limit)
        return { ok: true, data: result }
      } catch (err: unknown) {
        return wrapError(err)
      }
    },
  )
