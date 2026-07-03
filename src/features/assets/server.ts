import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { assets, assetVariants } from '#/db/schema'
import { resolveOrgId } from '#/lib/auth-session'
import { generateSignedDownloadUrl } from '#/lib/r2'
import type { AssetKind, OwnerType, Usage, VariantKey } from './model'
import { IMAGE_MIME_TYPES, USAGE_LIMITS, VIDEO_MIME_TYPES } from './model'

async function resolveUserId(): Promise<string> {
  const { auth } = await import('#/lib/auth')
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error('Not authenticated')
  return session.user.id
}

function getAssetKind(mimeType: string): AssetKind {
  if (IMAGE_MIME_TYPES.includes(mimeType as (typeof IMAGE_MIME_TYPES)[number]))
    return 'image'
  if (VIDEO_MIME_TYPES.includes(mimeType as (typeof VIDEO_MIME_TYPES)[number]))
    return 'video'
  return 'file'
}

type FinalizeUploadInput = {
  assetId?: string
  draftId?: string
  ownerType: OwnerType
  ownerId?: string
  usage: Usage
  originalFilename: string
  mimeType: string
  sizeBytes: number
  checksumSha256?: string
  imageWidth?: number
  imageHeight?: number
  storageKeyOriginal: string
  variantOriginalMimeType: string
  variantOriginalSizeBytes: number
}

type GetUploadUrlInput = {
  fileName: string
  fileType: string
  fileSize: number
  ownerType: OwnerType
  ownerId?: string
  usage: Usage
}
export const finalizeUpload = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown): FinalizeUploadInput => {
    if (!input || typeof input !== 'object') {
      throw new Error('Invalid input')
    }
    const obj = input as Record<string, unknown>

    const ownerType = obj.ownerType as OwnerType
    const usage = obj.usage as Usage
    const mimeType = obj.mimeType as string
    const sizeBytes = Number(obj.sizeBytes)

    if (
      ![
        'product',
        'customer',
        'organization',
        'order',
        'productionTask',
      ].includes(ownerType)
    ) {
      throw new Error('Invalid ownerType')
    }
    if (!['logo', 'profile', 'gallery', 'attachment'].includes(usage)) {
      throw new Error('Invalid usage')
    }
    if (!mimeType) throw new Error('mimeType required')
    if (!sizeBytes || sizeBytes <= 0) throw new Error('Invalid sizeBytes')

    return obj as FinalizeUploadInput
  })
  .handler(
    async ({
      data,
    }): Promise<{
      assetId: string
      variants: {
        variantKey: VariantKey
        storageKey: string
        mimeType: string
        sizeBytes: number
      }[]
    }> => {
      const [orgId, userId, { db }] = await Promise.all([
        resolveOrgId(),
        resolveUserId(),
        import('#/db/index'),
      ])

      const limits = USAGE_LIMITS[data.usage]
      if (data.sizeBytes > limits.maxBytes) {
        throw new Error(
          `File size exceeds ${limits.maxBytes} bytes limit for ${data.usage}`,
        )
      }

      const assetKind = getAssetKind(data.mimeType)
      if (!limits.kinds.includes(assetKind)) {
        throw new Error(`${assetKind} not allowed for ${data.usage}`)
      }

      if (data.ownerId) {
        const activeCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(assets)
          .where(
            and(
              eq(assets.orgId, orgId),
              eq(assets.ownerType, data.ownerType),
              eq(assets.ownerId, data.ownerId),
              eq(assets.usage, data.usage),
              eq(assets.status, 'active'),
            ),
          )
          .limit(1)

        if (Number(activeCount[0]?.count ?? 0) >= limits.maxActive) {
          throw new Error(
            `Maximum ${limits.maxActive} active ${data.usage} assets reached`,
          )
        }
      }

      const assetId = data.assetId ?? crypto.randomUUID()
      const now = new Date()

      const insertValues: {
        id: string
        orgId: string
        ownerType: string
        ownerId: string | null
        draftId: string | null
        usage: string
        assetKind: string
        originalFilename: string
        mimeType: string
        sizeBytes: number
        uploadedByUserId: string
        status: string
        checksumSha256: string | null
        imageWidth: number | null
        imageHeight: number | null
        createdAt: Date
        updatedAt: Date
      } = {
        id: assetId,
        orgId,
        ownerType: data.ownerType,
        ownerId: data.ownerId ?? null,
        draftId: data.draftId ?? null,
        usage: data.usage,
        assetKind,
        originalFilename: data.originalFilename,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        uploadedByUserId: userId,
        status: 'active',
        checksumSha256: data.checksumSha256 ?? null,
        imageWidth: data.imageWidth ?? null,
        imageHeight: data.imageHeight ?? null,
        createdAt: now,
        updatedAt: now,
      }

      await db.insert(assets).values(insertValues)

      const originalVariantId = crypto.randomUUID()
      await db.insert(assetVariants).values({
        id: originalVariantId,
        assetId,
        variantKey: 'original' as VariantKey,
        storageKey: data.storageKeyOriginal,
        mimeType: data.variantOriginalMimeType,
        sizeBytes: data.variantOriginalSizeBytes,
        createdAt: now,
      })

      const insertedVariants = await db
        .select({
          variantKey: assetVariants.variantKey,
          storageKey: assetVariants.storageKey,
          mimeType: assetVariants.mimeType,
          sizeBytes: assetVariants.sizeBytes,
        })
        .from(assetVariants)
        .where(eq(assetVariants.assetId, assetId))

      return {
        assetId,
        variants: insertedVariants.map((v) => ({
          variantKey: v.variantKey as VariantKey,
          storageKey: v.storageKey,
          mimeType: v.mimeType,
          sizeBytes: v.sizeBytes,
        })),
      }
    },
  )

