import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type React from 'react'
import { toast } from 'sonner'
import { IntlProvider } from 'use-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCopyOrderPortalLink } from './use-copy-order-portal-link'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockGenerateOrderTokenFn = vi.fn()

vi.mock('#/features/portal/server', () => ({
  generateOrderTokenFn: (...args: unknown[]) =>
    mockGenerateOrderTokenFn(...args),
}))

const messages = {
  orders: {
    copyLinkFailed: 'Could not copy',
    linkCopied: 'Copied',
    openPortalLink: 'Open Link',
    loadOrdersFailed: 'Failed',
    loadOrdersFailedDesc: 'Desc',
    customerDueDate: 'Due',
    internalDeadline: 'Deadline',
    overdueDeadline: 'Overdue',
  },
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale="en" messages={messages}>
          {children}
        </IntlProvider>
      </QueryClientProvider>
    )
  }
}

describe('useCopyOrderPortalLink', () => {
  const originalWriteText = navigator.clipboard.writeText

  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerateOrderTokenFn.mockReset()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn() },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: originalWriteText },
      writable: true,
      configurable: true,
    })
  })

  it('copies existing token URL and shows linkCopied toast', async () => {
    const { result } = renderHook(() => useCopyOrderPortalLink(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.copyPortalLink({
        id: 'order-1',
        orderToken: 'token-1',
      })
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      `${window.location.origin}/order/token-1`,
    )
    expect(mockGenerateOrderTokenFn).not.toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Copied')
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('generates token when missing, copies URL, and invalidates query keys', async () => {
    mockGenerateOrderTokenFn.mockResolvedValue({ token: 'new-token-99' })

    const { result } = renderHook(() => useCopyOrderPortalLink(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.copyPortalLink({
        id: 'order-1',
        orderToken: null,
      })
    })

    expect(mockGenerateOrderTokenFn).toHaveBeenCalledWith({
      data: { orderId: 'order-1' },
    })
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      `${window.location.origin}/order/new-token-99`,
    )
    expect(toast.success).toHaveBeenCalledWith('Copied')
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('shows copyLinkFailed toast on clipboard rejection and does NOT show success', async () => {
    const writeTextMock = vi
      .fn()
      .mockRejectedValue(new Error('Clipboard denied'))
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useCopyOrderPortalLink(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.copyPortalLink({
        id: 'order-1',
        orderToken: 'token-1',
      })
    })

    expect(writeTextMock).toHaveBeenCalledWith(
      `${window.location.origin}/order/token-1`,
    )
    expect(toast.error).toHaveBeenCalledWith('Could not copy')
    expect(toast.success).not.toHaveBeenCalled()
  })
})
