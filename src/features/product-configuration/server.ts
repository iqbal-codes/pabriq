import { createServerFn } from '@tanstack/react-start'
import type {
  PriceOverride,
  PricingBasisConfig,
  PricingExtension,
  PricingResult,
  PricingRuleConfig,
  ProductConstraint,
  ProductField,
  Specification,
  SpecificationPrice,
  SpecificationSnapshot,
  SpecificationStatus,
} from '#/features/product-configuration/model'
import {
  applyPriceOverride,
  approvePricingBasis,
  calculatePrice,
  commitSpecification,
  createPricingExtension,
  createPricingRule,
  createProductConstraint,
  createProductField,
  createSpecification,
  deletePricingRule,
  deleteProductConstraint,
  deleteProductField,
  getOverrideHistory,
  getPricingBasis,
  getSpecification,
  getSpecificationPrice,
  listPricingExtensions,
  listPricingRules,
  listProductConstraints,
  listProductFields,
  listSpecifications,
  rejectSpecification,
  savePricingResult,
  submitSpecification,
  updateProductField,
  upsertPricingBasis,
} from '#/features/product-configuration/model'
import {
  getSessionServer,
  resolveOrgAndRole,
  resolveOrgId,
} from '#/lib/auth-session-server'
import type { MutationResult } from '#/lib/server-results'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function wrapError(err: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error: err instanceof Error ? err.message : 'Unknown error',
  }
}

/**
 * Cast a value through `unknown` to strip TanStack Start's
 * `ValidateSerializableMapped` check on `object` fields.
 * Only use on values that ARE actually serializable (no functions, symbols, etc.).
 */
export function serializable<T>(value: T): T {
  return value as unknown as T
}

async function requireAuthSession(): Promise<{
  orgId: string
  userId: string
  role: string
}> {
  const session = await getSessionServer()
  if (!session) throw new Error('Not authenticated')
  const { orgId, role } = await resolveOrgAndRole()
  return { orgId, userId: session.user.id, role }
}

// ─── 1. Product Fields ────────────────────────────────────────────────────────

export const listProductFieldsFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { productId: string }) => input)
  .handler(async ({ data }): Promise<ProductField[]> => {
    const orgId = await resolveOrgId()
    return listProductFields(orgId, data.productId)
  })

export const createProductFieldFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: Omit<ProductField, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>) =>
      input,
  )
  .handler(
    async ({ data }): Promise<ProductField | { ok: false; error: string }> => {
      try {
        const orgId = await resolveOrgId()
        return await createProductField({ ...data, orgId })
      } catch (err: unknown) {
        return wrapError(err)
      }
    },
  )

export const updateProductFieldFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (
      input: { id: string } & Partial<
        Pick<
          ProductField,
          | 'label'
          | 'unit'
          | 'required'
          | 'options'
          | 'validationRules'
          | 'matrix'
          | 'sortOrder'
          | 'active'
        >
      >,
    ) => input,
  )
  .handler(
    async ({ data }): Promise<ProductField | { ok: false; error: string }> => {
      try {
        const { id, ...updates } = data
        const orgId = await resolveOrgId()
        return await updateProductField(id, orgId, updates)
      } catch (err: unknown) {
        return wrapError(err)
      }
    },
  )

export const deleteProductFieldFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const orgId = await resolveOrgId()
      await deleteProductField(data.id, orgId)
      return { ok: true }
    } catch (err: unknown) {
      return wrapError(err)
    }
  })

// ─── 2. Product Constraints ───────────────────────────────────────────────────

export const listProductConstraintsFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { productId: string }) => input)
  .handler(async ({ data }): Promise<ProductConstraint[]> => {
    const orgId = await resolveOrgId()
    return listProductConstraints(orgId, data.productId)
  })

export const createProductConstraintFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (
      input: Omit<
        ProductConstraint,
        'id' | 'orgId' | 'createdAt' | 'updatedAt'
      >,
    ) => input,
  )
  .handler(
    async ({
      data,
    }): Promise<ProductConstraint | { ok: false; error: string }> => {
      try {
        const orgId = await resolveOrgId()
        return await createProductConstraint({ ...data, orgId })
      } catch (err: unknown) {
        return wrapError(err)
      }
    },
  )

