export type MutationResult = { ok: true } | { ok: false; error: string }

export function wrapError(err: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error: err instanceof Error ? err.message : 'Unknown error',
  }
}
