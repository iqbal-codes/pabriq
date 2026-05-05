# Asset Upload

Location: `src/components/app/asset-upload/` + `src/features/assets/`

Based on an upload machine pattern: queue system with configurable concurrency, progress tracking, SHA-256 checksum, signed URL upload (presigned PUT), undo timeout support.

## Components

| Component | Description |
|---|---|
| `AssetUploadDropzone` | Full dropzone with file list and progress |
| `PhotoGridUpload` | Grid of photo thumbnails with overlay progress |
| `FileListUpload` | List of files with progress bars |

## Uploader Adapter

```typescript
interface UploaderAdapter {
  uploadFile: (item: UploadItem, onProgress?: (pct: number) => void) => Promise<UploadResult>
  removeFile: (assetId: string) => Promise<void>
}
```

Built-in: `createR2UploaderAdapter` — hashes file, gets presigned URL, uploads, finalizes.

## Hook

```typescript
const { items, addItems, removeItem, retryItem } = useUploadMachine({
  config: { ownerType: 'order', usage: 'line-item-photo', maxFiles: 5 },
  adapter: createR2UploaderAdapter({ ownerType: 'order', usage: 'line-item-photo' }),
})
```

## Exports (`index.ts`)

- `AssetUploadDropzone`, `FileListUpload`, `PhotoGridUpload`
- `createR2UploaderAdapter`, `getAcceptedMimeTypes`, `getMaxBytes`
- `useUploadMachine`
- Types: `UploaderAdapter`, `UploadResult`, `AssetUploadConfig`, `AssetUploadDropzoneProps*`
