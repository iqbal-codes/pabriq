import { createMiddleware } from '@tanstack/react-start'
import { logger } from '#/lib/logger'

const sentryCaptureException = async (err: unknown): Promise<void> => {
  try {
    const { captureException } = await import('@sentry/tanstackstart-react')
    captureException(err)
  } catch {}
}

export const serverLoggerMiddleware = createMiddleware({
  type: 'function',
}).server(async ({ next, serverFnMeta }) => {
  const fnName = serverFnMeta?.name ?? 'unknown'
  const start = Date.now()

  try {
    const result = await next()
    const duration = Date.now() - start
    logger.info({ fn: fnName, durationMs: duration }, 'server fn complete')
    return result
  } catch (err: unknown) {
    const duration = Date.now() - start
    const message = err instanceof Error ? err.message : String(err)
    logger.error(
      { fn: fnName, durationMs: duration, err: message },
      'server fn error',
    )
    sentryCaptureException(err)
    throw err
  }
})
