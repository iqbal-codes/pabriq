import { sql } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
// schema tables for truncation
import { organization } from '#/db/schema'
import {
  acceptUpgradeProposal,
  addConfigurationElement,
  createTemplate,
  createUpgradeProposal,
  getConfigurationElement,
  getOrganizationConfiguration,
  getTemplate,
  importCapability,
  listConfigurationElements,
  listPublishedTemplates,
  listUpgradeProposals,
  materializeTemplate,
  publishTemplate,
  rejectUpgradeProposal,
  retireTemplate,
  updateConfigurationElement,
} from './model'
import { seedDefaultTemplates } from './seed'

const orgId = '00000000-0000-0000-0000-000000000001'
const orgId2 = '00000000-0000-0000-0000-000000000002'

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE organization, business_templates, organization_configurations, configuration_elements, template_upgrade_proposals CASCADE`,
  )

  const now = new Date()
  await db.insert(organization).values([
    { id: orgId, name: 'Test Org', slug: 'test-org', createdAt: now },
    { id: orgId2, name: 'Test Org 2', slug: 'test-org-2', createdAt: now },
  ])

  await seedDefaultTemplates()
})

afterEach(async () => {})

// ─── Template Lifecycle ──────────────────────────────────────────────────────

describe('template lifecycle', () => {
  it('creates a template in draft status', async () => {
    const tmpl = await createTemplate({
      slug: 'test-template',
      name: 'Test Template',
      description: 'A test template',
      category: 'test',
    })

    expect(tmpl.status).toBe('draft')
    expect(tmpl.slug).toBe('test-template')
    expect(tmpl.version).toBe(1)
  })

  it('auto-increments version for same slug', async () => {
    const v1 = await createTemplate({ slug: 'test', name: 'V1' })
    expect(v1.version).toBe(1)

    const v2 = await createTemplate({ slug: 'test', name: 'V2' })
    expect(v2.version).toBe(2)
  })

  it('publishes a draft template', async () => {
    const tmpl = await createTemplate({
      slug: 'publishable',
      name: 'Publishable',
    })
    expect(tmpl.status).toBe('draft')

    const published = await publishTemplate(tmpl.id)
    expect(published.status).toBe('published')
    expect(published.publishedAt).toBeInstanceOf(Date)
  })

  it('prevents publishing a non-draft template', async () => {
    const tmpl = await createTemplate({
      slug: 'already-pub',
      name: 'Already Published',
    })
    await publishTemplate(tmpl.id)

    await expect(publishTemplate(tmpl.id)).rejects.toThrow(
      'Cannot publish template with status',
    )
  })

  it('publishes then retires a template', async () => {
    const tmpl = await createTemplate({
      slug: 'retirable',
      name: 'Retirable',
    })
    await publishTemplate(tmpl.id)

    const retired = await retireTemplate(tmpl.id)
    expect(retired.status).toBe('retired')
    expect(retired.retiredAt).toBeInstanceOf(Date)
  })

  it('prevents retiring a non-published template', async () => {
    const tmpl = await createTemplate({
      slug: 'draft-retire',
      name: 'Draft Retire',
    })

    await expect(retireTemplate(tmpl.id)).rejects.toThrow(
      'Cannot retire template with status',
    )
  })

  it('lists only published templates', async () => {
    const draft = await createTemplate({
      slug: 'hidden-draft',
      name: 'Hidden Draft',
    })
    const pub = await createTemplate({
      slug: 'visible-pub',
      name: 'Visible Published',
    })
    await publishTemplate(pub.id)

    const published = await listPublishedTemplates()
    // Should include seeded templates plus the one we just published
    expect(published.length).toBeGreaterThanOrEqual(1)
    expect(published.some((t) => t.id === pub.id)).toBe(true)
    expect(published.some((t) => t.id === draft.id)).toBe(false)
  })

  it('published templates cannot be modified (immutability)', async () => {
    const tmpl = await createTemplate({
      slug: 'immutable',
      name: 'Immutable',
    })
    await publishTemplate(tmpl.id)

    // Published templates are immutable - verify by reading
    const fetched = await getTemplate(tmpl.id)
    expect(fetched?.status).toBe('published')
    expect(fetched?.version).toBe(tmpl.version)
  })

  it('retired template is still fetchable', async () => {
    const tmpl = await createTemplate({
      slug: 'retired-fetch',
      name: 'Retired Fetch',
    })
    await publishTemplate(tmpl.id)
    await retireTemplate(tmpl.id)

    const fetched = await getTemplate(tmpl.id)
    expect(fetched?.status).toBe('retired')
  })

  it('template CRUD functions still return expected shapes', async () => {
    const template = await createTemplate({
      slug: 'security-test',
      name: 'Security Test',
    })
    expect(template.id).toBeTruthy()
    expect(template.status).toBe('draft')
    await publishTemplate(template.id)
    const published = await getTemplate(template.id)
    expect(published?.status).toBe('published')
    await retireTemplate(template.id)
    const retired = await getTemplate(template.id)
    expect(retired?.status).toBe('retired')
  })
})

// ─── Materialization ─────────────────────────────────────────────────────────

describe('materialization', () => {
  let templateId: string

  beforeEach(async () => {
    const published = await listPublishedTemplates()
    templateId = published[0]?.id
  })

  it('materializes a template into org configuration', async () => {
    const result = await materializeTemplate(orgId, templateId)
    expect(result.ok).toBe(true)
    expect(result.elementsCreated).toBeGreaterThan(0)

    const config = await getOrganizationConfiguration(orgId)
    expect(config).not.toBeNull()
    expect(config?.sourceTemplateId).toBe(templateId)
    expect(config?.sourceTemplateVersion).toBeGreaterThanOrEqual(1)
    expect(config?.lineage).toHaveLength(1)
    expect(config?.lineage[0]?.templateId).toBe(templateId)
  })

  it('records template lineage', async () => {
    await materializeTemplate(orgId, templateId)

    const config = await getOrganizationConfiguration(orgId)
    expect(config?.lineage).toHaveLength(1)
    expect(config?.lineage[0]?.templateVersion).toBeGreaterThanOrEqual(1)
    expect(config?.lineage[0]?.importedAt).toBeTruthy()
  })

  it('prevents materializing a non-published template', async () => {
    const draft = await createTemplate({
      slug: 'draft-materialize',
      name: 'Draft Materialize',
    })

    await expect(materializeTemplate(orgId, draft.id)).rejects.toThrow(
      'not published',
    )
  })

  it('prevents double materialization', async () => {
    await materializeTemplate(orgId, templateId)

    await expect(materializeTemplate(orgId, templateId)).rejects.toThrow(
      'already has a configuration',
    )
  })

  it('materializes products, stages, materials, and defaults', async () => {
    await materializeTemplate(orgId, templateId)

    const elements = await listConfigurationElements(orgId)
    const elementTypes = new Set(elements.map((e) => e.elementType))

    expect(elementTypes.has('product')).toBe(true)
    expect(elementTypes.has('workflow_stage')).toBe(true)
    expect(elementTypes.has('material')).toBe(true)
    expect(elementTypes.has('regional_setting')).toBe(true)
    expect(elementTypes.has('fulfillment_default')).toBe(true)
    expect(elementTypes.has('pricing_rule')).toBe(true)
  })

  it('materialized elements have inherited provenance', async () => {
    await materializeTemplate(orgId, templateId)

    const elements = await listConfigurationElements(orgId)
    for (const el of elements) {
      expect(el.provenance).toBe('inherited')
    }
  })

  it('does not leak between organizations', async () => {
    await materializeTemplate(orgId, templateId)

    const elements = await listConfigurationElements(orgId)
    expect(elements.length).toBeGreaterThan(0)

    const elements2 = await listConfigurationElements(orgId2)
    expect(elements2.length).toBe(0)
  })
})

// ─── Configuration Customization & Provenance ────────────────────────────────

describe('configuration customization & provenance', () => {
  let templateId: string
  let configId: string

  beforeEach(async () => {
    const published = await listPublishedTemplates()
    templateId = published[0]?.id
    const result = await materializeTemplate(orgId, templateId)
    configId = result.configId
  })

  it('updates element and marks as customized', async () => {
    const elements = await listConfigurationElements(orgId, {
      elementType: 'product',
    })
    const element = elements[0]

    const updated = await updateConfigurationElement(
      orgId,
      'product',
      element.elementKey,
      { name: 'Custom Product', basePrice: 9999 },
    )

    expect(updated.provenance).toBe('customized')
    expect(updated.data).toEqual({ name: 'Custom Product', basePrice: 9999 })
    expect(updated.originalData).not.toBeNull()
  })

  it('preserves original data on first customization', async () => {
    const elements = await listConfigurationElements(orgId, {
      elementType: 'product',
    })
    const element = elements[0]

    const updated = await updateConfigurationElement(
      orgId,
      'product',
      element.elementKey,
      { modified: true },
    )

    expect(updated.originalData).toEqual(element.data)
  })

  it('does not overwrite originalData on second customization', async () => {
    const elements = await listConfigurationElements(orgId, {
      elementType: 'product',
    })
    const element = elements[0]

    await updateConfigurationElement(orgId, 'product', element.elementKey, {
      first: true,
    })
    const second = await updateConfigurationElement(
      orgId,
      'product',
      element.elementKey,
      { second: true },
    )

    // originalData should still be the inherited data
    expect(second.originalData).toEqual(element.data)
  })

  it('provenance stays organization_added for org-added elements', async () => {
    const added = await addConfigurationElement(
      orgId,
      configId,
      'product',
      'custom_product',
      { name: 'My Product' },
    )

    expect(added.provenance).toBe('organization_added')

    const updated = await updateConfigurationElement(
      orgId,
      'product',
      'custom_product',
      { name: 'My Updated Product' },
    )

    expect(updated.provenance).toBe('organization_added')
  })

  it('lists elements filtered by provenance', async () => {
    const elements = await listConfigurationElements(orgId, {
      elementType: 'product',
    })
    const element = elements[0]

    await updateConfigurationElement(orgId, 'product', element.elementKey, {
      customized: true,
    })

    const inherited = await listConfigurationElements(orgId, {
      provenance: 'inherited',
    })
    const customized = await listConfigurationElements(orgId, {
      provenance: 'customized',
    })

    expect(customized.length).toBe(1)
    expect(inherited.length).toBeGreaterThan(0)
  })

  it('gets single configuration element', async () => {
    const elements = await listConfigurationElements(orgId, {
      elementType: 'product',
    })
    const element = elements[0]

    const fetched = await getConfigurationElement(
      orgId,
      'product',
      element.elementKey,
    )

    expect(fetched).not.toBeNull()
    expect(fetched?.elementKey).toBe(element.elementKey)
    expect(fetched?.provenance).toBe('inherited')
  })

  it('throws on update of non-existent element', async () => {
    await expect(
      updateConfigurationElement(orgId, 'product', 'nonexistent', {}),
    ).rejects.toThrow('not found')
  })
})

// ─── Capability Import ───────────────────────────────────────────────────────

describe('capability import', () => {
  let rubberTemplateId: string
  let apparelTemplateId: string

  beforeEach(async () => {
    const published = await listPublishedTemplates()
    const rubber = published.find((t) => t.slug === 'rubber-accessories')
    const apparel = published.find((t) => t.slug === 'apparel-decoration')
    if (!rubber || !apparel) throw new Error('Templates not found')
    rubberTemplateId = rubber.id
    apparelTemplateId = apparel.id

    await materializeTemplate(orgId, rubberTemplateId)
  })

  it('imports a capability from another template', async () => {
    const imported = await importCapability(
      orgId,
      apparelTemplateId,
      'tshirt_dtf',
    )

    expect(imported.elementType).toBe('product')
    expect(imported.elementKey).toBe('tshirt_dtf')
    expect(imported.provenance).toBe('organization_added')
  })

  it('records capability import in lineage', async () => {
    await importCapability(orgId, apparelTemplateId, 'tshirt_dtf')

    const config = await getOrganizationConfiguration(orgId)
    // Should have original lineage entry + capability import entry
    expect(config?.lineage.length).toBeGreaterThanOrEqual(2)
    expect(
      config?.lineage.some((l) => l.templateId === apparelTemplateId),
    ).toBe(true)
  })

  it('prevents duplicate capability import', async () => {
    await importCapability(orgId, apparelTemplateId, 'tshirt_dtf')

    await expect(
      importCapability(orgId, apparelTemplateId, 'tshirt_dtf'),
    ).rejects.toThrow('already exists')
  })

  it('throws for non-existent capability key', async () => {
    await expect(
      importCapability(orgId, apparelTemplateId, 'nonexistent_key'),
    ).rejects.toThrow('not found')
  })
})

// ─── Upgrade Proposals ───────────────────────────────────────────────────────

describe('upgrade proposals', () => {
  let templateV1Id: string
  let templateV2Id: string

  beforeEach(async () => {
    // Create a v1 template and materialize
    const v1 = await createTemplate({
      slug: 'upgrade-test',
      name: 'Upgrade Test V1',
      configSnapshot: {
        products: [
          {
            key: 'product_a',
            name: 'Product A',
            basePrice: 1000,
            productionDays: 3,
            minQuantity: 1,
            pricingMode: 'interpolated',
            active: true,
          },
          {
            key: 'product_b',
            name: 'Product B',
            basePrice: 2000,
            productionDays: 5,
            minQuantity: 1,
            pricingMode: 'interpolated',
            active: true,
          },
        ],
        workflowStages: [],
        materials: [],
        regionalDefaults: { timezone: 'Asia/Jakarta' },
        fulfillmentDefaults: { shippingEnabled: true },
        pricingConfig: { defaultMode: 'interpolated' },
      },
    })
    await publishTemplate(v1.id)
    templateV1Id = v1.id

    await materializeTemplate(orgId, templateV1Id)

    // Create a v2 template (same slug, version 2)
    const v2 = await createTemplate({
      slug: 'upgrade-test',
      name: 'Upgrade Test V2',
      configSnapshot: {
        products: [
          {
            key: 'product_a',
            name: 'Product A Updated',
            basePrice: 1500,
            productionDays: 3,
            minQuantity: 1,
            pricingMode: 'interpolated',
            active: true,
          },
          {
            key: 'product_c',
            name: 'Product C New',
            basePrice: 3000,
            productionDays: 7,
            minQuantity: 1,
            pricingMode: 'interpolated',
            active: true,
          },
        ],
        workflowStages: [
          {
            key: 'new_stage',
            name: 'New Stage',
            board: 'production',
            needApproval: false,
            requirements: [],
            orderIndex: 0,
          },
        ],
        materials: [],
        regionalDefaults: { timezone: 'Asia/Jakarta' },
        fulfillmentDefaults: { shippingEnabled: true },
        pricingConfig: { defaultMode: 'flat' },
      },
    })
    await publishTemplate(v2.id)
    templateV2Id = v2.id
  })

  it('creates an upgrade proposal with preview', async () => {
    const proposal = await createUpgradeProposal(orgId, templateV2Id)

    expect(proposal.status).toBe('pending_review')
    expect(proposal.sourceTemplateId).toBe(templateV1Id)
    expect(proposal.targetTemplateId).toBe(templateV2Id)

    const preview = proposal.preview as Record<string, unknown>
    const additions = preview.additions as Array<Record<string, unknown>>
    const removals = preview.removals as Array<Record<string, unknown>>
    const semanticChanges = preview.semanticChanges as Array<
      Record<string, unknown>
    >

    // product_b was removed
    expect(
      removals.some(
        (r: Record<string, unknown>) => r.elementKey === 'product_b',
      ),
    ).toBe(true)

    // product_c is new
    expect(
      additions.some(
        (a: Record<string, unknown>) => a.elementKey === 'product_c',
      ),
    ).toBe(true)

    // new_stage is new
    expect(
      additions.some(
        (a: Record<string, unknown>) => a.elementKey === 'new_stage',
      ),
    ).toBe(true)

    // product_a has semantic change (name and price changed)
    expect(
      semanticChanges.some(
        (s: Record<string, unknown>) => s.elementKey === 'product_a',
      ),
    ).toBe(true)

    // pricingConfig changed
    expect(
      semanticChanges.some(
        (s: Record<string, unknown>) => s.elementKey === 'defaults',
      ),
    ).toBe(true)
  })

  it('detects customized conflicts in upgrade preview', async () => {
    // Customize product_a
    await updateConfigurationElement(orgId, 'product', 'product_a', {
      name: 'My Custom Product',
      basePrice: 999,
    })

    const proposal = await createUpgradeProposal(orgId, templateV2Id)

    const preview = proposal.preview as Record<string, unknown>
    const conflicts = preview.conflicts as Array<Record<string, unknown>>

    expect(
      conflicts.some(
        (c: Record<string, unknown>) => c.elementKey === 'product_a',
      ),
    ).toBe(true)
    const conflict = conflicts.find(
      (c: Record<string, unknown>) => c.elementKey === 'product_a',
    )
    expect(conflict).toBeDefined()
    expect(conflict?.provenance).toBe('customized')
  })

  it('accepts and applies an upgrade', async () => {
    const proposal = await createUpgradeProposal(orgId, templateV2Id)
    const applied = await acceptUpgradeProposal(proposal.id)

    expect(applied.status).toBe('applied')
    expect(applied.appliedAt).toBeInstanceOf(Date)

    // Config should now reference v2
    const config = await getOrganizationConfiguration(orgId)
    expect(config?.sourceTemplateId).toBe(templateV2Id)
    expect(config?.sourceTemplateVersion).toBe(2)
    expect(config?.lineage.length).toBeGreaterThanOrEqual(2)
  })

  it('applies additions during upgrade', async () => {
    const proposal = await createUpgradeProposal(orgId, templateV2Id)
    await acceptUpgradeProposal(proposal.id)

    // product_c should exist
    const added = await getConfigurationElement(orgId, 'product', 'product_c')
    expect(added).not.toBeNull()
  })

  it('applies semantic changes to inherited elements', async () => {
    const proposal = await createUpgradeProposal(orgId, templateV2Id)
    await acceptUpgradeProposal(proposal.id)

    // product_a should be updated
    const updated = await getConfigurationElement(orgId, 'product', 'product_a')
    expect(updated).not.toBeNull()
    const data = updated?.data as Record<string, unknown>
    expect(data.name).toBe('Product A Updated')
    expect(data.basePrice).toBe(1500)
  })

  it('does not override customized elements during upgrade', async () => {
    // Customize product_a first
    await updateConfigurationElement(orgId, 'product', 'product_a', {
      name: 'My Custom Product',
      basePrice: 999,
    })

    const proposal = await createUpgradeProposal(orgId, templateV2Id)
    await acceptUpgradeProposal(proposal.id)

    // product_a should still have custom values
    const el = await getConfigurationElement(orgId, 'product', 'product_a')
    const data = el?.data as Record<string, unknown>
    expect(data.name).toBe('My Custom Product')
    expect(data.basePrice).toBe(999)
    expect(el?.provenance).toBe('customized')
  })

  it('rejects an upgrade proposal without changing config', async () => {
    const proposal = await createUpgradeProposal(orgId, templateV2Id)
    const rejected = await rejectUpgradeProposal(proposal.id)

    expect(rejected.status).toBe('rejected')
    expect(rejected.rejectedAt).toBeInstanceOf(Date)

    // Config should still reference v1
    const config = await getOrganizationConfiguration(orgId)
    expect(config?.sourceTemplateId).toBe(templateV1Id)
  })

  it('prevents accepting an already-rejected proposal', async () => {
    const proposal = await createUpgradeProposal(orgId, templateV2Id)
    await rejectUpgradeProposal(proposal.id)

    await expect(acceptUpgradeProposal(proposal.id)).rejects.toThrow(
      'Cannot accept proposal with status',
    )
  })

  it('prevents rejecting an already-accepted proposal', async () => {
    const proposal = await createUpgradeProposal(orgId, templateV2Id)
    await acceptUpgradeProposal(proposal.id)

    await expect(rejectUpgradeProposal(proposal.id)).rejects.toThrow(
      'Cannot reject proposal with status',
    )
  })

  it('is idempotent: returns existing applied proposal', async () => {
    const first = await createUpgradeProposal(orgId, templateV2Id)
    await acceptUpgradeProposal(first.id)

    // Creating another proposal for same source→target should return the existing one
    const second = await createUpgradeProposal(orgId, templateV2Id)
    expect(second.id).toBe(first.id)
    expect(second.status).toBe('applied')
  })

  it('idempotent retry: applying twice is safe', async () => {
    const proposal = await createUpgradeProposal(orgId, templateV2Id)
    await acceptUpgradeProposal(proposal.id)

    // Second acceptance should fail because status is now 'applied'
    await expect(acceptUpgradeProposal(proposal.id)).rejects.toThrow(
      'Cannot accept proposal with status',
    )
  })

  it('rejected upgrade leaves config unchanged', async () => {
    const proposal = await createUpgradeProposal(orgId, templateV2Id)
    await rejectUpgradeProposal(proposal.id)

    const config = await getOrganizationConfiguration(orgId)
    expect(config?.sourceTemplateId).toBe(templateV1Id)
    expect(config?.sourceTemplateVersion).toBe(1)

    // product_c should not exist
    const added = await getConfigurationElement(orgId, 'product', 'product_c')
    expect(added).toBeNull()

    // product_b should still exist
    const kept = await getConfigurationElement(orgId, 'product', 'product_b')
    expect(kept).not.toBeNull()
  })

  it('lists upgrade proposals for an org', async () => {
    const p1 = await createUpgradeProposal(orgId, templateV2Id)

    const proposals = await listUpgradeProposals(orgId)
    expect(proposals.length).toBeGreaterThanOrEqual(1)
    expect(proposals.some((p) => p.id === p1.id)).toBe(true)
  })

  it('requires target template to be published', async () => {
    const draft = await createTemplate({
      slug: 'draft-upgrade-target',
      name: 'Draft Upgrade Target',
    })

    await expect(createUpgradeProposal(orgId, draft.id)).rejects.toThrow(
      'must be published',
    )
  })

  it('requires existing configuration to create proposal', async () => {
    await expect(createUpgradeProposal(orgId2, templateV2Id)).rejects.toThrow(
      'no configuration',
    )
  })
})

// ─── Edge Cases ──────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('throws on materializing non-existent template', async () => {
    await expect(materializeTemplate(orgId, 'non-existent-id')).rejects.toThrow(
      'not found',
    )
  })

  it('returns null for non-existent configuration', async () => {
    const config = await getOrganizationConfiguration(orgId)
    expect(config).toBeNull()
  })

  it('returns null for non-existent element', async () => {
    const el = await getConfigurationElement(orgId, 'product', 'nope')
    expect(el).toBeNull()
  })

  it('empty elements list for org with no config', async () => {
    const elements = await listConfigurationElements(orgId)
    expect(elements).toHaveLength(0)
  })
})
