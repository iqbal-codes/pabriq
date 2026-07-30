import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { z } from 'zod'
import {
  acceptCompatibilityMigration,
  type CompatibilityMigration,
  type CompatibilityMigrationReport,
  getCompatibilityMigration,
  migrateOrganizationCompatibility,
  validateCompatibilityMigration,
} from '#/features/compatibility-migrations/model'
import { auth } from '#/lib/auth'
import { resolveOrgId } from '#/lib/auth-session-server'
import { wrapError } from '#/lib/server-results'

const acceptInputSchema = z.object({
  migrationId: z.string().trim().min(1).max(100),
})

type MigrationResult =
  | { ok: true; data: CompatibilityMigration }
  | { ok: false; error: string }

export const getCompatibilityMigrationFn = createServerFn({
  method: 'GET',
}).handler(
  async (): Promise<CompatibilityMigration | null> =>
    getCompatibilityMigration(await resolveOrgId()),
)

export const validateCompatibilityMigrationFn = createServerFn({
  method: 'GET',
}).handler(
  async (): Promise<CompatibilityMigrationReport> =>
    validateCompatibilityMigration(await resolveOrgId()),
)

export const runCompatibilityMigrationFn = createServerFn({
  method: 'POST',
}).handler(async (): Promise<MigrationResult> => {
  try {
    const data = await migrateOrganizationCompatibility(await resolveOrgId())
    return { ok: true as const, data }
  } catch (err: unknown) {
    return wrapError(err)
  }
})

export const acceptCompatibilityMigrationFn = createServerFn({
  method: 'POST',
})
  .inputValidator((input: unknown) => acceptInputSchema.parse(input))
  .handler(async ({ data }): Promise<MigrationResult> => {
    try {
      const orgId = await resolveOrgId()
      const headers = getRequestHeaders()
      const session = await auth.api.getSession({ headers })
      if (!session) {
        return { ok: false as const, error: 'Not authorized' }
      }
      const accepted = await acceptCompatibilityMigration(
        orgId,
        data.migrationId,
        session.user.id,
      )
      return { ok: true as const, data: accepted }
    } catch (err: unknown) {
      return wrapError(err)
    }
  })
