import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createOrganizationExportFn,
  createPlanFn,
  createPlanVersionFn,
  deactivatePlanFn,
  getAdminDashboardMetricsFn,
  getProductionBottlenecksFn,
  grantPlatformAdminFn,
  listAuditEventsFn,
  listMigrationsFn,
  listOrganizationsFn,
  listPlansFn,
  listPlatformAdminsFn,
  listSubscriptionsFn,
  restoreOrganizationFn,
  revokePlatformAdminFn,
  suspendOrganizationFn,
} from '#/features/admin/server'
import { invalidateMutationQueries } from '#/lib/mutation-invalidation'
import { queryKeys } from '#/lib/query-keys'

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function useAdminDashboardMetrics() {
  return useQuery({
    queryKey: queryKeys.admin.dashboard(),
    queryFn: () => getAdminDashboardMetricsFn(),
  })
}

// ─── Organizations ───────────────────────────────────────────────────────────

export function useOrganizations(search?: string) {
  return useQuery({
    queryKey: queryKeys.admin.organizations(search),
    queryFn: () => listOrganizationsFn({ data: { search } }),
  })
}

export function useSuspendOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { orgId: string; reason: string }) =>
      suspendOrganizationFn({ data: input }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.admin.organizations() },
        { queryKey: queryKeys.admin.dashboard() },
      ])
    },
  })
}

export function useRestoreOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { orgId: string; reason: string }) =>
      restoreOrganizationFn({ data: input }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.admin.organizations() },
        { queryKey: queryKeys.admin.dashboard() },
      ])
    },
  })
}

export function useCreateOrganizationExport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { orgId: string }) =>
      createOrganizationExportFn({ data: input }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.admin.audit() },
      ])
    },
  })
}

// ─── Plans ───────────────────────────────────────────────────────────────────

export function usePlans() {
  return useQuery({
    queryKey: queryKeys.admin.plans(),
    queryFn: () => listPlansFn(),
  })
}

export function useCreatePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      createPlanFn({ data: input as never }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.admin.plans() },
      ])
    },
  })
}

export function useCreatePlanVersion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      createPlanVersionFn({ data: input as never }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.admin.plans() },
      ])
    },
  })
}

export function useDeactivatePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { planId: string }) =>
      deactivatePlanFn({ data: input }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.admin.plans() },
      ])
    },
  })
}

// ─── Subscriptions ───────────────────────────────────────────────────────────

export function useAdminSubscriptions() {
  return useQuery({
    queryKey: queryKeys.admin.subscriptions(),
    queryFn: () => listSubscriptionsFn(),
  })
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export function useAuditEvents(
  options: {
    limit?: number
    offset?: number
    action?: string
    organizationId?: string
  } = {},
) {
  return useQuery({
    queryKey: queryKeys.admin.audit(options),
    queryFn: () =>
      listAuditEventsFn({
        data: {
          limit: options.limit ?? 50,
          offset: options.offset ?? 0,
          action: options.action,
          organizationId: options.organizationId,
        },
      }),
  })
}

// ─── Migrations ──────────────────────────────────────────────────────────────

export function useAdminMigrations() {
  return useQuery({
    queryKey: queryKeys.admin.migrations(),
    queryFn: () => listMigrationsFn(),
  })
}

// ─── Platform Admin Users ────────────────────────────────────────────────────

export function usePlatformAdmins() {
  return useQuery({
    queryKey: queryKeys.admin.platformAdmins(),
    queryFn: () => listPlatformAdminsFn(),
  })
}

export function useGrantPlatformAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { email: string }) =>
      grantPlatformAdminFn({ data: input }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.admin.platformAdmins() },
        { queryKey: queryKeys.admin.audit() },
      ])
    },
  })
}

export function useRevokePlatformAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { userId: string }) =>
      revokePlatformAdminFn({ data: input }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.admin.platformAdmins() },
        { queryKey: queryKeys.admin.audit() },
      ])
    },
  })
}

// ─── Production Bottlenecks (Owner/Admin view) ───────────────────────────────

export function useProductionBottlenecks(orgId: string, limit = 10) {
  return useQuery({
    queryKey: queryKeys.admin.productionBottlenecks(orgId, limit),
    queryFn: () => getProductionBottlenecksFn({ data: { orgId, limit } }),
    enabled: !!orgId,
  })
}
