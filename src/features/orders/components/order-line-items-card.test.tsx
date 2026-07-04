import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import type { AssetMetadata } from '#/features/assets/server'
import { OrderLineItemsCard } from './order-line-items-card'

const mocks = vi.hoisted(() => ({
  getAssetsForLineItemFn: vi.fn(),
  getAssetSignedUrl: vi.fn(),
  getAssetsMetadata: vi.fn(),
}))

vi.mock('#/features/orders/server', () => ({
  getAssetsForLineItemFn: mocks.getAssetsForLineItemFn,
}))

vi.mock('#/features/production/hooks', () => ({
  useOrderTasksTimeline: () => ({ data: [] }),
  useTaskByLineItemId: () => null,
}))

vi.mock('#/features/assets/server', () => ({
  getAssetSignedUrl: mocks.getAssetSignedUrl,
  getAssetsMetadata: mocks.getAssetsMetadata,
}))

vi.mock('#/components/app/asset-image', () => ({
  AssetImage: ({
    assetId,
    assetKind,
  }: {
    assetId: string
    assetKind: string
  }) => (
    <img
      alt={`${assetKind} ${assetId}`}
      data-testid={`asset-image-${assetId}`}
    />
  ),
}))

vi.mock('#/features/orders/line-item-display', () => ({
  getVisibleDesignName: (designName: string | null, productName: string) =>
    designName && designName !== productName ? designName : null,
}))

const messages = {
  orders: { lineItems: 'Line Items', total: 'Total' },
  common: { file: 'File', download: 'Download' },
  production: {},
  portal: {},
}

const lineItem = {
  id: 'item-1',
  productId: 'product-1',
  productName: 'Canvas Bag',
  designName: null,
  notes: null,
  quantity: 10,
  unitPrice: 50000,
  total: 500000,
}

const mockAssets: AssetMetadata[] = [
  {
    id: 'img-1',
    originalFilename: 'mockup.png',
    mimeType: 'image/png',
    sizeBytes: 1024000,
    assetKind: 'image',
  },
  {
    id: 'file-1',
    originalFilename: 'brief.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 512000,
    assetKind: 'file',
  },
]

function renderCard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={messages}>
        <OrderLineItemsCard
          lineItems={[lineItem]}
          orgId="org-1"
          orderId="order-1"
        />
      </IntlProvider>
    </QueryClientProvider>,
  )
}

describe('OrderLineItemsCard', () => {
  it('renders non-image attachments as extension placeholders with download links, not as image thumbnails', async () => {
    mocks.getAssetsForLineItemFn.mockResolvedValue(mockAssets)
    mocks.getAssetSignedUrl.mockResolvedValue({
      url: 'https://signed.example.com/download/file-1',
      expiresAt: Date.now() + 300000,
    })

    renderCard()

    await waitFor(() => {
      expect(mocks.getAssetsForLineItemFn).toHaveBeenCalledWith({
        data: { lineItemId: 'item-1', orgId: 'org-1' },
      })
    })

    // Image asset renders through AssetImage (mocked as <img>)
    await waitFor(() => {
      expect(screen.getByTestId('asset-image-img-1')).toBeInTheDocument()
    })

    // PDF extension placeholder shows uppercase extension, not an image thumbnail
    expect(screen.getByText('PDF')).toBeInTheDocument()

    // PDF filename is visible
    expect(screen.getByText('brief.pdf')).toBeInTheDocument()

    // Download link for the non-image asset with correct download attribute
    const pdfLink = screen.getByRole('link', {
      name: /Download brief\.pdf/,
    })
    expect(pdfLink).toHaveAttribute('download', 'brief.pdf')

    // getAssetSignedUrl called with disposition: 'attachment' for the file asset
    expect(mocks.getAssetSignedUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assetId: 'file-1',
          variantKey: 'original',
          disposition: 'attachment',
        }),
      }),
    )

    // PDF does NOT render through AssetImage — proves the old
    // hardcoded AssetImage assetKind="image" path is not used
    expect(screen.queryByTestId('asset-image-file-1')).not.toBeInTheDocument()
  })
})
