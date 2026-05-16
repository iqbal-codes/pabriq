import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import {
  member,
  organizationProfiles,
  organization as organizationTable,
} from '#/db/schema'

export const listUserOrgs = createServerFn({ method: 'GET' }).handler(
  async () => {
    const auth = await import('#/lib/auth').then((m) => m.auth)
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

export const createOrganization = createServerFn({ method: 'POST' })
  .inputValidator((input: { name: string }) => input)
  .handler(async ({ data }): Promise<CreateOrgResult> => {
    const [auth, { db }] = await Promise.all([
      import('#/lib/auth').then((m) => m.auth),
      import('#/db/index'),
    ])
    const headers = getRequestHeaders()

    const trimmed = data.name.trim()
    const slug = slugify(trimmed)
    if (!slug) return { ok: false, error: 'name_invalid' }

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
          return { ok: true, orgId: orgs[0].id }
        }

        return { ok: false, error: 'creation_failed' }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message.toLowerCase() : String(err)
        if (!msg.includes('slug')) {
          return { ok: false, error: 'creation_failed' }
        }
      }
    }

    return { ok: false, error: 'name_taken' }
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
