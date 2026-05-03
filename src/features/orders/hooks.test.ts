import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCreateDraftOrder, useOrdersList } from './hooks'

const mockListOrdersFn = vi.fn()
const mockCreateDraftOrderFn = vi.fn()

vi.mock('#/features/orders/server', () => ({
  listOrdersFn: (...args: unknown[]) => mockListOrdersFn(...args),
  getOrderFn: vi.fn(),
  createDraftOrderFn: (...args: unknown[]) => mockCreateDraftOrderFn(...args),
  updateLineItemFn: vi.fn(),
  removeLineItemFn: vi.fn(),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    )
  }
}

describe('useOrdersList', () => {
  beforeEach(() => {
    mockListOrdersFn.mockReset()
  })

  it('calls listOrdersFn with orgId', async () => {
    mockListOrdersFn.mockResolvedValue({ rows: [], totalRows: 0 })
    renderHook(() => useOrdersList({ orgId: 'org-1' }), {
      wrapper: createWrapper(),
    })
    await waitFor(() => {
      expect(mockListOrdersFn).toHaveBeenCalledWith({
        data: { orgId: 'org-1' },
      })
    })
  })
})

describe('useCreateDraftOrder', () => {
  beforeEach(() => {
    mockCreateDraftOrderFn.mockReset()
  })

  it('calls createDraftOrderFn with input', async () => {
    mockCreateDraftOrderFn.mockResolvedValue({ ok: true, orderId: 'ord-1' })
    const { result } = renderHook(() => useCreateDraftOrder(), {
      wrapper: createWrapper(),
    })
    result.current.mutate({
      orgId: 'org-1',
      customerId: 'cust-1',
      lineItems: [],
    } as never)
    await waitFor(() => {
      expect(mockCreateDraftOrderFn).toHaveBeenCalledWith({
        data: { orgId: 'org-1', customerId: 'cust-1', lineItems: [] },
      })
    })
  })
})
