import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'

type OrgSettings = {
  name: string
  slug: string
  phone: string | null
  email: string | null
  address: { areaId: string; areaName: string; streetAddress: string } | null
  logoAssetId: string | null
}
async function resolveOrgId(): Promise<string> {
  const [{ auth }, { db }, { member }] = await Promise.all([
    import('#/lib/auth'),
    import('#/db/index'),
    import('#/db/schema'),
  ])
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error('Not authenticated')

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
    const [orgId, { db }, { organization, organizationProfiles, addresses }] =
      await Promise.all([
        resolveOrgId(),
        import('#/db/index'),
        import('#/db/schema'),
      ])

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
        logoAssetId: organizationProfiles.logoAssetId,
        areaId: addresses.areaId,
        areaName: addresses.areaName,
        streetAddress: addresses.streetAddress,
      })
      .from(organizationProfiles)
      .leftJoin(addresses, eq(organizationProfiles.addressId, addresses.id))
      .where(eq(organizationProfiles.orgId, orgId))
      .limit(1)

    return {
      name: org.name,
      slug: org.slug,
      phone: profile?.phone ?? null,
      email: profile?.email ?? null,
      address: profile?.areaId
        ? {
            areaId: profile.areaId,
            areaName: profile.areaName ?? '',
            streetAddress: profile.streetAddress ?? '',
          }
        : null,
      logoAssetId: profile?.logoAssetId ?? null,
    }
  },
)

export type UpdateOrgSettingsInput = {
  name: string
  phone?: string | null
  email?: string | null
  address?: { areaId: string; areaName: string; streetAddress: string } | null
  logoAssetId?: string | null
}

async function upsertOrgAddress(
  orgId: string,
  existingAddressId: string | null | undefined,
  address: { areaId: string; areaName: string; streetAddress: string },
): Promise<string | null> {
  if (!address.areaId && !address.streetAddress) return null

  const { db } = await import('#/db/index')
  const { addresses } = await import('#/db/schema')

  if (existingAddressId) {
    await db
      .update(addresses)
      .set({
        areaId: address.areaId || null,
        areaName: address.areaName || null,
        streetAddress: address.streetAddress || null,
        updatedAt: new Date(),
      })
      .where(eq(addresses.id, existingAddressId))
    return existingAddressId
  }

  const newAddressId = crypto.randomUUID()
  await db.insert(addresses).values({
    id: newAddressId,
    orgId,
    areaId: address.areaId || null,
    areaName: address.areaName || null,
    streetAddress: address.streetAddress || null,
  })
  return newAddressId
}

export const updateOrgSettingsFn = createServerFn({ method: 'POST' })
  .inputValidator((input: UpdateOrgSettingsInput) => input)
  .handler(
    async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
      const [orgId, { auth }] = await Promise.all([
        resolveOrgId(),
        import('#/lib/auth'),
      ])
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
          data.address !== undefined ||
          data.logoAssetId !== undefined
        ) {
          const [{ db }, { organizationProfiles }] = await Promise.all([
            import('#/db/index'),
            import('#/db/schema'),
          ])

          const [existing] = await db
            .select({
              id: organizationProfiles.id,
              addressId: organizationProfiles.addressId,
            })
            .from(organizationProfiles)
            .where(eq(organizationProfiles.orgId, orgId))
            .limit(1)

          const updateData: Record<string, unknown> = {}
          if (data.phone !== undefined) updateData.phone = data.phone ?? null
          if (data.email !== undefined) updateData.email = data.email ?? null
          if (data.address !== undefined) {
            updateData.addressId =
              data.address === null
                ? null
                : await upsertOrgAddress(
                    orgId,
                    existing?.addressId,
                    data.address,
                  )
          }
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
