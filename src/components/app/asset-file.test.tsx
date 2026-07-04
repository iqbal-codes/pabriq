import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import type { AssetMetadata } from '#/features/assets/server'
import { AssetFileList } from './asset-file'

const mockGetAssetSignedUrl = vi.hoisted(() => vi.fn())
const mockGetAssetsMetadata = vi.hoisted(() => vi.fn())

vi.mock('#/features/assets/server', () => ({
  getAssetSignedUrl: mockGetAssetSignedUrl,
  getAssetsMetadata: mockGetAssetsMetadata,
}))

const messages = {
  common: {
    preview: 'Preview',
    close: 'Close',
    download: 'Download',
    file: 'File',
    noAttachments: 'No attachments',
    moreFiles: '+{count} more {count, plural, one {file} other {files}}',
  },
}

const imageAsset: AssetMetadata = {
  id: 'img-1',
  originalFilename: 'design.png',
  mimeType: 'image/png',
  sizeBytes: 204_800,
  assetKind: 'image',
}

const videoAsset: AssetMetadata = {
  id: 'vid-1',
  originalFilename: 'cut.mp4',
  mimeType: 'video/mp4',
  sizeBytes: 5_242_880,
  assetKind: 'video',
}

const fileAsset: AssetMetadata = {
  id: 'file-1',
  originalFilename: 'layout.cdr',
  mimeType: 'application/coreldraw',
  sizeBytes: 102_400,
  assetKind: 'file',
}

const allAssets: AssetMetadata[] = [imageAsset, videoAsset, fileAsset]

function renderFileList() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={messages}>
        <AssetFileList
          assetIds={['img-1', 'vid-1', 'file-1']}
          layout="grid"
          showSize={false}
        />
      </IntlProvider>
    </QueryClientProvider>,
  )
}

describe('AssetFileList', () => {
  it('shows uppercase extension placeholders for non-image assets', async () => {
    mockGetAssetsMetadata.mockResolvedValue(allAssets)
    mockGetAssetSignedUrl.mockImplementation(async (input) => ({
      url: `https://cdn.example.com/${input.data.variantKey}/${input.data.assetId}`,
      expiresAt: Date.now() + 60_000,
    }))

    renderFileList()

    expect(await screen.findByText('MP4')).toBeDefined()
    expect(screen.getByText('CDR')).toBeDefined()
  })

  it('renders download links with correct download attribute for non-image assets', async () => {
    mockGetAssetsMetadata.mockResolvedValue(allAssets)
    mockGetAssetSignedUrl.mockImplementation(async (input) => ({
      url: `https://cdn.example.com/${input.data.variantKey}/${input.data.assetId}`,
      expiresAt: Date.now() + 60_000,
    }))

    renderFileList()

    await waitFor(() => {
      expect(mockGetAssetsMetadata).toHaveBeenCalled()
    })

    // Wait for signed URLs to resolve so non-image cards become <a> links
    const videoLink = await screen.findByRole('link', {
      name: 'Download cut.mp4',
    })
    expect(videoLink).toHaveAttribute('download', 'cut.mp4')

    const fileLink = await screen.findByRole('link', {
      name: 'Download layout.cdr',
    })
    expect(fileLink).toHaveAttribute('download', 'layout.cdr')
  })

  it('calls getAssetSignedUrl with disposition attachment for non-image assets', async () => {
    mockGetAssetsMetadata.mockResolvedValue(allAssets)
    mockGetAssetSignedUrl.mockImplementation(async (input) => ({
      url: `https://cdn.example.com/${input.data.variantKey}/${input.data.assetId}`,
      expiresAt: Date.now() + 60_000,
    }))

    renderFileList()

    await waitFor(() => {
      expect(mockGetAssetsMetadata).toHaveBeenCalled()
    })

    // Non-image assets (video, file) should be called with disposition: 'attachment' and variantKey: 'original'
    await waitFor(() => {
      expect(mockGetAssetSignedUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assetId: 'vid-1',
            variantKey: 'original',
            disposition: 'attachment',
          }),
        }),
      )
      expect(mockGetAssetSignedUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assetId: 'file-1',
            variantKey: 'original',
            disposition: 'attachment',
          }),
        }),
      )
    })
  })

  it('does not call getAssetSignedUrl with variantKey preview for video assets', async () => {
    mockGetAssetsMetadata.mockResolvedValue(allAssets)
    mockGetAssetSignedUrl.mockImplementation(async (input) => ({
      url: `https://cdn.example.com/${input.data.variantKey}/${input.data.assetId}`,
      expiresAt: Date.now() + 60_000,
    }))

    renderFileList()

    await waitFor(() => {
      expect(mockGetAssetsMetadata).toHaveBeenCalled()
    })

    // Allow queries to settle
    await waitFor(() => {
      expect(mockGetAssetSignedUrl).toHaveBeenCalled()
    })

    // Verify no preview call was made for the video asset
    const previewCallsForVideo = mockGetAssetSignedUrl.mock.calls.filter(
      (call) => {
        const data = call[0]?.data as
          | { assetId?: string; variantKey?: string }
          | undefined
        return data?.assetId === 'vid-1' && data?.variantKey === 'preview'
      },
    )
    expect(previewCallsForVideo).toHaveLength(0)
  })
})
