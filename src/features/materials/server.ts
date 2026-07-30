import { createServerFn } from '@tanstack/react-start'
import {
  deleteMaterial,
  listMaterials,
  type Material,
  type MaterialInput,
  saveMaterial,
} from '#/features/materials/model'
import { resolveOrgId } from '#/lib/auth-session-server'
import type { MutationResult } from '#/lib/server-results'

export const listMaterialsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Material[]> => {
    const orgId = await resolveOrgId()
    return listMaterials(orgId)
  },
)

export const saveMaterialFn = createServerFn({ method: 'POST' })
  .inputValidator((input: MaterialInput) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const orgId = await resolveOrgId()
      await saveMaterial(orgId, data)
      return { ok: true }
    } catch (err: unknown) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  })

export const deleteMaterialFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { key: string }) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const orgId = await resolveOrgId()
      await deleteMaterial(orgId, data.key)
      return { ok: true }
    } catch (err: unknown) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  })
