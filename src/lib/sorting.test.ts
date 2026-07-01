import { describe, expect, it } from 'vitest'
import { decodeSort, encodeSort } from './sorting'

describe('encodeSort', () => {
  it('encodes field and direction as field:direction', () => {
    expect(encodeSort('createdAt', 'desc')).toBe('createdAt:desc')
  })

  it('encodes asc direction', () => {
    expect(encodeSort('name', 'asc')).toBe('name:asc')
  })
})

describe('decodeSort', () => {
  it('decodes valid sort string', () => {
    expect(decodeSort('createdAt:desc')).toEqual({
      field: 'createdAt',
      direction: 'desc',
    })
  })

  it('decodes asc direction', () => {
    expect(decodeSort('name:asc')).toEqual({ field: 'name', direction: 'asc' })
  })

  it('returns null for invalid direction', () => {
    expect(decodeSort('createdAt:sideways')).toBeNull()
  })

  it('returns null when no colon separator', () => {
    expect(decodeSort('createdAt')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(decodeSort('')).toBeNull()
  })
})
