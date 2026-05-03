import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useConfirmPortalOrder, usePortalOrder } from './hooks'

const mockGetPortalOrderFn = vi.fn()
const mockConfirmPortalOrderFn = vi.fn()

vi.mock('#/features/portal/server', () => ({
  getPortalOrderFn: (...args: unknown[]) => mockGetPortalOrderFn(...args),
  confirmPortalOrderFn: (...args: unknown[]) =>
    mockConfirmPortalOrderFn(...args),
  generateOrderTokenFn: vi.fn(),
  updatePortalLineItemFn: vi.fn(),
  savePortalAddressFn: vi.fn(),
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

describe('usePortalOrder', () => {
  beforeEach(() => {
    mockGetPortalOrderFn.mockReset()
  })

  it('calls getPortalOrderFn with token', async () => {
    mockGetPortalOrderFn.mockResolvedValue({ ok: true, order: null })
    renderHook(() => usePortalOrder('tok-1'), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(mockGetPortalOrderFn).toHaveBeenCalledWith({
        data: { token: 'tok-1' },
      })
    })
  })
})

describe('useConfirmPortalOrder', () => {
  beforeEach(() => {
    mockConfirmPortalOrderFn.mockReset()
  })

  it('calls confirmPortalOrderFn with orderId', async () => {
    mockConfirmPortalOrderFn.mockResolvedValue({ ok: true })
    const { result } = renderHook(() => useConfirmPortalOrder(), {
      wrapper: createWrapper(),
    })
    result.current.mutate({ orderId: 'ord-1' })
    await waitFor(() => {
      expect(mockConfirmPortalOrderFn).toHaveBeenCalledWith({
        data: { orderId: 'ord-1' },
      })
    })
  })
})
