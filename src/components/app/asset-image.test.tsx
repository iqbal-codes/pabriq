import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import type { AssetKind } from '#/features/assets/model'
import { AssetImage } from './asset-image'

const mockGetAssetSignedUrl = vi.hoisted(() => vi.fn())

vi.mock('#/features/assets/server', () => ({
  getAssetSignedUrl: mockGetAssetSignedUrl,
}))

const messages = {
  common: {
    preview: 'Preview',
    close: 'Close',
  },
}

function renderAsset(assetId: string | null, assetKind?: AssetKind) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={messages}>
        <AssetImage assetId={assetId} assetKind={assetKind} />
      </IntlProvider>
    </QueryClientProvider>,
  )
}

describe('AssetImage', () => {
  it('fetches a preview URL and renders a Preview button for image assets', async () => {
    mockGetAssetSignedUrl.mockResolvedValue({
      url: 'https://cdn.example.com/preview.png',
      expiresAt: Date.now() + 60_000,
    })

    renderAsset('img-1', 'image')

    const button = await screen.findByRole('button', { name: 'Preview' })
    expect(button).toBeDefined()

    expect(mockGetAssetSignedUrl).toHaveBeenCalledWith({
      data: { assetId: 'img-1', variantKey: 'preview', token: undefined },
    })
  })

  it('does not call getAssetSignedUrl and renders no Preview button for video assets', () => {
    mockGetAssetSignedUrl.mockClear()

    renderAsset('video-1', 'video')

    expect(mockGetAssetSignedUrl).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Preview' })).toBeNull()
  })

  it('renders a Package fallback for null assetId', async () => {
    mockGetAssetSignedUrl.mockClear()

    renderAsset(null, 'image')

    expect(mockGetAssetSignedUrl).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Preview' })).toBeNull()
  })
})
