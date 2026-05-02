import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '#/db/index'
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

    const memberships = await db
      .select({
        id: organizationTable.id,
        name: organizationTable.name,
        slug: organizationTable.slug,
        logo: organizationProfiles.logoAssetId,
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

type CreateOrgResult = { ok: true } | { ok: false; error: string }

export const createOrganization = createServerFn({ method: 'POST' })
  .inputValidator((input: { name: string; logoAssetId?: string }) => input)
  .handler(async ({ data }): Promise<CreateOrgResult> => {
    const auth = await import('#/lib/auth').then((m) => m.auth)
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

        if (data.logoAssetId) {
          const orgs = await db
            .select({ id: organizationTable.id })
            .from(organizationTable)
            .where(eq(organizationTable.slug, trySlug))
            .limit(1)

          if (orgs[0]) {
            await db.insert(organizationProfiles).values({
              id: crypto.randomUUID(),
              orgId: orgs[0].id,
              logoAssetId: data.logoAssetId,
            })
          }
        }

        return { ok: true }
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
