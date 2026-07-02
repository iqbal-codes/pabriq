import { asc, desc, sql, type SQL, type SQLWrapper } from 'drizzle-orm'

export type SortDirection = 'asc' | 'desc'

export type SortState = {
  field: string
  direction: SortDirection
}

export type SortNulls = 'first' | 'last'
export type SortColumn =
  | SQLWrapper
  | { expression: SQLWrapper; nulls?: SortNulls }
export type SortColumnMap = Record<string, SortColumn>

export function encodeSort(field: string, direction: SortDirection): string {
  return `${field}:${direction}`
}

export function decodeSort(encoded: string): SortState | null {
  const idx = encoded.lastIndexOf(':')
  if (idx === -1) return null
  const field = encoded.slice(0, idx)
  const direction = encoded.slice(idx + 1)
  if (direction !== 'asc' && direction !== 'desc') return null
  return { field, direction }
}

function resolveSortColumn(column: SortColumn): {
  expression: SQLWrapper
  nulls?: SortNulls
} {
  if (typeof column === 'object' && 'expression' in column) return column
  return { expression: column }
}

export function buildOrderBy(
  sort: SortState | null | undefined,
  columns: SortColumnMap,
  fallback: SQL,
): SQL {
  if (!sort || !Object.prototype.hasOwnProperty.call(columns, sort.field)) {
    return fallback
  }

  const column = columns[sort.field]
  if (!column) return fallback

  const { expression, nulls } = resolveSortColumn(column)
  if (nulls === 'last') {
    return sort.direction === 'asc'
      ? sql`${expression} asc nulls last`
      : sql`${expression} desc nulls last`
  }
  if (nulls === 'first') {
    return sort.direction === 'asc'
      ? sql`${expression} asc nulls first`
      : sql`${expression} desc nulls first`
  }
  return sort.direction === 'asc' ? asc(expression) : desc(expression)
}
