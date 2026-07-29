import { createServerFn } from '@tanstack/react-start'
import {
  acceptUpgradeProposal,
  type BusinessTemplate,
  type ConfigurationElement,
  createTemplate,
  createUpgradeProposal,
  getOrganizationConfiguration,
  importCapability,
  listConfigurationElements,
  listPublishedTemplates,
  listUpgradeProposals,
  type MaterializeResult,
  materializeTemplate,
  type OrganizationConfiguration,
  publishTemplate,
  rejectUpgradeProposal,
  retireTemplate,
  type UpgradeProposal,
  updateConfigurationElement,
} from '#/features/business-templates/model'
import type { Role } from '#/features/permissions/model'
import { canManageSettings } from '#/features/permissions/model'
import { resolveOrgAndRole, resolveOrgId } from '#/lib/auth-session-server'

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function requireSettingsAdmin(): Promise<{ orgId: string }> {
  const { orgId, role } = await resolveOrgAndRole()
  if (!canManageSettings(role as Role)) {
    throw new Error('Not authorized')
  }
  return { orgId }
}

async function requireOrgId(): Promise<string> {
  return resolveOrgId()
}

function wrapError(err: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error: err instanceof Error ? err.message : 'Unknown error',
  }
}

// ─── Public template listing ─────────────────────────────────────────────────

export const listPublishedTemplatesFn = createServerFn({
  method: 'GET',
}).handler(async (): Promise<BusinessTemplate[]> => {
  return listPublishedTemplates()
})

// ─── Template materialization (called during onboarding) ─────────────────────

export const materializeTemplateFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { templateId: string }) => input)
  .handler(
    async ({
      data,
    }): Promise<MaterializeResult | { ok: false; error: string }> => {
      try {
        const orgId = await requireOrgId()
        return materializeTemplate(orgId, data.templateId)
      } catch (err: unknown) {
        return wrapError(err)
      }
    },
  )

// ─── Configuration management ────────────────────────────────────────────────

export const getOrganizationConfigurationFn = createServerFn({
  method: 'GET',
}).handler(async (): Promise<OrganizationConfiguration | null> => {
  const orgId = await requireOrgId()
  return getOrganizationConfiguration(orgId)
})

export const listConfigurationElementsFn = createServerFn({ method: 'GET' })
  .inputValidator((input?: { elementType?: string }) => input ?? {})
  .handler(async ({ data }): Promise<ConfigurationElement[]> => {
    const orgId = await requireOrgId()
    return listConfigurationElements(orgId, {
      elementType: data.elementType as
        | ConfigurationElement['elementType']
        | undefined,
    })
  })

export const updateConfigurationElementFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      elementType: string
      elementKey: string
      data: Record<string, unknown>
    }) => input,
  )
  .handler(
    async ({
      data,
    }): Promise<ConfigurationElement | { ok: false; error: string }> => {
      try {
        const { orgId } = await requireSettingsAdmin()
        return updateConfigurationElement(
          orgId,
          data.elementType as ConfigurationElement['elementType'],
          data.elementKey,
          data.data,
        )
      } catch (err: unknown) {
        return wrapError(err)
      }
    },
  )

// ─── Template administration (platform admin) ────────────────────────────────

export const createTemplateFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      slug: string
      name: string
      description?: string
      category?: string
      capabilities?: Record<string, unknown>
      configSnapshot?: Record<string, unknown>
    }) => input,
  )
  .handler(
    async ({
      data,
    }): Promise<BusinessTemplate | { ok: false; error: string }> => {
      try {
        await requireSettingsAdmin()
        return createTemplate(data)
      } catch (err: unknown) {
        return wrapError(err)
      }
    },
  )

export const publishTemplateFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { templateId: string }) => input)
  .handler(
    async ({
      data,
    }): Promise<BusinessTemplate | { ok: false; error: string }> => {
      try {
        await requireSettingsAdmin()
        return publishTemplate(data.templateId)
      } catch (err: unknown) {
        return wrapError(err)
      }
    },
  )

export const retireTemplateFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { templateId: string }) => input)
  .handler(
    async ({
      data,
    }): Promise<BusinessTemplate | { ok: false; error: string }> => {
      try {
        await requireSettingsAdmin()
        return retireTemplate(data.templateId)
      } catch (err: unknown) {
        return wrapError(err)
      }
    },
  )

// ─── Upgrade proposals ───────────────────────────────────────────────────────

export const createUpgradeProposalFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { targetTemplateId: string }) => input)
  .handler(
    async ({
      data,
    }): Promise<UpgradeProposal | { ok: false; error: string }> => {
      try {
        const { orgId } = await requireSettingsAdmin()
        return createUpgradeProposal(orgId, data.targetTemplateId)
      } catch (err: unknown) {
        return wrapError(err)
      }
    },
  )

export const acceptUpgradeProposalFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { proposalId: string }) => input)
  .handler(
    async ({
      data,
    }): Promise<UpgradeProposal | { ok: false; error: string }> => {
      try {
        const { orgId } = await requireSettingsAdmin()
        const proposal = await acceptUpgradeProposal(data.proposalId)
        if (proposal.orgId !== orgId) {
          throw new Error('Not authorized')
        }
        return proposal
      } catch (err: unknown) {
        return wrapError(err)
      }
    },
  )

export const rejectUpgradeProposalFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { proposalId: string }) => input)
  .handler(
    async ({
      data,
    }): Promise<UpgradeProposal | { ok: false; error: string }> => {
      try {
        const { orgId } = await requireSettingsAdmin()
        const proposal = await rejectUpgradeProposal(data.proposalId)
        if (proposal.orgId !== orgId) {
          throw new Error('Not authorized')
        }
        return proposal
      } catch (err: unknown) {
        return wrapError(err)
      }
    },
  )

export const listUpgradeProposalsFn = createServerFn({
  method: 'GET',
}).handler(async (): Promise<UpgradeProposal[]> => {
  const orgId = await requireOrgId()
  return listUpgradeProposals(orgId)
})

// ─── Capability import ───────────────────────────────────────────────────────

export const importCapabilityFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: { sourceTemplateId: string; elementKey: string }) => input,
  )
  .handler(
    async ({
      data,
    }): Promise<ConfigurationElement | { ok: false; error: string }> => {
      try {
        const { orgId } = await requireSettingsAdmin()
        return importCapability(orgId, data.sourceTemplateId, data.elementKey)
      } catch (err: unknown) {
        return wrapError(err)
      }
    },
  )
