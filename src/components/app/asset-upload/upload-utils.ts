export async function computeSha256(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function uploadToSignedUrl(
  uploadUrl: string,
  data: ArrayBuffer,
  contentType: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>()
  const xhr = new XMLHttpRequest()

  xhr.upload.addEventListener('progress', (event) => {
    if (!event.lengthComputable || event.total <= 0 || !onProgress) return
    onProgress(Math.round((event.loaded / event.total) * 100))
  })

  xhr.addEventListener('load', () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      resolve()
      return
    }
    reject(new Error(`Upload failed with status ${xhr.status}`))
  })

  xhr.addEventListener('error', () => {
    reject(new Error('Network upload failed'))
  })

  xhr.open('PUT', uploadUrl)
  xhr.setRequestHeader('Content-Type', contentType)
  xhr.send(data)
  return promise
}
