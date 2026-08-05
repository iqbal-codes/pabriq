import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '#/db/index'
import { member } from '#/db/schema'
import type { Role } from '#/features/permissions/model'
import { canManageProducts } from '#/features/permissions/model'
import { resolveOrgId } from '#/lib/auth-session-server'
import type { MutationResult } from '#/lib/server-results'
import { validateProductTemplateConfiguration } from './config'
import type {
  CreateProductTemplateInput,
  ProductTemplate,
  UpdateProductTemplateInput,
} from './model'

const configurationInput = z.unknown().transform((input, context) => {
  try {
    return validateProductTemplateConfiguration(input)
  } catch (error) {
    if (error instanceof z.ZodError) {
      for (const issue of error.issues) {
        context.addIssue({
          code: 'custom',
          path: issue.path,
          message: issue.message,
        })
      }
    } else {
      context.addIssue({ code: 'custom', message: 'Invalid configuration' })
    }
    return z.NEVER
  }
})

const createInputSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  configuration: configurationInput,
  businessTemplateId: z.string().nullable().optional(),
})

const updateInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  configuration: configurationInput.optional(),
})

const idInputSchema = z.object({ id: z.string().min(1) })
const duplicateInputSchema = idInputSchema.extend({
  name: z.string().trim().min(1).optional(),
})
const materializeInputSchema = z.object({
  businessTemplateId: z.string().min(1),
})

async function resolveManageProductTemplatesOrgId(): Promise<string> {
  // Dynamic import keeps #/lib/auth out of the client bundle (project-wide
  // convention for server functions).
  const { auth } = await import('#/lib/auth')
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error('Not authenticated')

  const memberships = await db
    .select({ orgId: member.organizationId, role: member.role })
    .from(member)
    .where(eq(member.userId, session.user.id))
    .limit(1)

  if (memberships.length === 0) throw new Error('No organization')
  if (!canManageProducts(memberships[0].role as Role)) {
    throw new Error('Not authorized')
  }
  return memberships[0].orgId
}

export const listBusinessTemplatesFn = createServerFn({
  method: 'GET',
}).handler(async () => {
  const { listBusinessTemplates } = await import('./model')
  return listBusinessTemplates()
})

export const listProductTemplatesFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ProductTemplate[]> => {
    const [orgId, { listProductTemplates }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    return listProductTemplates(orgId)
  },
)

export const getProductTemplateFn = createServerFn({ method: 'GET' })
  .inputValidator((input: unknown) => idInputSchema.parse(input))
  .handler(async ({ data }): Promise<ProductTemplate | null> => {
    const [orgId, { getProductTemplate }] = await Promise.all([
      resolveOrgId(),
      import('./model'),
    ])
    return getProductTemplate(data.id, orgId)
  })

export const createProductTemplateFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: unknown): Omit<CreateProductTemplateInput, 'orgId'> =>
      createInputSchema.parse(input),
  )
  .handler(async ({ data }): Promise<MutationResult> => {
    const [orgId, { createProductTemplate }] = await Promise.all([
      resolveManageProductTemplatesOrgId(),
      import('./model'),
    ])
    try {
      await createProductTemplate({ ...data, orgId })
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

export const updateProductTemplateFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: unknown): Omit<UpdateProductTemplateInput, 'orgId'> =>
      updateInputSchema.parse(input),
  )
  .handler(async ({ data }): Promise<MutationResult> => {
    const [orgId, { updateProductTemplate }] = await Promise.all([
      resolveManageProductTemplatesOrgId(),
      import('./model'),
    ])
    try {
      await updateProductTemplate({ ...data, orgId })
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

export const duplicateProductTemplateFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => duplicateInputSchema.parse(input))
  .handler(async ({ data }): Promise<MutationResult> => {
    const [orgId, { duplicateProductTemplate }] = await Promise.all([
      resolveManageProductTemplatesOrgId(),
      import('./model'),
    ])
    try {
      await duplicateProductTemplate(data.id, orgId, data.name)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

export const archiveProductTemplateFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => idInputSchema.parse(input))
  .handler(async ({ data }): Promise<MutationResult> => {
    const [orgId, { archiveProductTemplate }] = await Promise.all([
      resolveManageProductTemplatesOrgId(),
      import('./model'),
    ])
    try {
      await archiveProductTemplate(data.id, orgId)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

export const deleteProductTemplateFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => idInputSchema.parse(input))
  .handler(async ({ data }): Promise<MutationResult> => {
    const [orgId, { deleteProductTemplate }] = await Promise.all([
      resolveManageProductTemplatesOrgId(),
      import('./model'),
    ])
    try {
      await deleteProductTemplate(data.id, orgId)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

export const materializeBusinessTemplateFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => materializeInputSchema.parse(input))
  .handler(async ({ data }): Promise<MutationResult> => {
    const [orgId, { materializeBusinessTemplate }] = await Promise.all([
      resolveManageProductTemplatesOrgId(),
      import('./model'),
    ])
    try {
      await materializeBusinessTemplate(orgId, data.businessTemplateId)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
