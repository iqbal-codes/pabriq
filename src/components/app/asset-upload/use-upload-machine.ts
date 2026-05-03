import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { UploadItem } from '#/features/assets/upload-machine'
import {
  createUploadItem,
  isSubmitBlocked,
} from '#/features/assets/upload-machine'
import type { UploaderAdapter } from './types'

const MAX_CONCURRENT = 3
const UNDO_TIMEOUT_MS = 5000

export type UseUploadMachineOptions = {
  adapter: UploaderAdapter
  maxConcurrency?: number
  onUploadComplete?: (assetId: string) => void
  onUploadError?: (itemId: string, error: string) => void
}

export type UseUploadMachineReturn = {
  items: UploadItem[]
  isBlocked: boolean
  addFiles: (files: File[]) => void
  removeItem: (itemId: string) => void
  retryItem: (itemId: string) => void
  clearFailed: () => void
  updateItem: (itemId: string, update: Partial<UploadItem>) => void
}

export function useUploadMachine(
  initialItems: UploadItem[],
  options: UseUploadMachineOptions,
): UseUploadMachineReturn {
  const {
    adapter,
    maxConcurrency = MAX_CONCURRENT,
    onUploadComplete,
    onUploadError,
  } = options
  const [items, setItems] = useState<UploadItem[]>(initialItems)
  const itemsRef = useRef<UploadItem[]>(initialItems)
  const uploadingRef = useRef<Set<string>>(new Set())
  const undoTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  )

  const setItemsState = useCallback((next: UploadItem[]) => {
    itemsRef.current = next
    setItems(next)
  }, [])

  const updateItem = useCallback(
    (itemId: string, update: Partial<UploadItem>) => {
      const next = itemsRef.current.map((item) =>
        item.id === itemId ? { ...item, ...update } : item,
      )
      setItemsState(next)
    },
    [setItemsState],
  )

  const processQueue = useCallback(() => {
    const pendingItems = itemsRef.current.filter(
      (item) => item.status === 'pending',
    )
    const currentUploading = uploadingRef.current.size

    if (currentUploading >= maxConcurrency) return

    const slotsAvailable = maxConcurrency - currentUploading
    const toStart = pendingItems.slice(0, slotsAvailable)

    for (const item of toStart) {
      uploadingRef.current.add(item.id)
      updateItem(item.id, { status: 'uploading', progress: 0 })

      void (async () => {
        try {
          const result = await adapter.uploadFile(
            { ...item, status: 'uploading', progress: 0 },
            (pct) => updateItem(item.id, { progress: pct }),
          )
          updateItem(item.id, { status: 'processing', progress: 85 })
          updateItem(item.id, {
            status: 'done',
            progress: 100,
            assetId: result.assetId,
            error: null,
          })
          uploadingRef.current.delete(item.id)
          onUploadComplete?.(result.assetId)
          processQueue()
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'Upload failed'
          updateItem(item.id, { status: 'failed', error: errorMessage })
          uploadingRef.current.delete(item.id)
          toast.error(errorMessage)
          onUploadError?.(item.id, errorMessage)
          processQueue()
        }
      })()
    }
  }, [maxConcurrency, adapter, updateItem, onUploadComplete, onUploadError])

  const addFiles = useCallback(
    (files: File[]) => {
      const newItems = files.map(createUploadItem)
      setItemsState([...itemsRef.current, ...newItems])
      processQueue()
    },
    [processQueue, setItemsState],
  )

  const removeItem = useCallback(
    (itemId: string) => {
      const item = itemsRef.current.find((i) => i.id === itemId)
      if (!item) return

      if (item.assetId) {
        const timeout = setTimeout(async () => {
          try {
            await adapter.removeFile(item.assetId as string)
          } catch {}
          undoTimeoutsRef.current.delete(itemId)
          setItemsState(itemsRef.current.filter((i) => i.id !== itemId))
        }, UNDO_TIMEOUT_MS)
        undoTimeoutsRef.current.set(itemId, timeout)
        updateItem(itemId, { status: 'pending' })
      } else {
        setItemsState(itemsRef.current.filter((i) => i.id !== itemId))
      }
    },
    [adapter, updateItem, setItemsState],
  )

  const retryItem = useCallback(
    (itemId: string) => {
      updateItem(itemId, { status: 'pending', error: null })
      processQueue()
    },
    [updateItem, processQueue],
  )

  const clearFailed = useCallback(() => {
    setItemsState(itemsRef.current.filter((item) => item.status !== 'failed'))
  }, [setItemsState])

  return {
    items,
    isBlocked: isSubmitBlocked(items),
    addFiles,
    removeItem,
    retryItem,
    clearFailed,
    updateItem,
  }
}
