import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { getQueryClient, makeQueryClient } from './query-client'

describe('makeQueryClient', () => {
  it('returns a QueryClient instance with default staleTime', () => {
    const client = makeQueryClient()
    expect(client).toBeInstanceOf(QueryClient)
  })
})

describe('getQueryClient', () => {
  it('returns the same instance on repeated calls (browser singleton)', () => {
    const a = getQueryClient()
    const b = getQueryClient()
    expect(a).toBe(b)
  })

  it('returns a QueryClient instance', () => {
    const client = getQueryClient()
    expect(client).toBeInstanceOf(QueryClient)
  })
})
