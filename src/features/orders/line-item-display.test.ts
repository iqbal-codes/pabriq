import { describe, expect, it } from 'vitest'
import {
  formatProductDesignLabel,
  getVisibleDesignName,
  normalizeDesignName,
} from './line-item-display'

describe('normalizeDesignName', () => {
  it('returns null for undefined', () => {
    expect(normalizeDesignName(undefined)).toBeNull()
  })

  it('returns null for null', () => {
    expect(normalizeDesignName(null)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(normalizeDesignName('')).toBeNull()
  })

  it('returns null for whitespace-only string', () => {
    expect(normalizeDesignName('   ')).toBeNull()
  })

  it('trims and returns non-empty string', () => {
    expect(normalizeDesignName('  ONIC  ')).toBe('ONIC')
  })
})

describe('getVisibleDesignName', () => {
  it('returns null when designName is null', () => {
    expect(getVisibleDesignName(null, 'Product A')).toBeNull()
  })

  it('returns null when designName is undefined', () => {
    expect(getVisibleDesignName(undefined, 'Product A')).toBeNull()
  })

  it('returns null when designName equals productName', () => {
    expect(getVisibleDesignName('Product A', 'Product A')).toBeNull()
  })

  it('returns null when trimmed designName equals productName', () => {
    expect(getVisibleDesignName('  Product A  ', 'Product A')).toBeNull()
  })

  it('returns designName when it differs from productName', () => {
    expect(getVisibleDesignName('ONIC', 'Patch karet 3D - Express')).toBe(
      'ONIC',
    )
  })

  it('trims whitespace from designName', () => {
    expect(getVisibleDesignName('  ONIC  ', 'Patch karet 3D - Express')).toBe(
      'ONIC',
    )
  })
})

describe('formatProductDesignLabel', () => {
  it('returns productName when no designName', () => {
    expect(formatProductDesignLabel('Product A', null)).toBe('Product A')
  })

  it('returns productName when designName equals productName', () => {
    expect(formatProductDesignLabel('Product A', 'Product A')).toBe('Product A')
  })

  it('returns combined label when designName differs', () => {
    expect(formatProductDesignLabel('Patch karet 3D - Express', 'ONIC')).toBe(
      'Patch karet 3D - Express — ONIC',
    )
  })

  it('returns productName when designName is empty', () => {
    expect(formatProductDesignLabel('Product A', '')).toBe('Product A')
  })
})