export const deleteProductConstraintFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const orgId = await resolveOrgId()
      await deleteProductConstraint(data.id, orgId)
      return { ok: true }
    } catch (err: unknown) {
      return wrapError(err)
    }
  })

// ─── 3. Specifications ────────────────────────────────────────────────────────

export const createSpecificationFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: { productId: string; quantity: number; orderId?: string }) => input,
  )
  .handler(
    async ({ data }): Promise<Specification | { ok: false; error: string }> => {
      try {
        const { orgId, userId, role } = await requireAuthSession()
        return serializable(
          await createSpecification({
            orgId,
            productId: data.productId,
            quantity: data.quantity,
            orderId: data.orderId,
            submittedBy: userId,
            submittedByRole: role,
          }),
        )
      } catch (err: unknown) {
        return wrapError(err)
      }
    },
  )

export const submitSpecificationFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string; fieldValues: object }) => input)
  .handler(
    async ({ data }): Promise<Specification | { ok: false; error: string }> => {
      try {
        const orgId = await resolveOrgId()
        return serializable(
          await submitSpecification(data.id, orgId, data.fieldValues),
        )
      } catch (err: unknown) {
        return wrapError(err)
      }
    },
  )

export const getSpecificationFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<Specification | null> => {
    const orgId = await resolveOrgId()
    return serializable(await getSpecification(data.id, orgId))
  })

export const listSpecificationsFn = createServerFn({ method: 'GET' })
  .inputValidator(
    (input?: { productId?: string; status?: SpecificationStatus }) =>
      input ?? {},
  )
  .handler(async ({ data }): Promise<Specification[]> => {
    const orgId = await resolveOrgId()
    return serializable(await listSpecifications(orgId, data))
  })

export const commitSpecificationFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(
    async ({
      data,
    }): Promise<
      | { spec: Specification; snapshot: SpecificationSnapshot }
      | { ok: false; error: string }
    > => {
      try {
        const { orgId, userId } = await requireAuthSession()
        return serializable(await commitSpecification(data.id, orgId, userId))
      } catch (err: unknown) {
        return wrapError(err)
      }
    },
  )

export const rejectSpecificationFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string; reason: string }) => input)
  .handler(
    async ({ data }): Promise<Specification | { ok: false; error: string }> => {
      try {
        const orgId = await resolveOrgId()
        return serializable(
          await rejectSpecification(data.id, orgId, data.reason),
        )
      } catch (err: unknown) {
        return wrapError(err)
      }
    },
  )

// ─── 4. Pricing ───────────────────────────────────────────────────────────────

export const calculatePriceFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: { productId: string; quantity: number; fieldValues: object }) =>
      input,
  )
  .handler(
    async ({ data }): Promise<PricingResult | { ok: false; error: string }> => {
      try {
        const orgId = await resolveOrgId()
        return serializable(
          await calculatePrice(
            orgId,
            data.productId,
            data.quantity,
            data.fieldValues,
          ),
        )
      } catch (err: unknown) {
        return wrapError(err)
      }
    },
  )

export const savePricingResultFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      specificationId: string
      productId: string
      quantity: number
      fieldValues: object
    }) => input,
  )
  .handler(
    async ({
      data,
    }): Promise<SpecificationPrice | { ok: false; error: string }> => {
      try {
        const orgId = await resolveOrgId()
        // Recalculate price server-side — never trust client-supplied pricing
        const pricingResult = await calculatePrice(
          orgId,
          data.productId,
          data.quantity,
          data.fieldValues,
        )
        return serializable(
          await savePricingResult(data.specificationId, orgId, pricingResult),
        )
      } catch (err: unknown) {
        return wrapError(err)
      }
    },
  )

export const applyPriceOverrideFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      specificationId: string
      overridePrice: number
      reason: string
    }) => input,
  )
  .handler(
    async ({
      data,
    }): Promise<
      | { override: PriceOverride; price: SpecificationPrice }
      | { ok: false; error: string }
    > => {
      try {
        const { orgId, userId, role } = await requireAuthSession()
        // Only admin/owner roles can apply manual price overrides
        if (role !== 'owner' && role !== 'admin') {
          return {
            ok: false,
            error: 'Only administrators can apply manual price overrides',
          }
        }
        return serializable(
          await applyPriceOverride(
            data.specificationId,
            orgId,
            data.overridePrice,
            data.reason,
            userId,
          ),
        )
      } catch (err: unknown) {
        return wrapError(err)
      }
    },
  )

