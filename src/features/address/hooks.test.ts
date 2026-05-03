import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSearchAreas } from './hooks'

const mockSearchAreasFn = vi.fn()

vi.mock('#/features/address/model', () => ({
  searchAreasFn: (...args: unknown[]) => mockSearchAreasFn(...args),
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

describe('useSearchAreas', () => {
  beforeEach(() => {
    mockSearchAreasFn.mockReset()
  })

  it('does not fetch when query is empty', () => {
    renderHook(() => useSearchAreas(''), { wrapper: createWrapper() })
    expect(mockSearchAreasFn).not.toHaveBeenCalled()
  })

  it('calls searchAreasFn when query is non-empty', async () => {
    mockSearchAreasFn.mockResolvedValue([])
    renderHook(() => useSearchAreas('jakarta'), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(mockSearchAreasFn).toHaveBeenCalledWith({
        data: { query: 'jakarta' },
      })
    })
  })
})
