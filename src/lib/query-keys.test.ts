import { describe, expect, it } from 'vitest'
import { queryKeys } from './query-keys'

describe('queryKeys.products', () => {
  it('all returns ["products"]', () => {
    expect(queryKeys.products.all).toEqual(['products'])
  })

  it('list builds key with filters', () => {
    const key = queryKeys.products.list({ orgId: 'org1', search: 'foo' })
    expect(key).toEqual(['products', 'list', { orgId: 'org1', search: 'foo' }])
  })

  it('detail builds key with id', () => {
    const key = queryKeys.products.detail('prod-1')
    expect(key).toEqual(['products', 'detail', 'prod-1'])
  })

  it('lists returns parent key for invalidation', () => {
    expect(queryKeys.products.lists()).toEqual(['products', 'list'])
  })
})

describe('queryKeys.customers', () => {
  it('list builds key with orgId', () => {
    const key = queryKeys.customers.list({ orgId: 'org1' })
    expect(key[0]).toBe('customers')
    expect(key[1]).toBe('list')
  })
})

describe('queryKeys.orders', () => {
  it('list builds key with orgId', () => {
    const key = queryKeys.orders.list({ orgId: 'org1' })
    expect(key[0]).toBe('orders')
    expect(key[1]).toBe('list')
  })
})

describe('queryKeys.assets', () => {
  it('signedUrl builds key with assetId', () => {
    const key = queryKeys.assets.signedUrl('asset-1')
    expect(key).toEqual(['assets', 'signed-url', 'asset-1'])
  })
})

describe('queryKeys.portal', () => {
  it('order builds key with token', () => {
    const key = queryKeys.portal.order('token-123')
    expect(key).toEqual(['portal', 'order', 'token-123'])
  })
})

describe('queryKeys.address', () => {
  it('areas builds key with query', () => {
    const key = queryKeys.address.areas('jakarta')
    expect(key).toEqual(['address', 'areas', 'jakarta'])
  })
})
