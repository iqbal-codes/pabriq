import { eq } from 'drizzle-orm'

export type OwnerType =
  | 'product'
  | 'customer'
  | 'organization'
  | 'order'
  | 'productionTask'
  | 'invoice'
export type Usage =
  | 'logo'
  | 'profile'
  | 'gallery'
  | 'attachment'
  | 'payment_proof'
export type AssetKind = 'image' | 'video' | 'file'
export type VariantKey = 'preview' | 'full' | 'original'

export const IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const
export const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm'] as const
export const FILE_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

export const USAGE_LIMITS: Record<
  Usage,
  { maxActive: number; maxBytes: number; kinds: AssetKind[] }
> = {
  logo: { maxActive: 1, maxBytes: 5 * 1024 * 1024, kinds: ['image'] },
  profile: { maxActive: 1, maxBytes: 8 * 1024 * 1024, kinds: ['image'] },
  gallery: {
    maxActive: 20,
    maxBytes: 25 * 1024 * 1024,
    kinds: ['image', 'video'],
  },
  attachment: {
    maxActive: 50,
    maxBytes: 100 * 1024 * 1024,
    kinds: ['image', 'video', 'file'],
  },
  payment_proof: {
    maxActive: 10,
    maxBytes: 25 * 1024 * 1024,
    kinds: ['image', 'file'],
  },
}

export const SIGNED_URL_TTL_SECONDS: Record<VariantKey, number> = {
  preview: 15 * 60,
  full: 15 * 60,
  original: 5 * 60,
}

function getAssetKind(mimeType: string): AssetKind {
  if (IMAGE_MIME_TYPES.includes(mimeType as (typeof IMAGE_MIME_TYPES)[number]))
    return 'image'
  if (VIDEO_MIME_TYPES.includes(mimeType as (typeof VIDEO_MIME_TYPES)[number]))
    return 'video'
  return 'file'
}

export type BuildUploadUrlResult = {
  uploadUrl: string
  storageKey: string
  assetId: string
}

export async function buildUploadUrl(
  orgId: string,
  ownerType: OwnerType,
  ownerId: string,
  fileName: string,
  fileType: string,
  fileSize: number,
  usage: Usage,
): Promise<BuildUploadUrlResult> {
  const { generateSignedUploadUrl, buildR2Key } = await import('#/lib/r2')

  const limits = USAGE_LIMITS[usage]
  if (fileSize > limits.maxBytes) {
    throw new Error(
      `File size exceeds ${limits.maxBytes} bytes limit for ${usage}`,
    )
  }

  const assetKind = getAssetKind(fileType)
  if (!limits.kinds.includes(assetKind)) {
    throw new Error(`${assetKind} not allowed for ${usage}`)
  }

  const parts = fileName.split('.')
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'bin'

  const assetId = crypto.randomUUID()
  const storageKey = buildR2Key(
    orgId,
    ownerType,
    ownerId,
    assetId,
    'original',
    ext,
  )

  const { url } = await generateSignedUploadUrl(
    storageKey,
    fileType || 'application/octet-stream',
    900,
  )

  return {
    uploadUrl: url,
    storageKey,
    assetId,
  }
}

export type InsertAssetInput = {
  assetId: string
  orgId: string
  ownerType: OwnerType
  ownerId: string | null
  draftId?: string | null
  usage: Usage
  originalFilename: string
  mimeType: string
  sizeBytes: number
  checksumSha256?: string | null
  imageWidth?: number | null
  imageHeight?: number | null
  storageKeyOriginal: string
  variantOriginalMimeType: string
  variantOriginalSizeBytes: number
  uploadedByUserId?: string
}

export type InsertAssetResult = {
  assetId: string
  variants: {
    variantKey: VariantKey
    storageKey: string
    mimeType: string
    sizeBytes: number
  }[]
}

export async function insertAsset(
  input: InsertAssetInput,
): Promise<InsertAssetResult> {
  const [{ db }, { assets, assetVariants }] = await Promise.all([
    import('#/db/index'),
    import('#/db/schema'),
  ])

  const assetKind = getAssetKind(input.mimeType)
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
    id: input.assetId,
    orgId: input.orgId,
    ownerType: input.ownerType,
    ownerId: input.ownerId ?? null,
    draftId: input.draftId ?? null,
    usage: input.usage,
    assetKind,
    originalFilename: input.originalFilename,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    uploadedByUserId: input.uploadedByUserId ?? 'system',
    status: 'active',
    checksumSha256: input.checksumSha256 ?? null,
    imageWidth: input.imageWidth ?? null,
    imageHeight: input.imageHeight ?? null,
    createdAt: now,
    updatedAt: now,
  }

  await db.insert(assets).values(insertValues)

  const originalVariantId = crypto.randomUUID()
  await db.insert(assetVariants).values({
    id: originalVariantId,
    assetId: input.assetId,
    variantKey: 'original' as VariantKey,
    storageKey: input.storageKeyOriginal,
    mimeType: input.variantOriginalMimeType,
    sizeBytes: input.variantOriginalSizeBytes,
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
    .where(eq(assetVariants.assetId, input.assetId))

  return {
    assetId: input.assetId,
    variants: insertedVariants.map((v) => ({
      variantKey: v.variantKey as VariantKey,
      storageKey: v.storageKey,
      mimeType: v.mimeType,
      sizeBytes: v.sizeBytes,
    })),
  }
}
