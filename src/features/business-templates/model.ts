import { and, eq, or, sql } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  type BusinessTemplateStatus,
  businessTemplates,
  type ConfigurationElementType,
  type ConfigurationProvenance,
  configurationElements,
  organizationConfigurations,
  templateUpgradeProposals,
  type UpgradeProposalStatus,
} from '#/db/schema'
import type { TemplateSeedConfig } from '#/features/business-templates/seed'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BusinessTemplate {
  id: string
  slug: string
  name: string
  description: string | null
  version: number
  status: BusinessTemplateStatus
  capabilities: object
  configSnapshot: object
  publishedAt: Date | null
  retiredAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface OrganizationConfiguration {
  id: string
  orgId: string
  sourceTemplateId: string
  sourceTemplateVersion: number
  status: string
  lineage: Array<{
    templateId: string
    templateVersion: number
    importedAt: string
  }>
  createdAt: Date
  updatedAt: Date
}

export interface ConfigurationElement {
  id: string
  orgId: string
  configId: string
  elementType: ConfigurationElementType
  elementKey: string
  provenance: ConfigurationProvenance
  sourceTemplateId: string | null
  sourceTemplateVersion: number | null
  data: object
  originalData: object | null
  createdAt: Date
  updatedAt: Date
}

export interface UpgradeProposal {
  id: string
  orgId: string
  sourceTemplateId: string
  sourceTemplateVersion: number
  targetTemplateId: string
  targetTemplateVersion: number
  status: UpgradeProposalStatus
  preview: object
  conflicts: Array<object>
  additions: Array<object>
  removals: Array<object>
  semanticChanges: Array<object>
  rejectedAt: Date | null
  appliedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateTemplateInput {
  slug: string
  name: string
  description?: string
  category?: string
  capabilities?: object
  configSnapshot?: object
}

export interface MaterializeResult {
  ok: true
  configId: string
  elementsCreated: number
}

export interface UpgradePreview {
  unchanged: Array<{
    elementType: string
    elementKey: string
    data: object
  }>
  additions: Array<{
    elementType: string
    elementKey: string
    data: object
  }>
  removals: Array<{
    elementType: string
    elementKey: string
    data: object
  }>
  conflicts: Array<{
    elementType: string
    elementKey: string
    currentData: object
    proposedData: object
    provenance: string
  }>
  semanticChanges: Array<{
    elementType: string
    elementKey: string
    currentData: object
    proposedData: object
    provenance: string
  }>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID()
}

// ─── Template CRUD & Lifecycle ───────────────────────────────────────────────

export async function createTemplate(
  input: CreateTemplateInput,
): Promise<BusinessTemplate> {
  const id = generateId()

  // Check for existing slug to auto-increment version
  const existing = await db
    .select({
      maxVersion: sql<number>`coalesce(max(${businessTemplates.version}), 0)`,
    })
    .from(businessTemplates)
    .where(eq(businessTemplates.slug, input.slug))

  const version = existing[0]?.maxVersion
    ? Number(existing[0].maxVersion) + 1
    : 1

  const [row] = await db
    .insert(businessTemplates)
    .values({
      id,
      slug: input.slug,
      name: input.name,
      description: input.description ?? null,
      version,
      category: input.category ?? null,
      status: 'draft' as const,
      capabilities: (input.capabilities ?? {}) as Record<string, unknown>,
      configSnapshot: (input.configSnapshot ?? {}) as Record<string, unknown>,
    })
    .returning()

  if (!row) throw new Error('Failed to create template')
  return row as unknown as BusinessTemplate
}

export async function publishTemplate(id: string): Promise<BusinessTemplate> {
  const template = await db
    .select()
    .from(businessTemplates)
    .where(eq(businessTemplates.id, id))
    .limit(1)

  if (!template[0]) throw new Error('Template not found')
  if (template[0].status !== 'draft') {
    throw new Error(
      `Cannot publish template with status "${template[0].status}"`,
    )
  }

  const [updated] = await db
    .update(businessTemplates)
    .set({
      status: 'published' as const,
      publishedAt: sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(eq(businessTemplates.id, id))
    .returning()

  if (!updated) throw new Error('Failed to publish template')
  return updated as unknown as BusinessTemplate
}

export async function retireTemplate(id: string): Promise<BusinessTemplate> {
  const template = await db
    .select()
    .from(businessTemplates)
    .where(eq(businessTemplates.id, id))
    .limit(1)

  if (!template[0]) throw new Error('Template not found')
  if (template[0].status !== 'published') {
    throw new Error(
      `Cannot retire template with status "${template[0].status}"`,
    )
  }

  const [updated] = await db
    .update(businessTemplates)
    .set({
      status: 'retired' as const,
      retiredAt: sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(eq(businessTemplates.id, id))
    .returning()

  if (!updated) throw new Error('Failed to retire template')
  return updated as unknown as BusinessTemplate
}

export async function getTemplate(
  id: string,
): Promise<BusinessTemplate | null> {
  const [row] = await db
    .select()
    .from(businessTemplates)
    .where(eq(businessTemplates.id, id))
    .limit(1)

  return (row as unknown as BusinessTemplate) ?? null
}

export async function listPublishedTemplates(): Promise<BusinessTemplate[]> {
  const rows = await db
    .select()
    .from(businessTemplates)
    .where(eq(businessTemplates.status, 'published'))
    .orderBy(businessTemplates.name)

  return rows as unknown as BusinessTemplate[]
}

export async function listAllTemplates(): Promise<BusinessTemplate[]> {
  const rows = await db
    .select()
    .from(businessTemplates)
    .orderBy(businessTemplates.name, businessTemplates.version)

  return rows as unknown as BusinessTemplate[]
}

export async function getLatestPublishedVersion(
  slug: string,
): Promise<BusinessTemplate | null> {
  const [row] = await db
    .select()
    .from(businessTemplates)
    .where(
      and(
        eq(businessTemplates.slug, slug),
        eq(businessTemplates.status, 'published'),
      ),
    )
    .orderBy(sql`${businessTemplates.version} DESC`)
    .limit(1)

  return (row as unknown as BusinessTemplate) ?? null
}

// ─── Materialization ─────────────────────────────────────────────────────────

export async function materializeTemplate(
  orgId: string,
  templateId: string,
): Promise<MaterializeResult> {
  const template = await db
    .select()
    .from(businessTemplates)
    .where(eq(businessTemplates.id, templateId))
    .limit(1)

  if (!template[0]) throw new Error('Template not found')
  if (template[0].status !== 'published') {
    throw new Error('Cannot materialize a template that is not published')
  }

  // Check for existing configuration
  const existingConfig = await db
    .select()
    .from(organizationConfigurations)
    .where(eq(organizationConfigurations.orgId, orgId))
    .limit(1)

  if (existingConfig[0]) {
    throw new Error('Organization already has a configuration')
  }

  const configId = generateId()
  const configSnapshot = template[0].configSnapshot as Record<string, unknown>

  // Create organization configuration
  await db.insert(organizationConfigurations).values({
    id: configId,
    orgId,
    sourceTemplateId: templateId,
    sourceTemplateVersion: template[0].version,
    status: 'active' as const,
    lineage: [
      {
        templateId,
        templateVersion: template[0].version,
        importedAt: new Date().toISOString(),
      },
    ],
  })

  let elementsCreated = 0

  // Materialize products
  const products =
    (configSnapshot.products as Array<Record<string, unknown>>) ?? []
  for (const product of products) {
    const key = product.key as string | undefined
    if (!key) continue
    await db.insert(configurationElements).values({
      id: generateId(),
      orgId,
      configId,
      elementType: 'product' as const,
      elementKey: key,
      provenance: 'inherited' as const,
      sourceTemplateId: templateId,
      sourceTemplateVersion: template[0].version,
      data: product,
    })
    elementsCreated++
  }

  // Materialize workflow stages
  const stages =
    (configSnapshot.workflowStages as Array<Record<string, unknown>>) ?? []
  for (const stage of stages) {
    const key = stage.key as string | undefined
    if (!key) continue
    await db.insert(configurationElements).values({
      id: generateId(),
      orgId,
      configId,
      elementType: 'workflow_stage' as const,
      elementKey: key,
      provenance: 'inherited' as const,
      sourceTemplateId: templateId,
      sourceTemplateVersion: template[0].version,
      data: stage,
    })
    elementsCreated++
  }

  // Materialize materials
  const materials =
    (configSnapshot.materials as Array<Record<string, unknown>>) ?? []
  for (const material of materials) {
    const key = material.key as string | undefined
    if (!key) continue
    await db.insert(configurationElements).values({
      id: generateId(),
      orgId,
      configId,
      elementType: 'material' as const,
      elementKey: key,
      provenance: 'inherited' as const,
      sourceTemplateId: templateId,
      sourceTemplateVersion: template[0].version,
      data: material,
    })
    elementsCreated++
  }

  // Materialize documents
  const documents =
    (configSnapshot.documents as Array<Record<string, unknown>>) ?? []
  for (const doc of documents) {
    const key = doc.key as string | undefined
    if (!key) continue
    await db.insert(configurationElements).values({
      id: generateId(),
      orgId,
      configId,
      elementType: 'document' as const,
      elementKey: key,
      provenance: 'inherited' as const,
      sourceTemplateId: templateId,
      sourceTemplateVersion: template[0].version,
      data: doc,
    })
    elementsCreated++
  }

  // Materialize regional defaults
  const regionalDefaults = configSnapshot.regionalDefaults as
    | Record<string, unknown>
    | undefined
  if (regionalDefaults) {
    await db.insert(configurationElements).values({
      id: generateId(),
      orgId,
      configId,
      elementType: 'regional_setting' as const,
      elementKey: 'defaults',
      provenance: 'inherited' as const,
      sourceTemplateId: templateId,
      sourceTemplateVersion: template[0].version,
      data: regionalDefaults,
    })
    elementsCreated++
  }

  // Materialize fulfillment defaults
  const fulfillmentDefaults = configSnapshot.fulfillmentDefaults as
    | Record<string, unknown>
    | undefined
  if (fulfillmentDefaults) {
    await db.insert(configurationElements).values({
      id: generateId(),
      orgId,
      configId,
      elementType: 'fulfillment_default' as const,
      elementKey: 'defaults',
      provenance: 'inherited' as const,
      sourceTemplateId: templateId,
      sourceTemplateVersion: template[0].version,
      data: fulfillmentDefaults,
    })
    elementsCreated++
  }

  // Materialize pricing config
  const pricingConfig = configSnapshot.pricingConfig as
    | Record<string, unknown>
    | undefined
  if (pricingConfig) {
    await db.insert(configurationElements).values({
      id: generateId(),
      orgId,
      configId,
      elementType: 'pricing_rule' as const,
      elementKey: 'defaults',
      provenance: 'inherited' as const,
      sourceTemplateId: templateId,
      sourceTemplateVersion: template[0].version,
      data: pricingConfig,
    })
    elementsCreated++
  }

  return { ok: true, configId, elementsCreated }
}

// ─── Configuration Management ────────────────────────────────────────────────

export async function getOrganizationConfiguration(
  orgId: string,
): Promise<OrganizationConfiguration | null> {
  const [row] = await db
    .select()
    .from(organizationConfigurations)
    .where(eq(organizationConfigurations.orgId, orgId))
    .limit(1)

  return (row as unknown as OrganizationConfiguration) ?? null
}

export async function listConfigurationElements(
  orgId: string,
  filters?: {
    elementType?: ConfigurationElementType
    provenance?: ConfigurationProvenance
  },
): Promise<ConfigurationElement[]> {
  const conditions = [eq(configurationElements.orgId, orgId)]

  if (filters?.elementType) {
    conditions.push(eq(configurationElements.elementType, filters.elementType))
  }
  if (filters?.provenance) {
    conditions.push(eq(configurationElements.provenance, filters.provenance))
  }

  const rows = await db
    .select()
    .from(configurationElements)
    .where(and(...conditions))
    .orderBy(
      configurationElements.elementType,
      configurationElements.elementKey,
    )

  return rows as unknown as ConfigurationElement[]
}

export async function getConfigurationElement(
  orgId: string,
  elementType: ConfigurationElementType,
  elementKey: string,
): Promise<ConfigurationElement | null> {
  const [row] = await db
    .select()
    .from(configurationElements)
    .where(
      and(
        eq(configurationElements.orgId, orgId),
        eq(configurationElements.elementType, elementType),
        eq(configurationElements.elementKey, elementKey),
      ),
    )
    .limit(1)

  return (row as unknown as ConfigurationElement) ?? null
}

export async function updateConfigurationElement(
  orgId: string,
  elementType: ConfigurationElementType,
  elementKey: string,
  data: object,
): Promise<ConfigurationElement> {
  const existing = await getConfigurationElement(orgId, elementType, elementKey)
  if (!existing) throw new Error('Configuration element not found')

  // Preserve original data on first customization
  const originalData: object | null =
    existing.provenance === 'inherited'
      ? (existing.originalData ?? existing.data)
      : existing.originalData

  const newProvenance: ConfigurationProvenance =
    existing.provenance === 'organization_added'
      ? 'organization_added'
      : 'customized'

  const [updated] = await db
    .update(configurationElements)
    .set({
      data: data as unknown as Record<string, unknown>,
      provenance: newProvenance,
      originalData: originalData as unknown as Record<string, unknown> | null,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(configurationElements.orgId, orgId),
        eq(configurationElements.elementType, elementType),
        eq(configurationElements.elementKey, elementKey),
      ),
    )
    .returning()

  if (!updated) throw new Error('Failed to update configuration element')
  return updated as unknown as ConfigurationElement
}

export async function addConfigurationElement(
  orgId: string,
  configId: string,
  elementType: ConfigurationElementType,
  elementKey: string,
  data: object,
): Promise<ConfigurationElement> {
  const id = generateId()

  const [row] = await db
    .insert(configurationElements)
    .values({
      id,
      orgId,
      configId,
      elementType,
      elementKey,
      provenance: 'organization_added' as const,
      data: data as unknown as Record<string, unknown>,
    })
    .returning()

  if (!row) throw new Error('Failed to add configuration element')
  return row as unknown as ConfigurationElement
}
export async function deleteConfigurationElement(
  orgId: string,
  elementType: ConfigurationElementType,
  elementKey: string,
): Promise<void> {
  await db
    .delete(configurationElements)
    .where(
      and(
        eq(configurationElements.orgId, orgId),
        eq(configurationElements.elementType, elementType),
        eq(configurationElements.elementKey, elementKey),
      ),
    )
}

// ─── Upgrade Proposals ───────────────────────────────────────────────────────

function compareConfigElements(
  sourceSnapshot: object,
  targetSnapshot: object,
  existingOrgElements: ConfigurationElement[],
): UpgradePreview {
  const sourceMap = new Map<
    string,
    { type: string; key: string; data: object }
  >()
  const targetMap = new Map<
    string,
    { type: string; key: string; data: object }
  >()

  const collectionKeys = [
    { configKey: 'products', elementType: 'product' },
    { configKey: 'workflowStages', elementType: 'workflow_stage' },
    { configKey: 'materials', elementType: 'material' },
    { configKey: 'documents', elementType: 'document' },
  ] as const

  for (const { configKey, elementType } of collectionKeys) {
    const snapshot = sourceSnapshot as Record<string, unknown>
    const targetSnap = targetSnapshot as Record<string, unknown>
    const sourceItems =
      (snapshot[configKey] as Array<Record<string, unknown>>) ?? []
    const targetItems =
      (targetSnap[configKey] as Array<Record<string, unknown>>) ?? []

    for (const item of sourceItems) {
      if (item.key) {
        sourceMap.set(`${elementType}:${item.key as string}`, {
          type: elementType,
          key: item.key as string,
          data: item as unknown as object,
        })
      }
    }
    for (const item of targetItems) {
      if (item.key) {
        targetMap.set(`${elementType}:${item.key as string}`, {
          type: elementType,
          key: item.key as string,
          data: item as unknown as object,
        })
      }
    }
  }

  // Scalar config sections (regional, fulfillment, pricing)
  const scalarSections = [
    { configKey: 'regionalDefaults', elementType: 'regional_setting' },
    {
      configKey: 'fulfillmentDefaults',
      elementType: 'fulfillment_default',
    },
    { configKey: 'pricingConfig', elementType: 'pricing_rule' },
  ] as const

  for (const { configKey, elementType } of scalarSections) {
    const snapshot = sourceSnapshot as Record<string, unknown>
    const targetSnap = targetSnapshot as Record<string, unknown>
    const sourceItem = snapshot[configKey] as
      | Record<string, unknown>
      | undefined
    const targetItem = targetSnap[configKey] as
      | Record<string, unknown>
      | undefined
    if (sourceItem) {
      sourceMap.set(`${elementType}:defaults`, {
        type: elementType,
        key: 'defaults',
        data: sourceItem as unknown as object,
      })
    }
    if (targetItem) {
      targetMap.set(`${elementType}:defaults`, {
        type: elementType,
        key: 'defaults',
        data: targetItem as unknown as object,
      })
    }
  }

  // Build org element lookup
  const orgElementMap = new Map<string, ConfigurationElement>()
  for (const el of existingOrgElements) {
    orgElementMap.set(`${el.elementType}:${el.elementKey}`, el)
  }

  const result: UpgradePreview = {
    unchanged: [],
    additions: [],
    removals: [],
    conflicts: [],
    semanticChanges: [],
  }

  // Find additions (in target but not source)
  for (const [mapKey, targetItem] of targetMap) {
    if (!sourceMap.has(mapKey)) {
      result.additions.push({
        elementType: targetItem.type,
        elementKey: targetItem.key,
        data: targetItem.data,
      })
    }
  }

  // Find removals (in source but not target)
  for (const [mapKey, sourceItem] of sourceMap) {
    if (!targetMap.has(mapKey)) {
      result.removals.push({
        elementType: sourceItem.type,
        elementKey: sourceItem.key,
        data: sourceItem.data,
      })
    }
  }

  // Classify common elements
  for (const [mapKey, targetItem] of targetMap) {
    const sourceItem = sourceMap.get(mapKey)
    if (!sourceItem) continue // Already handled as addition

    const orgEl = orgElementMap.get(mapKey)

    // If org customized this element, it's a conflict
    if (orgEl && orgEl.provenance === 'customized') {
      result.conflicts.push({
        elementType: targetItem.type,
        elementKey: targetItem.key,
        currentData: orgEl.data,
        proposedData: targetItem.data,
        provenance: 'customized',
      })
      continue
    }

    // If data is semantically different, flag for review
    const sourceJson = JSON.stringify(sourceItem.data)
    const targetJson = JSON.stringify(targetItem.data)
    if (sourceJson !== targetJson) {
      result.semanticChanges.push({
        elementType: targetItem.type,
        elementKey: targetItem.key,
        currentData: sourceItem.data,
        proposedData: targetItem.data,
        provenance: orgEl?.provenance ?? 'inherited',
      })
      continue
    }

    // Unchanged
    result.unchanged.push({
      elementType: targetItem.type,
      elementKey: targetItem.key,
      data: targetItem.data,
    })
  }

  return result
}

export async function createUpgradeProposal(
  orgId: string,
  targetTemplateId: string,
): Promise<UpgradeProposal> {
  // Get org configuration
  const config = await getOrganizationConfiguration(orgId)
  if (!config) throw new Error('Organization has no configuration')

  // Get source template
  const sourceTemplate = await getTemplate(config.sourceTemplateId)
  if (!sourceTemplate) throw new Error('Source template not found')

  // Get target template
  const targetTemplate = await getTemplate(targetTemplateId)
  if (!targetTemplate) throw new Error('Target template not found')

  if (targetTemplate.status !== 'published') {
    throw new Error('Target template must be published')
  }

  // Check idempotency: if an applied proposal already exists for this source→target
  const existingApplied = await db
    .select()
    .from(templateUpgradeProposals)
    .where(
      and(
        eq(templateUpgradeProposals.orgId, orgId),
        eq(templateUpgradeProposals.targetTemplateId, targetTemplateId),
        eq(
          templateUpgradeProposals.targetTemplateVersion,
          targetTemplate.version,
        ),
        or(
          eq(templateUpgradeProposals.status, 'applied'),
          and(
            eq(
              templateUpgradeProposals.sourceTemplateId,
              config.sourceTemplateId,
            ),
            or(
              eq(templateUpgradeProposals.status, 'pending_review'),
              eq(templateUpgradeProposals.status, 'accepted'),
            ),
          ),
        ),
      ),
    )
    .limit(1)
  if (existingApplied[0]) {
    return existingApplied[0] as unknown as UpgradeProposal
  }

  // Get existing org elements
  const orgElements = await listConfigurationElements(orgId)

  // Compute preview
  const preview = compareConfigElements(
    sourceTemplate.configSnapshot,
    targetTemplate.configSnapshot,
    orgElements,
  )

  const id = generateId()
  const [row] = await db
    .insert(templateUpgradeProposals)
    .values({
      id,
      orgId,
      sourceTemplateId: config.sourceTemplateId,
      sourceTemplateVersion: config.sourceTemplateVersion,
      targetTemplateId,
      targetTemplateVersion: targetTemplate.version,
      status: 'pending_review' as const,
      preview: preview as unknown as Record<string, unknown>,
      conflicts: preview.conflicts as unknown as Array<Record<string, unknown>>,
      additions: preview.additions as unknown as Array<Record<string, unknown>>,
      removals: preview.removals as unknown as Array<Record<string, unknown>>,
      semanticChanges: preview.semanticChanges as unknown as Array<
        Record<string, unknown>
      >,
    })
    .returning()

  if (!row) throw new Error('Failed to create upgrade proposal')
  return row as unknown as UpgradeProposal
}

export async function getUpgradeProposal(
  id: string,
): Promise<UpgradeProposal | null> {
  const [row] = await db
    .select()
    .from(templateUpgradeProposals)
    .where(eq(templateUpgradeProposals.id, id))
    .limit(1)

  return (row as unknown as UpgradeProposal) ?? null
}

export async function acceptUpgradeProposal(
  id: string,
): Promise<UpgradeProposal> {
  const proposal = await getUpgradeProposal(id)
  if (!proposal) throw new Error('Proposal not found')

  if (proposal.status !== 'pending_review') {
    throw new Error(`Cannot accept proposal with status "${proposal.status}"`)
  }

  const preview = proposal.preview as unknown as UpgradePreview
  const config = await getOrganizationConfiguration(proposal.orgId)
  if (!config) throw new Error('Organization configuration not found')

  // Apply additions
  for (const addition of preview.additions) {
    // Check if already exists (idempotency)
    const existing = await getConfigurationElement(
      proposal.orgId,
      addition.elementType as ConfigurationElementType,
      addition.elementKey,
    )
    if (!existing) {
      await addConfigurationElement(
        proposal.orgId,
        config.id,
        addition.elementType as ConfigurationElementType,
        addition.elementKey,
        addition.data,
      )
    }
  }

  // Apply semantic changes to inherited elements (only if not customized)
  for (const change of preview.semanticChanges) {
    if (change.provenance !== 'customized') {
      const existing = await getConfigurationElement(
        proposal.orgId,
        change.elementType as ConfigurationElementType,
        change.elementKey,
      )
      if (existing && existing.provenance === 'inherited') {
        await db
          .update(configurationElements)
          .set({
            data: change.proposedData as Record<string, unknown>,
            sourceTemplateVersion: proposal.targetTemplateVersion,
            updatedAt: sql`now()`,
          })
          .where(eq(configurationElements.id, existing.id))
      }
    }
  }

  // Update config lineage and source
  await db
    .update(organizationConfigurations)
    .set({
      sourceTemplateId: proposal.targetTemplateId,
      sourceTemplateVersion: proposal.targetTemplateVersion,
      lineage: [
        ...config.lineage,
        {
          templateId: proposal.targetTemplateId,
          templateVersion: proposal.targetTemplateVersion,
          importedAt: new Date().toISOString(),
        },
      ],
      updatedAt: sql`now()`,
    })
    .where(eq(organizationConfigurations.id, config.id))

  // Mark proposal as applied
  const [updated] = await db
    .update(templateUpgradeProposals)
    .set({
      status: 'applied' as const,
      appliedAt: sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(eq(templateUpgradeProposals.id, id))
    .returning()

  if (!updated) throw new Error('Failed to apply upgrade')
  return updated as unknown as UpgradeProposal
}

export async function rejectUpgradeProposal(
  id: string,
): Promise<UpgradeProposal> {
  const proposal = await getUpgradeProposal(id)
  if (!proposal) throw new Error('Proposal not found')

  if (proposal.status !== 'pending_review') {
    throw new Error(`Cannot reject proposal with status "${proposal.status}"`)
  }

  const [updated] = await db
    .update(templateUpgradeProposals)
    .set({
      status: 'rejected' as const,
      rejectedAt: sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(eq(templateUpgradeProposals.id, id))
    .returning()

  if (!updated) throw new Error('Failed to reject proposal')
  return updated as unknown as UpgradeProposal
}

export async function listUpgradeProposals(
  orgId: string,
): Promise<UpgradeProposal[]> {
  const rows = await db
    .select()
    .from(templateUpgradeProposals)
    .where(eq(templateUpgradeProposals.orgId, orgId))
    .orderBy(sql`${templateUpgradeProposals.createdAt} DESC`)

  return rows as unknown as UpgradeProposal[]
}

// ─── Capability Import ───────────────────────────────────────────────────────

export async function importCapability(
  orgId: string,
  sourceTemplateId: string,
  elementKey: string,
): Promise<ConfigurationElement> {
  const config = await getOrganizationConfiguration(orgId)
  if (!config) throw new Error('Organization has no configuration')

  const sourceTemplate = await getTemplate(sourceTemplateId)
  if (!sourceTemplate) throw new Error('Source template not found')

  const snapshot =
    sourceTemplate.configSnapshot as unknown as TemplateSeedConfig

  // Search for the capability in template's config snapshot
  let foundData: Record<string, unknown> | null = null
  let foundElementType: ConfigurationElementType | null = null

  // Search products
  for (const product of snapshot.products ?? []) {
    if (product.key === elementKey) {
      foundData = product as unknown as Record<string, unknown>
      foundElementType = 'product'
      break
    }
  }

  // Search workflow stages
  if (!foundData) {
    for (const stage of snapshot.workflowStages ?? []) {
      if (stage.key === elementKey) {
        foundData = stage as unknown as Record<string, unknown>
        foundElementType = 'workflow_stage'
        break
      }
    }
  }

  // Search materials
  if (!foundData) {
    for (const material of snapshot.materials ?? []) {
      if (material.key === elementKey) {
        foundData = material as unknown as Record<string, unknown>
        foundElementType = 'material'
        break
      }
    }
  }

  // Search documents
  if (!foundData) {
    for (const doc of snapshot.documents ?? []) {
      if (doc.key === elementKey) {
        foundData = doc as unknown as Record<string, unknown>
        foundElementType = 'document'
        break
      }
    }
  }

  if (!foundData || !foundElementType) {
    throw new Error(`Capability "${elementKey}" not found in template`)
  }

  // Check if element already exists
  const existing = await getConfigurationElement(
    orgId,
    foundElementType,
    elementKey,
  )
  if (existing) {
    throw new Error(
      `Configuration element "${foundElementType}:${elementKey}" already exists`,
    )
  }

  // Record the capability import in lineage
  await db
    .update(organizationConfigurations)
    .set({
      lineage: [
        ...config.lineage,
        {
          templateId: sourceTemplateId,
          templateVersion: sourceTemplate.version,
          importedAt: new Date().toISOString(),
        },
      ],
      updatedAt: sql`now()`,
    })
    .where(eq(organizationConfigurations.id, config.id))

  return addConfigurationElement(
    orgId,
    config.id,
    foundElementType,
    elementKey,
    foundData,
  )
}
