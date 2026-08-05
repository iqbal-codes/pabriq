import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import {
  member,
  organizationProfiles,
  organization as organizationTable,
} from '#/db/schema'
import type { auth as authInstance } from '#/lib/auth'
import { logger } from '#/lib/logger'

type AuthApi = typeof authInstance

export const listUserOrgs = createServerFn({ method: 'GET' }).handler(
  async () => {
    const [auth, { getRequestHeaders }] = await Promise.all([
      import('#/lib/auth').then((m) => m.auth),
      import('@tanstack/react-start/server'),
    ])
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })
    if (!session) return []

    const { db } = await import('#/db/index')
    const memberships = await db
      .select({
        id: organizationTable.id,
        name: organizationTable.name,
        slug: organizationTable.slug,
        logo: organizationProfiles.logoAssetId,
        role: member.role,
      })
      .from(member)
      .innerJoin(
        organizationTable,
        eq(member.organizationId, organizationTable.id),
      )
      .leftJoin(
        organizationProfiles,
        eq(organizationProfiles.orgId, organizationTable.id),
      )
      .where(eq(member.userId, session.user.id))

    return memberships.map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      logo: m.logo,
      role: m.role as 'owner' | 'admin' | 'member',
    }))
  },
)

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function randomSuffix() {
  return Math.random().toString(36).substring(2, 6)
}

type CreateOrgResult =
  | { ok: true; orgId: string }
  | { ok: false; error: string }

export type CreateOrganizationInput = {
  name: string
  businessTemplateId: string
}

export async function createOrganizationHandler(
  data: CreateOrganizationInput,
  headers: HeadersInit = {},
): Promise<CreateOrgResult> {
  const [auth, { db }, { getBusinessTemplate, materializeBusinessTemplate }] =
    await Promise.all([
      import('#/lib/auth').then((m) => m.auth),
      import('#/db/index'),
      import('#/features/product-templates/model'),
    ])
  const trimmed = data.name.trim()
  const slug = slugify(trimmed)
  if (!slug) return { ok: false, error: 'name_invalid' }
  if (!(await getBusinessTemplate(data.businessTemplateId))) {
    return { ok: false, error: 'business_template_unavailable' }
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const trySlug = attempt === 0 ? slug : `${slug}-${randomSuffix()}`
    try {
      await auth.api.createOrganization({
        headers,
        body: { name: trimmed, slug: trySlug },
      })

      const orgs = await db
        .select({ id: organizationTable.id })
        .from(organizationTable)
        .where(eq(organizationTable.slug, trySlug))
        .limit(1)

      if (orgs[0]) {
        try {
          const productTemplates = await materializeBusinessTemplate(
            orgs[0].id,
            data.businessTemplateId,
          )
          if (productTemplates.length === 0) {
            await compensateOrganization(auth, headers, orgs[0].id)
            return { ok: false, error: 'template_materialization_failed' }
          }
        } catch {
          await compensateOrganization(auth, headers, orgs[0].id)
          return { ok: false, error: 'template_materialization_failed' }
        }
        return { ok: true, orgId: orgs[0].id }
      }

      return { ok: false, error: 'creation_failed' }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : String(err)
      if (!msg.includes('slug')) return { ok: false, error: 'creation_failed' }
    }
  }

  return { ok: false, error: 'name_taken' }
}

async function compensateOrganization(
  auth: AuthApi,
  headers: HeadersInit,
  organizationId: string,
): Promise<void> {
  try {
    await auth.api.deleteOrganization({
      headers,
      body: { organizationId },
    })
  } catch (rollbackError) {
    logger.error(
      { error: rollbackError, organizationId },
      'Organization rollback failed after template materialization failure',
    )
  }
}

export const createOrganization = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown): CreateOrganizationInput => {
    if (typeof input !== 'object' || input === null) {
      throw new Error('Invalid organization input')
    }
    const value = input as Record<string, unknown>
    if (
      typeof value.name !== 'string' ||
      typeof value.businessTemplateId !== 'string' ||
      value.businessTemplateId.length === 0
    ) {
      throw new Error('Invalid organization input')
    }
    return {
      name: value.name,
      businessTemplateId: value.businessTemplateId,
    }
  })
  .handler(async ({ data }): Promise<CreateOrgResult> => {
    const { getRequestHeaders } = await import('@tanstack/react-start/server')
    const headers = getRequestHeaders()
    return createOrganizationHandler(data, headers)
  })

export const setOrganizationLogo = createServerFn({ method: 'POST' })
  .inputValidator((input: { orgId: string; logoAssetId: string }) => input)
  .handler(
    async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
      const [{ db }, { organizationProfiles }] = await Promise.all([
        import('#/db/index'),
        import('#/db/schema'),
      ])

      try {
        const existing = await db
          .select({ id: organizationProfiles.id })
          .from(organizationProfiles)
          .where(eq(organizationProfiles.orgId, data.orgId))
          .limit(1)

        if (existing[0]) {
          await db
            .update(organizationProfiles)
            .set({ logoAssetId: data.logoAssetId })
            .where(eq(organizationProfiles.orgId, data.orgId))
        } else {
          await db.insert(organizationProfiles).values({
            id: crypto.randomUUID(),
            orgId: data.orgId,
            logoAssetId: data.logoAssetId,
          })
        }

        return { ok: true }
      } catch {
        return { ok: false, error: 'Failed to set organization logo' }
      }
    },
  )
