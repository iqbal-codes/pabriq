import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useCreateCustomer,
  useCustomer,
  useCustomersList,
  useUpdateCustomer,
} from './hooks'

const mockListCustomersFn = vi.fn()
const mockGetCustomerFn = vi.fn()
const mockCreateCustomerFn = vi.fn()
const mockUpdateCustomerFn = vi.fn()

vi.mock('#/features/customers/server', () => ({
  listCustomersFn: (...args: unknown[]) => mockListCustomersFn(...args),
  getCustomerFn: (...args: unknown[]) => mockGetCustomerFn(...args),
  createCustomerFn: (...args: unknown[]) => mockCreateCustomerFn(...args),
  updateCustomerFn: (...args: unknown[]) => mockUpdateCustomerFn(...args),
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

describe('useCustomersList', () => {
  beforeEach(() => {
    mockListCustomersFn.mockReset()
  })

  it('calls listCustomersFn with orgId', async () => {
    mockListCustomersFn.mockResolvedValue({ rows: [], totalRows: 0 })
    renderHook(() => useCustomersList({ orgId: 'org-1' }), {
      wrapper: createWrapper(),
    })
    await waitFor(() => {
      expect(mockListCustomersFn).toHaveBeenCalledWith({
        data: { orgId: 'org-1' },
      })
    })
  })
})

describe('useCustomer', () => {
  beforeEach(() => {
    mockGetCustomerFn.mockReset()
  })

  it('calls getCustomerFn with id', async () => {
    mockGetCustomerFn.mockResolvedValue(null)
    renderHook(() => useCustomer('cust-1'), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(mockGetCustomerFn).toHaveBeenCalledWith({ data: { id: 'cust-1' } })
    })
  })
})

describe('useCreateCustomer', () => {
  beforeEach(() => {
    mockCreateCustomerFn.mockReset()
  })

  it('calls createCustomerFn with input', async () => {
    mockCreateCustomerFn.mockResolvedValue({ ok: true })
    const { result } = renderHook(() => useCreateCustomer(), {
      wrapper: createWrapper(),
    })
    result.current.mutate({ name: 'Test Co' } as never)
    await waitFor(() => {
      expect(mockCreateCustomerFn).toHaveBeenCalledWith({
        data: { name: 'Test Co' },
      })
    })
  })
})

describe('useUpdateCustomer', () => {
  beforeEach(() => {
    mockUpdateCustomerFn.mockReset()
  })

  it('calls updateCustomerFn with input', async () => {
    mockUpdateCustomerFn.mockResolvedValue({ ok: true })
    const { result } = renderHook(() => useUpdateCustomer(), {
      wrapper: createWrapper(),
    })
    result.current.mutate({ id: 'cust-1', name: 'Updated Co' } as never)
    await waitFor(() => {
      expect(mockUpdateCustomerFn).toHaveBeenCalledWith({
        data: { id: 'cust-1', name: 'Updated Co' },
      })
    })
  })
})