export const getSpecificationPriceFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { specificationId: string }) => input)
  .handler(async ({ data }): Promise<SpecificationPrice | null> => {
    const orgId = await resolveOrgId()
    const spec = await getSpecification(data.specificationId, orgId)
    if (!spec) return null
    return serializable(
      await getSpecificationPrice(data.specificationId, orgId),
    )
  })

export const getOverrideHistoryFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { specificationId: string }) => input)
  .handler(async ({ data }): Promise<PriceOverride[]> => {
    const orgId = await resolveOrgId()
    const spec = await getSpecification(data.specificationId, orgId)
    if (!spec) return []
    return serializable(await getOverrideHistory(data.specificationId, orgId))
  })

// ─── 5. Pricing Basis ─────────────────────────────────────────────────────────

export const upsertPricingBasisFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (
      input: Omit<
        PricingBasisConfig,
        'id' | 'orgId' | 'createdAt' | 'updatedAt'
      >,
    ) => input,
  )
  .handler(
    async ({
      data,
    }): Promise<PricingBasisConfig | { ok: false; error: string }> => {
      try {
        const orgId = await resolveOrgId()
        return await upsertPricingBasis({ ...data, orgId })
      } catch (err: unknown) {
        return wrapError(err)
      }
    },
  )

export const getPricingBasisFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { productId: string }) => input)
  .handler(async ({ data }): Promise<PricingBasisConfig | null> => {
    const orgId = await resolveOrgId()
    const basis = await getPricingBasis(data.productId, orgId)
    if (!basis || basis.orgId !== orgId) return null
    return basis
  })

export const approvePricingBasisFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { productId: string }) => input)
  .handler(
    async ({
      data,
    }): Promise<PricingBasisConfig | { ok: false; error: string }> => {
      try {
        const { orgId, userId } = await requireAuthSession()
        const basis = await getPricingBasis(data.productId, orgId)
        if (!basis || basis.orgId !== orgId) {
          throw new Error('Pricing basis not found')
        }
        return await approvePricingBasis(data.productId, userId)
      } catch (err: unknown) {
        return wrapError(err)
      }
    },
  )

// ─── 6. Pricing Rules ─────────────────────────────────────────────────────────

export const listPricingRulesFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { productId: string }) => input)
  .handler(async ({ data }): Promise<PricingRuleConfig[]> => {
    const orgId = await resolveOrgId()
    return listPricingRules(orgId, data.productId)
  })

export const createPricingRuleFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (
      input: Omit<
        PricingRuleConfig,
        'id' | 'orgId' | 'createdAt' | 'updatedAt'
      >,
    ) => input,
  )
  .handler(
    async ({
      data,
    }): Promise<PricingRuleConfig | { ok: false; error: string }> => {
      try {
        const orgId = await resolveOrgId()
        return await createPricingRule({ ...data, orgId })
      } catch (err: unknown) {
        return wrapError(err)
      }
    },
  )

export const deletePricingRuleFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    try {
      const orgId = await resolveOrgId()
      await deletePricingRule(data.id, orgId)
      return { ok: true }
    } catch (err: unknown) {
      return wrapError(err)
    }
  })

// ─── 7. Pricing Extensions ────────────────────────────────────────────────────

export const listPricingExtensionsFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { productId: string }) => input)
  .handler(async ({ data }): Promise<PricingExtension[]> => {
    const orgId = await resolveOrgId()
    return listPricingExtensions(orgId, data.productId)
  })

export const createPricingExtensionFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (
      input: Omit<PricingExtension, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>,
    ) => input,
  )
  .handler(
    async ({
      data,
    }): Promise<PricingExtension | { ok: false; error: string }> => {
      try {
        const orgId = await resolveOrgId()
        return await createPricingExtension({ ...data, orgId })
      } catch (err: unknown) {
        return wrapError(err)
      }
    },
  )
