import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import type { BillingCadence } from '#/db/schema'
import {
  cancelSubscriptionFn,
  changePlanFn,
  getSubscriptionFn,
  reinstateSubscriptionFn,
} from '#/features/subscriptions/server'
import { invalidateMutationQueries } from '#/lib/mutation-invalidation'
import { queryKeys } from '#/lib/query-keys'

export function useSubscription() {
  return useSuspenseQuery({
    queryKey: queryKeys.subscriptions.current(),
    queryFn: () => getSubscriptionFn(),
  })
}

export function useChangePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { planSlug: string; cadence: BillingCadence }) =>
      changePlanFn({ data: input }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.subscriptions.all },
      ])
    },
  })
}

export function useCancelSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => cancelSubscriptionFn(),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.subscriptions.all },
      ])
    },
  })
}

export function useReinstateSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => reinstateSubscriptionFn(),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.subscriptions.all },
      ])
    },
  })
}