export const getUploadUrl = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown): GetUploadUrlInput => {
    if (!input || typeof input !== 'object') {
      throw new Error('Invalid input')
    }
    const obj = input as Record<string, unknown>

    const ownerType = obj.ownerType as OwnerType
    const usage = obj.usage as Usage
    const fileName = obj.fileName as string
    const fileType = obj.fileType as string
    const fileSize = Number(obj.fileSize)

    if (
      ![
        'product',
        'customer',
        'organization',
        'order',
        'productionTask',
      ].includes(ownerType)
    ) {
      throw new Error('Invalid ownerType')
    }
    if (!['logo', 'profile', 'gallery', 'attachment'].includes(usage)) {
      throw new Error('Invalid usage')
    }
    if (!fileName) throw new Error('fileName required')
    if (!fileType) throw new Error('fileType required')
    if (!fileSize || fileSize <= 0) throw new Error('Invalid fileSize')

    return obj as GetUploadUrlInput
  })
  .handler(
    async ({
      data,
    }): Promise<{ uploadUrl: string; storageKey: string; assetId: string }> => {
      const [orgId, { buildUploadUrl }] = await Promise.all([
        resolveOrgId(),
        import('./model'),
      ])
      return buildUploadUrl(
        orgId,
        data.ownerType,
        data.ownerId ?? 'draft',
        data.fileName,
        data.fileType,
        data.fileSize,
        data.usage,
      )
    },
  )

export const getAssetSignedUrl = createServerFn({ method: 'GET' })
  .inputValidator((input: { assetId: string; variantKey: VariantKey }) => input)
  .handler(async ({ data }): Promise<{ url: string; expiresAt: number }> => {
    const [, { db }] = await Promise.all([resolveOrgId(), import('#/db/index')])

    const requestedVariant = await db
      .select()
      .from(assetVariants)
      .where(
        and(
          eq(assetVariants.assetId, data.assetId),
          eq(assetVariants.variantKey, data.variantKey),
        ),
      )
      .limit(1)

    const originalVariant =
      data.variantKey === 'original'
        ? []
        : await db
            .select()
            .from(assetVariants)
            .where(
              and(
                eq(assetVariants.assetId, data.assetId),
                eq(assetVariants.variantKey, 'original'),
              ),
            )
            .limit(1)

    const fallbackVariant = await db
      .select()
      .from(assetVariants)
      .where(eq(assetVariants.assetId, data.assetId))
      .limit(1)

    const variant =
      requestedVariant[0] ?? originalVariant[0] ?? fallbackVariant[0]

    if (!variant) throw new Error('Variant not found')

    const key = variant.storageKey
    const ttl = data.variantKey === 'original' ? 5 * 60 : 15 * 60

    return generateSignedDownloadUrl(key, ttl)
  })

export type AssetMetadata = {
  id: string
  originalFilename: string
  mimeType: string
  sizeBytes: number
  assetKind: string
}

export const getAssetsMetadata = createServerFn({ method: 'GET' })
  .inputValidator((input: { assetIds: string[] }) => input)
  .handler(async ({ data }): Promise<AssetMetadata[]> => {
    const [orgId, { db }] = await Promise.all([
      resolveOrgId(),
      import('#/db/index'),
    ])

    const rows = await db
      .select({
        id: assets.id,
        originalFilename: assets.originalFilename,
        mimeType: assets.mimeType,
        sizeBytes: assets.sizeBytes,
        assetKind: assets.assetKind,
      })
      .from(assets)
      .where(
        and(
          eq(assets.orgId, orgId),
          eq(assets.status, 'active'),
          inArray(assets.id, data.assetIds),
        ),
      )

    return rows
  })

export const deleteAsset = createServerFn({ method: 'POST' })
  .inputValidator((input: { assetId: string }) => input)
  .handler(
    async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
      const [orgId, { db }] = await Promise.all([
        resolveOrgId(),
        import('#/db/index'),
      ])

      const updated = await db
        .update(assets)
        .set({
          status: 'deleted',
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(assets.id, data.assetId),
            eq(assets.orgId, orgId),
            eq(assets.status, 'active'),
          ),
        )
        .returning({ id: assets.id })

      if (updated.length === 0) {
        return { ok: false, error: 'notFound' }
      }

      return { ok: true }
    },
  )
