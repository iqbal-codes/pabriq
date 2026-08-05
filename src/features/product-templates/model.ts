import { and, desc, eq } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  businessTemplates as businessTemplatesTable,
  products as productsTable,
  productTemplates as productTemplatesTable,
} from '#/db/schema'
import {
  type BusinessTemplateConfiguration,
  type ProductTemplateConfiguration,
  validateProductTemplateConfiguration,
} from './config'

export type BusinessTemplate = {
  id: string
  slug: string
  name: string
  description: string | null
  active: boolean
  configuration: BusinessTemplateConfiguration
  createdAt: Date
  updatedAt: Date
}

export type ProductTemplate = {
  id: string
  orgId: string
  businessTemplateId: string | null
  businessTemplateItemKey: string | null
  name: string
  description: string | null
  category: string | null
  status: 'active' | 'archived'
  configuration: ProductTemplateConfiguration
  createdAt: Date
  updatedAt: Date
}

export type CreateProductTemplateInput = {
  orgId: string
  name: string
  description?: string | null
  category?: string | null
  configuration: ProductTemplateConfiguration
  businessTemplateId?: string | null
  businessTemplateItemKey?: string | null
}

export type UpdateProductTemplateInput = {
  id: string
  orgId: string
  name?: string
  description?: string | null
  category?: string | null
  configuration?: ProductTemplateConfiguration
}

function cloneConfiguration(
  configuration: ProductTemplateConfiguration,
): ProductTemplateConfiguration {
  return structuredClone(configuration)
}

function toBusinessTemplate(
  row: typeof businessTemplatesTable.$inferSelect,
): BusinessTemplate {
  return {
    ...row,
    configuration: row.configuration as BusinessTemplateConfiguration,
  }
}

function toProductTemplate(
  row: typeof productTemplatesTable.$inferSelect,
): ProductTemplate {
  if (row.status !== 'active' && row.status !== 'archived') {
    throw new Error('Invalid product template status')
  }
  return {
    ...row,
    status: row.status,
    configuration: row.configuration as ProductTemplateConfiguration,
  }
}

export async function listBusinessTemplates(): Promise<BusinessTemplate[]> {
  const rows = await db
    .select()
    .from(businessTemplatesTable)
    .where(eq(businessTemplatesTable.active, true))
    .orderBy(businessTemplatesTable.name)
  return rows.map(toBusinessTemplate)
}

export async function getBusinessTemplate(
  id: string,
): Promise<BusinessTemplate | null> {
  const rows = await db
    .select()
    .from(businessTemplatesTable)
    .where(
      and(
        eq(businessTemplatesTable.id, id),
        eq(businessTemplatesTable.active, true),
      ),
    )
    .limit(1)
  return rows[0] ? toBusinessTemplate(rows[0]) : null
}

export async function getProductTemplate(
  id: string,
  orgId: string,
): Promise<ProductTemplate | null> {
  const rows = await db
    .select()
    .from(productTemplatesTable)
    .where(
      and(
        eq(productTemplatesTable.id, id),
        eq(productTemplatesTable.orgId, orgId),
      ),
    )
    .limit(1)
  return rows[0] ? toProductTemplate(rows[0]) : null
}

export async function listProductTemplates(
  orgId: string,
): Promise<ProductTemplate[]> {
  const rows = await db
    .select()
    .from(productTemplatesTable)
    .where(eq(productTemplatesTable.orgId, orgId))
    .orderBy(desc(productTemplatesTable.createdAt))
  return rows.map(toProductTemplate)
}

export async function createProductTemplate(
  input: CreateProductTemplateInput,
): Promise<ProductTemplate> {
  const configuration = validateProductTemplateConfiguration(
    input.configuration,
  )
  if (input.businessTemplateId) {
    const businessTemplate = await getBusinessTemplate(input.businessTemplateId)
    if (!businessTemplate) throw new Error('Business template not found')
  }
  const id = crypto.randomUUID()
  const now = new Date()
  await db.insert(productTemplatesTable).values({
    id,
    orgId: input.orgId,
    businessTemplateId: input.businessTemplateId ?? null,
    businessTemplateItemKey: input.businessTemplateItemKey ?? null,
    name: input.name.trim(),
    description: input.description ?? null,
    category: input.category ?? null,
    status: 'active',
    configuration: cloneConfiguration(configuration),
    createdAt: now,
    updatedAt: now,
  })
  const result = await getProductTemplate(id, input.orgId)
  if (!result) throw new Error('Product template was not created')
  return result
}

