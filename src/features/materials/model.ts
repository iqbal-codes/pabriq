import { db } from '#/db/index'
import { businessTemplates, organizationConfigurations } from '#/db/schema'
import {
  addConfigurationElement,
  deleteConfigurationElement,
  getConfigurationElement,
  getOrganizationConfiguration,
  listConfigurationElements,
  updateConfigurationElement,
} from '#/features/business-templates/model'

export type Material = {
  key: string
  name: string
  unit: string
  supplier?: string | null
  referenceData?: string | null
  estimatedQuantity?: number | null
  wasteAllowance?: number | null
}

export type MaterialInput = {
  key?: string
  name: string
  unit: string
  supplier?: string | null
  referenceData?: string | null
  estimatedQuantity?: number | null
  wasteAllowance?: number | null
}
export function mapMaterialElement(el: {
  elementKey: string
  data: unknown
}): Material {
  const data = (el.data ?? {}) as Record<string, unknown>
  return {
    key: el.elementKey,
    name: (data.name as string) ?? el.elementKey,
    unit: (data.unit as string) ?? 'pcs',
    supplier: (data.supplier as string) ?? null,
    referenceData: (data.referenceData as string) ?? null,
    estimatedQuantity:
      typeof data.estimatedQuantity === 'number'
        ? data.estimatedQuantity
        : null,
    wasteAllowance:
      typeof data.wasteAllowance === 'number' ? data.wasteAllowance : null,
  }
}

export async function getResolvedTaskMaterials(
  orgId: string,
  attachedMaterials?: Array<{
    materialKey: string
    estimatedQuantity?: number | null
    wasteAllowance?: number | null
  }> | null,
): Promise<Array<{
  key: string
  name: string
  unit: string
  estimatedQuantity?: number | null
  wasteAllowance?: number | null
  supplier?: string | null
}> | null> {
  if (attachedMaterials && attachedMaterials.length > 0) {
    const resolved: Array<{
      key: string
      name: string
      unit: string
      estimatedQuantity?: number | null
      wasteAllowance?: number | null
      supplier?: string | null
    }> = []

    for (const item of attachedMaterials) {
      const mat = await getMaterial(orgId, item.materialKey)
      if (mat) {
        resolved.push({
          key: mat.key,
          name: mat.name,
          unit: mat.unit,
          estimatedQuantity: item.estimatedQuantity ?? mat.estimatedQuantity,
          wasteAllowance: item.wasteAllowance ?? mat.wasteAllowance,
          supplier: mat.supplier,
        })
      }
    }

    if (resolved.length > 0) return resolved
  }

  const orgMaterials = await listMaterials(orgId)
  if (orgMaterials.length === 0) return null
  return orgMaterials.map((m) => ({
    key: m.key,
    name: m.name,
    unit: m.unit,
    estimatedQuantity: m.estimatedQuantity,
    wasteAllowance: m.wasteAllowance,
    supplier: m.supplier,
  }))
}

export async function listMaterials(orgId: string): Promise<Material[]> {
  const elements = await listConfigurationElements(orgId, {
    elementType: 'material',
  })
  return elements.map(mapMaterialElement)
}

export async function getMaterial(
  orgId: string,
  key: string,
): Promise<Material | null> {
  const el = await getConfigurationElement(orgId, 'material', key)
  if (!el) return null
  return mapMaterialElement(el)
}

export async function ensureOrgConfiguration(orgId: string): Promise<string> {
  const config = await getOrganizationConfiguration(orgId)
  if (config) return config.id

  const elements = await listConfigurationElements(orgId)
  if (elements.length > 0) return elements[0].configId

  let [tmpl] = await db
    .select({ id: businessTemplates.id, version: businessTemplates.version })
    .from(businessTemplates)
    .limit(1)

  if (!tmpl) {
    const tmplId = crypto.randomUUID()
    await db.insert(businessTemplates).values({
      id: tmplId,
      slug: `default-${tmplId.slice(0, 8)}`,
      name: 'Default Template',
      version: 1,
      category: 'general',
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    tmpl = { id: tmplId, version: 1 }
  }

  const configId = crypto.randomUUID()
  await db.insert(organizationConfigurations).values({
    id: configId,
    orgId,
    sourceTemplateId: tmpl.id,
    sourceTemplateVersion: tmpl.version,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  return configId
}
export async function saveMaterial(
  orgId: string,
  input: MaterialInput,
): Promise<Material> {
  const key =
    input.key?.trim() ||
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') ||
    `mat_${Date.now()}`
  const existing = await getConfigurationElement(orgId, 'material', key)

  const materialData: Record<string, unknown> = {
    key,
    name: input.name.trim(),
    unit: input.unit.trim(),
    supplier: input.supplier?.trim() || null,
    referenceData: input.referenceData?.trim() || null,
    estimatedQuantity: input.estimatedQuantity ?? null,
    wasteAllowance: input.wasteAllowance ?? null,
  }

  if (existing) {
    await updateConfigurationElement(orgId, 'material', key, materialData)
  } else {
    const configId = await ensureOrgConfiguration(orgId)
    await addConfigurationElement(
      orgId,
      configId,
      'material',
      key,
      materialData,
    )
  }

  return {
    key,
    name: input.name.trim(),
    unit: input.unit.trim(),
    supplier: input.supplier?.trim() || null,
    referenceData: input.referenceData?.trim() || null,
    estimatedQuantity: input.estimatedQuantity ?? null,
    wasteAllowance: input.wasteAllowance ?? null,
  }
}

export async function deleteMaterial(
  orgId: string,
  key: string,
): Promise<void> {
  await deleteConfigurationElement(orgId, 'material', key)
}
