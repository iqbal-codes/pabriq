import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'

export type OrgSettings = {
  name: string
  slug: string
  phone: string | null
  email: string | null
  addressId: string | null
  logoAssetId: string | null
}

async function resolveOrgId(): Promise<string> {
  const { auth } = await import('#/lib/auth')
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error('Not authenticated')

  const { db } = await import('#/db/index')
  const { member } = await import('#/db/schema')
  const memberships = await db
    .select({ orgId: member.organizationId })
    .from(member)
    .where(eq(member.userId, session.user.id))
    .limit(1)

  if (memberships.length === 0) throw new Error('No organization')
  return memberships[0].orgId
}

export const getOrgSettingsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<OrgSettings> => {
    const orgId = await resolveOrgId()

    const { db } = await import('#/db/index')
    const { organization, organizationProfiles } = await import('#/db/schema')

    const [org] = await db
      .select({
        name: organization.name,
        slug: organization.slug,
      })
      .from(organization)
      .where(eq(organization.id, orgId))
      .limit(1)

    if (!org) throw new Error('Organization not found')

    const [profile] = await db
      .select({
        phone: organizationProfiles.phone,
        email: organizationProfiles.email,
        addressId: organizationProfiles.addressId,
        logoAssetId: organizationProfiles.logoAssetId,
      })
      .from(organizationProfiles)
      .where(eq(organizationProfiles.orgId, orgId))
      .limit(1)

    return {
      name: org.name,
      slug: org.slug,
      phone: profile?.phone ?? null,
      email: profile?.email ?? null,
      addressId: profile?.addressId ?? null,
      logoAssetId: profile?.logoAssetId ?? null,
    }
  },
)

export type UpdateOrgSettingsInput = {
  name: string
  phone?: string | null
  email?: string | null
  addressId?: string | null
  logoAssetId?: string | null
}

export const updateOrgSettingsFn = createServerFn({ method: 'POST' })
  .inputValidator((input: UpdateOrgSettingsInput) => input)
  .handler(
    async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
      const orgId = await resolveOrgId()

      const { auth } = await import('#/lib/auth')
      const headers = getRequestHeaders()

      try {
        await auth.api.updateOrganization({
          headers,
          body: {
            organizationId: orgId,
            data: { name: data.name },
          },
        })

        if (
          data.phone !== undefined ||
          data.email !== undefined ||
          data.addressId !== undefined ||
          data.logoAssetId !== undefined
        ) {
          const { db } = await import('#/db/index')
          const { organizationProfiles } = await import('#/db/schema')

          const [existing] = await db
            .select({ id: organizationProfiles.id })
            .from(organizationProfiles)
            .where(eq(organizationProfiles.orgId, orgId))
            .limit(1)

          const updateData: Record<string, unknown> = {}
          if (data.phone !== undefined) updateData.phone = data.phone ?? null
          if (data.email !== undefined) updateData.email = data.email ?? null
          if (data.addressId !== undefined)
            updateData.addressId = data.addressId ?? null
          if (data.logoAssetId !== undefined)
            updateData.logoAssetId = data.logoAssetId ?? null

          if (existing) {
            await db
              .update(organizationProfiles)
              .set(updateData)
              .where(eq(organizationProfiles.orgId, orgId))
          } else {
            await db.insert(organizationProfiles).values({
              id: crypto.randomUUID(),
              orgId,
              ...updateData,
            })
          }
        }

        return { ok: true }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return { ok: false, error: message }
      }
    },
  )
