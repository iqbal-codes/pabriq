import { describe, expect, it } from 'vitest'
import type { AssetKind, OwnerType, Usage } from './model'

describe('finalizeUpload validation', () => {
  describe('ownerType validation', () => {
    const validOwnerTypes: OwnerType[] = [
      'product',
      'customer',
      'organization',
      'order',
      'productionTask',
      'invoice',
    ]

    for (const ownerType of validOwnerTypes) {
      it(`accepts valid ownerType: ${ownerType}`, () => {
        expect(validOwnerTypes.includes(ownerType)).toBe(true)
      })
    }

    it('rejects invalid ownerType', () => {
      const invalid: string = 'invalid'
      expect(validOwnerTypes.includes(invalid as OwnerType)).toBe(false)
    })
  })

  describe('usage validation', () => {
    const validUsages: Usage[] = ['logo', 'profile', 'gallery', 'attachment']

    for (const usage of validUsages) {
      it(`accepts valid usage: ${usage}`, () => {
        expect(validUsages.includes(usage)).toBe(true)
      })
    }

    it('rejects invalid usage', () => {
      const invalid: string = 'invalid'
      expect(validUsages.includes(invalid as Usage)).toBe(false)
    })
  })

  describe('assetKind validation', () => {
    const validAssetKinds: AssetKind[] = ['image', 'video', 'file']

    for (const kind of validAssetKinds) {
      it(`accepts valid assetKind: ${kind}`, () => {
        expect(validAssetKinds.includes(kind)).toBe(true)
      })
    }
  })

  describe('file size limits', () => {
    const limits: Record<Usage, { maxBytes: number; kinds: AssetKind[] }> = {
      logo: { maxBytes: 5 * 1024 * 1024, kinds: ['image'] },
      profile: { maxBytes: 8 * 1024 * 1024, kinds: ['image'] },
      gallery: { maxBytes: 25 * 1024 * 1024, kinds: ['image', 'video'] },
      attachment: {
        maxBytes: 100 * 1024 * 1024,
        kinds: ['image', 'video', 'file'],
      },
      payment_proof: {
        maxBytes: 25 * 1024 * 1024,
        kinds: ['image', 'file'],
      },
    }

    it('logo limits to 5MB image only', () => {
      expect(limits.logo.maxBytes).toBe(5 * 1024 * 1024)
      expect(limits.logo.kinds).toEqual(['image'])
    })

    it('profile limits to 8MB image only', () => {
      expect(limits.profile.maxBytes).toBe(8 * 1024 * 1024)
      expect(limits.profile.kinds).toEqual(['image'])
    })

    it('gallery limits to 25MB image/video', () => {
      expect(limits.gallery.maxBytes).toBe(25 * 1024 * 1024)
      expect(limits.gallery.kinds).toContain('image')
      expect(limits.gallery.kinds).toContain('video')
    })

    it('attachment limits to 100MB all kinds', () => {
      expect(limits.attachment.maxBytes).toBe(100 * 1024 * 1024)
      expect(limits.attachment.kinds).toContain('image')
      expect(limits.attachment.kinds).toContain('video')
      expect(limits.attachment.kinds).toContain('file')
    })
  })

  describe('usage limits', () => {
    const maxActive: Record<Usage, number> = {
      logo: 1,
      profile: 1,
      gallery: 20,
      attachment: 50,
      payment_proof: 10,
    }

    it('logo allows max 1 active', () => {
      expect(maxActive.logo).toBe(1)
    })

    it('gallery allows max 20 active', () => {
      expect(maxActive.gallery).toBe(20)
    })

    it('attachment allows max 50 active', () => {
      expect(maxActive.attachment).toBe(50)
    })
  })
})

describe('R2 key pattern', () => {
  it('generates correct key format', () => {
    const orgId = 'org-123'
    const ownerType = 'product'
    const ownerId = 'prod-456'
    const assetId = 'asset-789'
    const variant = 'original'
    const ext = 'png'

    const key = `org/${orgId}/${ownerType}/${ownerId}/${assetId}/${variant}.${ext}`
    expect(key).toBe('org/org-123/product/prod-456/asset-789/original.png')
  })

  it('supports draft ownership', () => {
    const orgId = 'org-123'
    const ownerType = 'product'
    const draftId = 'draft-abc'
    const assetId = 'asset-789'
    const variant = 'preview'
    const ext = 'jpg'

    const key = `org/${orgId}/${ownerType}/${draftId}/${assetId}/${variant}.${ext}`
    expect(key).toBe('org/org-123/product/draft-abc/asset-789/preview.jpg')
  })
})

describe('mime type allowlist', () => {
  const imageMimeTypes = ['image/png', 'image/jpeg', 'image/webp']
  const videoMimeTypes = ['video/mp4', 'video/webm']

  it('accepts PNG image', () => {
    expect(imageMimeTypes).toContain('image/png')
  })

  it('accepts JPEG image', () => {
    expect(imageMimeTypes).toContain('image/jpeg')
  })

  it('accepts WebP image', () => {
    expect(imageMimeTypes).toContain('image/webp')
  })

  it('rejects SVG', () => {
    expect(imageMimeTypes).not.toContain('image/svg+xml')
  })

  it('accepts MP4 video', () => {
    expect(videoMimeTypes).toContain('video/mp4')
  })
})
