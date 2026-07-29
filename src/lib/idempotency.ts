type StoredIdempotencyRecord<T> = {
  response: T
  createdAt: number
}

const idempotencyStore = new Map<string, StoredIdempotencyRecord<unknown>>()
const EXPIRATION_MS = 24 * 60 * 60 * 1000

/**
 * In-memory idempotency deduplicator for mutation operations.
 * Deduplicates identical Idempotency-Keys for 24 hours.
 */
export async function withIdempotency<T>(
  key: string | null | undefined,
  executor: () => Promise<T>,
): Promise<T> {
  if (!key || key.trim().length === 0) {
    return executor()
  }

  const now = Date.now()
  const cached = idempotencyStore.get(key)
  if (cached && now - cached.createdAt < EXPIRATION_MS) {
    return cached.response as T
  }

  const response = await executor()
  idempotencyStore.set(key, { response, createdAt: now })
  return response
}
