import { render, screen } from '@testing-library/react'
import type { ImgHTMLAttributes, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AvatarPhoto } from './avatar-photo'

const mockUseAssetSignedUrl = vi.fn()

vi.mock('#/components/ui/avatar', () => ({
  Avatar: ({
    children,
    className,
  }: {
    children: ReactNode
    className?: string
  }) => (
    <span data-slot="avatar" className={className}>
      {children}
    </span>
  ),
  AvatarImage: (props: ImgHTMLAttributes<HTMLImageElement>) => (
    <img alt="" data-slot="avatar-image" {...props} />
  ),
  AvatarFallback: ({ children }: { children: ReactNode }) => (
    <span data-slot="avatar-fallback">{children}</span>
  ),
}))

vi.mock('#/features/assets/hooks', () => ({
  useAssetSignedUrl: (...args: [string | null, 'preview']) =>
    mockUseAssetSignedUrl(...args),
}))

describe('AvatarPhoto', () => {
  beforeEach(() => {
    mockUseAssetSignedUrl.mockReset()
    mockUseAssetSignedUrl.mockReturnValue({ data: undefined })
  })

  it('renders the signed image when available', () => {
    mockUseAssetSignedUrl.mockReturnValue({
      data: { url: 'https://example.com/avatar.jpg' },
    })

    render(<AvatarPhoto assetId="asset-1" name="Jane Doe" />)

    expect(mockUseAssetSignedUrl).toHaveBeenCalledWith('asset-1', 'preview')
    expect(screen.getByAltText('Jane Doe')).toHaveAttribute(
      'src',
      'https://example.com/avatar.jpg',
    )
  })

  it('renders initials fallback when there is no photo', () => {
    render(<AvatarPhoto assetId={null} name="Jane Doe" />)

    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('keeps the avatar circular with custom sizing', () => {
    const { container } = render(
      <AvatarPhoto assetId={null} name="Jane Doe" className="size-16" />,
    )

    expect(container.firstElementChild).toHaveClass('rounded-full', 'size-16')
  })
})
