import { useRouter } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { FileListUpload } from '#/components/app/asset-upload'
import { uploadToSignedUrl } from '#/components/app/asset-upload/upload-utils'
import { ExistingFileList } from '#/components/app/form/file-upload-field'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { Textarea } from '#/components/ui/textarea'
import type { AssetMetadata } from '#/features/assets/server'
import type { UploadItem } from '#/features/assets/upload-machine'
import {
  portalGetInvoiceUploadUrlFn,
  submitPaymentProofFn,
} from '#/features/portal/server'

function getAssetKindFromMimeType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  return 'file'
}

type Props = {
  invoiceId: string
  orderId: string
  token: string
  hasExistingProof?: boolean
}

export function SubmitPaymentProofDialog({
  invoiceId,
  orderId,
  token,
  hasExistingProof,
}: Props) {
  const t = useTranslations('invoices')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([])
  const [uploadedAssets, setUploadedAssets] = useState<AssetMetadata[]>([])
  const [reference, setReference] = useState('')
  const [isSubmittingProof, setIsSubmittingProof] = useState(false)

  // Reset state when dialog closes
  const handleOpenChange = (next: boolean) => {
    if (!next && isSubmittingProof) return
    if (!next) {
      setUploadItems([])
      setUploadedAssets([])
      setReference('')
    }
    setOpen(next)
  }

  const adapter = useMemo(
    () => ({
      async uploadFile(item: UploadItem, onProgress?: (pct: number) => void) {
        const arrayBuffer = await item.file.arrayBuffer()
        onProgress?.(5)

        const contentType = item.file.type || 'application/octet-stream'

        const { uploadUrl, storageKey, assetId } =
          await portalGetInvoiceUploadUrlFn({
            data: {
              token,
              invoiceId,
              fileName: item.file.name,
              fileType: contentType,
              fileSize: item.file.size,
            },
          })
        onProgress?.(20)

        await uploadToSignedUrl(uploadUrl, arrayBuffer, contentType, (pct) => {
          onProgress?.(20 + Math.round(pct * 0.7))
        })

        const finalizeResult = await submitPaymentProofFn({
          data: {
            token,
            invoiceId,
            orderId,
            assetId,
            originalFilename: item.file.name,
            mimeType: contentType,
            sizeBytes: item.file.size,
            storageKey,
          },
        })

        if (!finalizeResult.ok) {
          throw new Error(finalizeResult.error)
        }

        return {
          assetId,
          variants: [
            {
              variantKey: 'original',
              storageKey,
              mimeType: contentType,
              sizeBytes: item.file.size,
            },
          ],
        }
      },

      async removeFile(assetId: string) {
        setUploadedAssets((current) =>
          current.filter((asset) => asset.id !== assetId),
        )
      },
    }),
    [token, invoiceId, orderId],
  )

  function handleUploadComplete(upload: { assetId: string; file: File }) {
    setUploadedAssets((current) => [
      ...current.filter((asset) => asset.id !== upload.assetId),
      {
        id: upload.assetId,
        originalFilename: upload.file.name,
        mimeType: upload.file.type || 'application/octet-stream',
        sizeBytes: upload.file.size,
        assetKind: getAssetKindFromMimeType(upload.file.type),
      },
    ])
  }

  const hasUploads = uploadedAssets.length > 0
  const isUploading = uploadItems.some(
    (i) => i.status === 'uploading' || i.status === 'processing',
  )

  const handleSubmit = async () => {
    if (isSubmittingProof || !hasUploads) return
    // The adapter already called submitPaymentProofFn per-asset during upload.
    // Invalidate the route so the parent re-fetches with updated invoice state.
    setIsSubmittingProof(true)
    try {
      await router.invalidate()
      toast.success(t('submitProofSuccess'))
      handleOpenChange(false)
    } finally {
      setIsSubmittingProof(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="default">
          {t(hasExistingProof ? 'resendPaymentProof' : 'submitPaymentProof')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t(hasExistingProof ? 'resendPaymentProof' : 'submitPaymentProof')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Note / reference field */}
          <div className="space-y-1.5">
            <label
              htmlFor="payment-note"
              className="text-sm font-medium text-foreground"
            >
              {t('paymentNote')}
            </label>
            <Textarea
              id="payment-note"
              placeholder={t('paymentNotePlaceholder')}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* File upload */}
          <FileListUpload
            items={uploadItems}
            onItemsChange={setUploadItems}
            config={{
              ownerType: 'invoice',
              ownerId: invoiceId,
              usage: 'payment_proof',
              maxFiles: 5,
            }}
            adapter={adapter}
            acceptedMimeTypes={[
              'image/jpeg',
              'image/png',
              'image/webp',
              'application/pdf',
            ]}
            maxBytes={10 * 1024 * 1024}
            keepCompletedItems={false}
            onUploadComplete={handleUploadComplete}
          />
          <ExistingFileList
            assets={uploadedAssets}
            onRemove={async (asset) => {
              await adapter.removeFile(asset.id)
            }}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isUploading || isSubmittingProof}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={isSubmittingProof}
            disabled={!hasUploads || isUploading || isSubmittingProof}
          >
            {t('submitPaymentProof')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
