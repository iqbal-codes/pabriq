import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const R2_ENDPOINT = process.env.R2_ENDPOINT ?? ''
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? ''
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? ''
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? ''
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? ''

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
})

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array | Blob,
  contentType: string,
  metadata?: Record<string, string>,
): Promise<{ etag: string }> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
  })

  const result = await r2Client.send(command)
  return { etag: result.ETag ?? '' }
}

export async function generateSignedDownloadUrl(
  key: string,
  expiresInSeconds: number,
): Promise<{ url: string; expiresAt: number }> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  })

  const url = await getSignedUrl(r2Client, command, {
    expiresIn: expiresInSeconds,
  })
  const expiresAt = Date.now() + expiresInSeconds * 1000

  return { url, expiresAt }
}

export async function generateSignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds: number,
): Promise<{ url: string; expiresAt: number }> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  })

  const url = await getSignedUrl(r2Client, command, {
    expiresIn: expiresInSeconds,
  })
  const expiresAt = Date.now() + expiresInSeconds * 1000

  return { url, expiresAt }
}

export function buildR2Key(
  orgId: string,
  ownerType: string,
  ownerIdOrDraftId: string,
  assetId: string,
  variant: string,
  ext: string,
): string {
  return `org/${orgId}/${ownerType}/${ownerIdOrDraftId}/${assetId}/${variant}.${ext}`
}

export function parseR2Key(key: string): {
  orgId: string
  ownerType: string
  ownerIdOrDraftId: string
  assetId: string
  variant: string
  ext: string
} | null {
  const parts = key.split('/')
  if (parts.length !== 6) return null

  const [, orgId, ownerType, ownerIdOrDraftId, assetId, filename] = parts
  const lastDotIndex = filename.lastIndexOf('.')
  if (lastDotIndex === -1) return null

  const variant = filename.substring(0, lastDotIndex)
  const ext = filename.substring(lastDotIndex + 1)

  return { orgId, ownerType, ownerIdOrDraftId, assetId, variant, ext }
}

export { R2_BUCKET_NAME, R2_PUBLIC_URL }
