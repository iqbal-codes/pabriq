import { parseAsInteger, parseAsString, useQueryState } from 'nuqs'
import { useCallback, useMemo } from 'react'
import type { SortState } from './data-table-utils'
import { decodeSort, encodeSort } from './data-table-utils'

export function useListPageState(): {
  search: string
  setSearch: (value: string | null) => void
  page: number
  setPage: (value: number) => void
  perPage: number
  setPerPage: (value: number) => void
  sort: SortState | null
  handleSortChange: (newSort: SortState | null) => void
  handlePerPageChange: (perPage: number) => void
  resetPage: () => void
} {
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''))
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
  const [perPage, setPerPage] = useQueryState(
    'perPage',
    parseAsInteger.withDefault(25),
  )
  const [sortEncoded, setSortEncoded] = useQueryState(
    'sort',
    parseAsString.withDefault(''),
  )

  const sort = useMemo<SortState | null>(
    () => (sortEncoded ? decodeSort(sortEncoded) : null),
    [sortEncoded],
  )

  const handleSortChange = useCallback(
    (newSort: SortState | null) => {
      setSortEncoded(
        newSort ? encodeSort(newSort.field, newSort.direction) : null,
      )
      setPage(1)
    },
    [setSortEncoded, setPage],
  )

  const handlePerPageChange = useCallback(
    (pp: number) => {
      setPerPage(pp)
      setPage(1)
    },
    [setPerPage, setPage],
  )

  const resetPage = useCallback(() => {
    setPage(1)
  }, [setPage])

  return {
    search,
    setSearch,
    page,
    setPage,
    perPage,
    setPerPage,
    sort,
    handleSortChange,
    handlePerPageChange,
    resetPage,
  }
}
