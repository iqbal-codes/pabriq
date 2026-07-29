import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import type { ConfigurationElementType } from '#/db/schema'
import {
  acceptUpgradeProposalFn,
  createUpgradeProposalFn,
  getOrganizationConfigurationFn,
  importCapabilityFn,
  listConfigurationElementsFn,
  listPublishedTemplatesFn,
  materializeTemplateFn,
  rejectUpgradeProposalFn,
  updateConfigurationElementFn,
} from '#/features/business-templates/server'
import { invalidateMutationQueries } from '#/lib/mutation-invalidation'
import { queryKeys } from '#/lib/query-keys'

// ─── Templates ───────────────────────────────────────────────────────────────

export function usePublishedTemplates() {
  return useSuspenseQuery({
    queryKey: queryKeys.businessTemplates.published(),
    queryFn: () => listPublishedTemplatesFn(),
  })
}

export function useMaterializeTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (templateId: string) =>
      materializeTemplateFn({ data: { templateId } }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.businessTemplates.all },
        { queryKey: queryKeys.configuration.all },
      ])
    },
  })
}

// ─── Configuration ───────────────────────────────────────────────────────────

export function useOrganizationConfiguration() {
  return useSuspenseQuery({
    queryKey: queryKeys.configuration.current(),
    queryFn: () => getOrganizationConfigurationFn(),
  })
}

export function useConfigurationElements(
  elementType?: ConfigurationElementType,
) {
  return useSuspenseQuery({
    queryKey: queryKeys.configuration.elements(elementType),
    queryFn: () => listConfigurationElementsFn({ data: { elementType } }),
  })
}

export function useUpdateConfigurationElement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      elementType: ConfigurationElementType
      elementKey: string
      data: Record<string, unknown>
    }) => updateConfigurationElementFn({ data: input }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.configuration.all },
      ])
    },
  })
}

// ─── Upgrades ────────────────────────────────────────────────────────────────

export function useCreateUpgradeProposal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (targetTemplateId: string) =>
      createUpgradeProposalFn({ data: { targetTemplateId } }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.upgrades.all },
      ])
    },
  })
}

export function useAcceptUpgradeProposal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (proposalId: string) =>
      acceptUpgradeProposalFn({ data: { proposalId } }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.upgrades.all },
        { queryKey: queryKeys.configuration.all },
        { queryKey: queryKeys.businessTemplates.all },
      ])
    },
  })
}

export function useRejectUpgradeProposal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (proposalId: string) =>
      rejectUpgradeProposalFn({ data: { proposalId } }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.upgrades.all },
      ])
    },
  })
}

// ─── Capability Import ───────────────────────────────────────────────────────

export function useImportCapability() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { sourceTemplateId: string; elementKey: string }) =>
      importCapabilityFn({ data: input }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.configuration.all },
      ])
    },
  })
}
