import {
  type UseMutationResult,
  type UseSuspenseQueryResult,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import type {
  FulfillmentInitParams,
  FulfillmentRecord,
  TransitionFulfillmentParams,
} from '#/features/fulfillment/model'
import {
  getFulfillmentFn,
  initFulfillmentFn,
  transitionFulfillmentFn,
} from '#/features/fulfillment/server'
import { invalidateMutationQueries } from '#/lib/mutation-invalidation'
import { queryKeys } from '#/lib/query-keys'
import type { MutationResult } from '#/lib/server-results'

export function useFulfillment(
  orderId: string,
): UseSuspenseQueryResult<FulfillmentRecord | null, Error> {
  return useSuspenseQuery({
    queryKey: queryKeys.fulfillment.detail(orderId),
    queryFn: () => getFulfillmentFn({ data: { orderId } }),
  })
}

export function useInitFulfillmentMutation(): UseMutationResult<
  MutationResult,
  Error,
  Omit<FulfillmentInitParams, 'orgId'>
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<FulfillmentInitParams, 'orgId'>) =>
      initFulfillmentFn({ data: input }),
    onSuccess: (_, vars) => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.fulfillment.detail(vars.orderId) },
        { queryKey: queryKeys.orders.all },
      ])
    },
  })
}

export function useTransitionFulfillmentMutation(): UseMutationResult<
  MutationResult,
  Error,
  Omit<TransitionFulfillmentParams, 'orgId'>
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<TransitionFulfillmentParams, 'orgId'>) =>
      transitionFulfillmentFn({ data: input }),
    onSuccess: (_, vars) => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.fulfillment.detail(vars.orderId) },
        { queryKey: queryKeys.orders.all },
      ])
    },
  })
}
