import { useRouter } from '@tanstack/react-router'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { FileListUpload } from '#/components/app/asset-upload'
import { uploadToSignedUrl } from '#/components/app/asset-upload/upload-utils'
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
import type { UploadItem } from '#/features/assets/upload-machine'
import {
  portalGetInvoiceUploadUrlFn,
  submitPaymentProofFn,
} from '#/features/portal/server'
type Props = {
  invoiceId: string
  token: string
  hasExistingProof?: boolean
}

export function SubmitPaymentProofDialog({
  invoiceId,
  token,
  hasExistingProof,
}: Props) {
  const t = useTranslations('invoices')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([])
  const [reference, setReference] = useState('')
  const uploadedAssetIds = useRef<string[]>([])
  const [isSubmittingProof, setIsSubmittingProof] = useState(false)

  // Reset state when dialog closes
  const handleOpenChange = (next: boolean) => {
    if (!next && isSubmittingProof) return
    if (!next) {
      setUploadItems([])
      setReference('')
      uploadedAssetIds.current = []
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

        // Track uploaded asset ID
        uploadedAssetIds.current = [...uploadedAssetIds.current, assetId]

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
        uploadedAssetIds.current = uploadedAssetIds.current.filter(
          (id) => id !== assetId,
        )
      },
    }),
    [token, invoiceId],
  )

  const completedItems = uploadItems.filter((i) => i.status === 'done')
  const hasUploads = completedItems.length > 0
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
            keepCompletedItems
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
