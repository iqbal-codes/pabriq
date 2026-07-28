import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '#/lib/query-keys'
import { searchAreasFn } from './server'

export function useSearchAreas(query: string) {
  return useQuery({
    queryKey: queryKeys.address.areas(query),
    queryFn: () => searchAreasFn({ data: { query } }),
    enabled: query.trim().length > 0,
    staleTime: 5 * 60 * 1000,
  })
}
