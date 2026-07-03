import { useMutation, useQuery } from '@tanstack/react-query'
import { queryKeys } from '#/lib/query-keys'
import { calculateShippingRatesFn, searchAreasFn } from './model'

export function useSearchAreas(query: string) {
  return useQuery({
    queryKey: queryKeys.address.areas(query),
    queryFn: () => searchAreasFn({ data: { query } }),
    enabled: query.trim().length > 0,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCalculateShippingRates() {
  return useMutation({
    mutationFn: (input: {
      originAreaId: string
      destinationAreaId: string
      weightGrams: number
      orderValue: number
    }) => calculateShippingRatesFn({ data: input }),
  })
}