export async function updateProductTemplate(
  input: UpdateProductTemplateInput,
): Promise<ProductTemplate> {
  const updates: {
    name?: string
    description?: string | null
    category?: string | null
    configuration?: ProductTemplateConfiguration
    updatedAt: Date
  } = { updatedAt: new Date() }
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.description !== undefined) updates.description = input.description
  if (input.category !== undefined) updates.category = input.category
  if (input.configuration !== undefined) {
    updates.configuration = cloneConfiguration(
      validateProductTemplateConfiguration(input.configuration),
    )
  }
  await db
    .update(productTemplatesTable)
    .set(updates)
    .where(
      and(
        eq(productTemplatesTable.id, input.id),
        eq(productTemplatesTable.orgId, input.orgId),
      ),
    )
  const result = await getProductTemplate(input.id, input.orgId)
  if (!result) throw new Error('Product template not found')
  return result
}

export async function duplicateProductTemplate(
  id: string,
  orgId: string,
  name?: string,
): Promise<ProductTemplate> {
  const source = await getProductTemplate(id, orgId)
  if (!source) throw new Error('Product template not found')
  return createProductTemplate({
    orgId,
    name: name?.trim() || `${source.name} Copy`,
    description: source.description,
    category: source.category,
    configuration: cloneConfiguration(source.configuration),
  })
}

export async function archiveProductTemplate(
  id: string,
  orgId: string,
): Promise<ProductTemplate> {
  await db
    .update(productTemplatesTable)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(
      and(
        eq(productTemplatesTable.id, id),
        eq(productTemplatesTable.orgId, orgId),
      ),
    )
  const result = await getProductTemplate(id, orgId)
  if (!result) throw new Error('Product template not found')
  return result
}
export async function deleteProductTemplate(
  id: string,
  orgId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const templates = await tx
      .select()
      .from(productTemplatesTable)
      .where(
        and(
          eq(productTemplatesTable.id, id),
          eq(productTemplatesTable.orgId, orgId),
        ),
      )
      .for('update')
      .limit(1)
    const template = templates[0]
    if (!template) throw new Error('Product template not found')
    if (template.status === 'active') {
      throw new Error('Product template must be archived before deletion')
    }

    const references = await tx
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.productTemplateId, id),
          eq(productsTable.orgId, orgId),
        ),
      )
      .limit(1)
    if (references.length > 0) {
      throw new Error('Product template is referenced by products')
    }

    await tx
      .delete(productTemplatesTable)
      .where(
        and(
          eq(productTemplatesTable.id, id),
          eq(productTemplatesTable.orgId, orgId),
        ),
      )
  })
}

export async function materializeBusinessTemplate(
  orgId: string,
  businessTemplateId: string,
): Promise<ProductTemplate[]> {
  return db.transaction(async (tx) => {
    const businessRows = await tx
      .select()
      .from(businessTemplatesTable)
      .where(
        and(
          eq(businessTemplatesTable.id, businessTemplateId),
          eq(businessTemplatesTable.active, true),
        ),
      )
      .for('update')
      .limit(1)
    const businessTemplate = businessRows[0]
    if (!businessTemplate) throw new Error('Business template not found')

    const existing = await tx
      .select()
      .from(productTemplatesTable)
      .where(
        and(
          eq(productTemplatesTable.orgId, orgId),
          eq(productTemplatesTable.businessTemplateId, businessTemplateId),
        ),
      )
      .orderBy(desc(productTemplatesTable.createdAt))
    if (existing.length > 0) return existing.map(toProductTemplate)

    const sourceKeys = new Set<string>()
    const now = new Date()
    const values = businessTemplate.configuration.productTemplates.map(
      (template, index) => {
        const sourceKey = template.sourceKey?.trim() || `item-${index + 1}`
        if (sourceKeys.has(sourceKey)) {
          throw new Error('Business template source keys must be unique')
        }
        sourceKeys.add(sourceKey)
        return {
          id: crypto.randomUUID(),
          orgId,
          businessTemplateId,
          businessTemplateItemKey: sourceKey,
          name: template.name,
          description: template.description,
          category: null,
          status: 'active' as const,
          configuration: cloneConfiguration(
            validateProductTemplateConfiguration(template.configuration),
          ),
          createdAt: now,
          updatedAt: now,
        }
      },
    )
    if (values.length === 0) {
      throw new Error('Business template has no starter product templates')
    }
    await tx.insert(productTemplatesTable).values(values)
    return values.map((value) => toProductTemplate(value))
  })
}
