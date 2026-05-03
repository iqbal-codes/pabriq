import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAssetSignedUrl } from './hooks'

const mockGetAssetSignedUrl = vi.fn()

vi.mock('#/features/assets/server', () => ({
  getAssetSignedUrl: (...args: unknown[]) => mockGetAssetSignedUrl(...args),
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

describe('useAssetSignedUrl', () => {
  beforeEach(() => {
    mockGetAssetSignedUrl.mockReset()
  })

  it('does not fetch when assetId is null', () => {
    renderHook(() => useAssetSignedUrl(null), { wrapper: createWrapper() })
    expect(mockGetAssetSignedUrl).not.toHaveBeenCalled()
  })

  it('fetches signed URL when assetId is provided', async () => {
    mockGetAssetSignedUrl.mockResolvedValue({
      url: 'https://example.com/img',
      expiresAt: 999,
    })
    renderHook(() => useAssetSignedUrl('asset-1'), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(mockGetAssetSignedUrl).toHaveBeenCalledWith({
        data: { assetId: 'asset-1', variantKey: 'preview' },
      })
    })
  })
})
