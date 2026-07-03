import type { QueryClient } from '@tanstack/react-query'

export type QueryInvalidation = NonNullable<
  Parameters<QueryClient['invalidateQueries']>[0]
>

export async function invalidateMutationQueries(
  queryClient: QueryClient,
  invalidations: readonly QueryInvalidation[],
): Promise<void> {
  await Promise.all(
    invalidations.map((filters) => queryClient.invalidateQueries(filters)),
  )
}
