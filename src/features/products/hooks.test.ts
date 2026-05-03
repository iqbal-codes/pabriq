import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCreateProduct, useProductsList } from './hooks'

const mockListProductsFn = vi.fn()
const mockCreateProductFn = vi.fn()

vi.mock('#/features/products/server', () => ({
  listProductsFn: (...args: unknown[]) => mockListProductsFn(...args),
  createProductFn: (...args: unknown[]) => mockCreateProductFn(...args),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    )
  }
}

describe('useProductsList', () => {
  beforeEach(() => {
    mockListProductsFn.mockReset()
  })

  it('calls listProductsFn with orgId and search', async () => {
    mockListProductsFn.mockResolvedValue({ rows: [], totalRows: 0 })

    renderHook(() => useProductsList({ orgId: 'org-1', search: 'test' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(mockListProductsFn).toHaveBeenCalledWith({
        data: { orgId: 'org-1', search: 'test' },
      })
    })
  })

  it('returns empty rows when no products exist', async () => {
    mockListProductsFn.mockResolvedValue({ rows: [], totalRows: 0 })

    const { result } = renderHook(() => useProductsList({ orgId: 'org-1' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data?.rows).toEqual([])
    })
  })
})

describe('useCreateProduct', () => {
  beforeEach(() => {
    mockCreateProductFn.mockReset()
  })

  it('calls createProductFn with input data', async () => {
    mockCreateProductFn.mockResolvedValue({ id: 'new-id' })

    const { result } = renderHook(() => useCreateProduct(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ name: 'Test' } as never)

    await waitFor(() => {
      expect(mockCreateProductFn).toHaveBeenCalledWith({
        data: { name: 'Test' },
      })
    })
  })
})
