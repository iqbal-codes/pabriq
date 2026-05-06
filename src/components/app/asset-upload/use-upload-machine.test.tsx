import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useUploadMachine } from './use-upload-machine'

describe('useUploadMachine', () => {
  it('removes completed items immediately when keepCompletedItems is false', async () => {
    const uploadFile = vi.fn(async () => ({
      assetId: 'asset-1',
      variants: [],
    }))
    const onUploadComplete = vi.fn()

    const { result } = renderHook(() =>
      useUploadMachine([], {
        adapter: {
          uploadFile,
          removeFile: vi.fn(async () => undefined),
        },
        keepCompletedItems: false,
        onUploadComplete,
      }),
    )

    act(() => {
      result.current.addFiles([
        new File(['test'], 'upload.png', { type: 'image/png' }),
      ])
    })

    await waitFor(() => {
      expect(onUploadComplete).toHaveBeenCalledWith({
        assetId: 'asset-1',
        file: expect.any(File),
      })
    })
    await waitFor(() => {
      expect(result.current.items).toHaveLength(0)
    })
  })

  it('keeps completed items by default', async () => {
    const uploadFile = vi.fn(async () => ({
      assetId: 'asset-1',
      variants: [],
    }))

    const { result } = renderHook(() =>
      useUploadMachine([], {
        adapter: {
          uploadFile,
          removeFile: vi.fn(async () => undefined),
        },
      }),
    )

    act(() => {
      result.current.addFiles([
        new File(['test'], 'upload.png', { type: 'image/png' }),
      ])
    })

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0]?.status).toBe('done')
      expect(result.current.items[0]?.assetId).toBe('asset-1')
    })
  })
})
