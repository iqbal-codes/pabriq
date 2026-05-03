import { createStart } from '@tanstack/react-start'
import { serverLoggerMiddleware } from '#/lib/server-logger-middleware'

export const startInstance = createStart(() => {
  return {
    functionMiddleware: [serverLoggerMiddleware],
  }
})
