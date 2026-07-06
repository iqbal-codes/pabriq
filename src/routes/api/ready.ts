import { createFileRoute } from '@tanstack/react-router'
import { checkDatabaseHealth } from '#/db/index'
import { logger } from '#/lib/logger'

export const Route = createFileRoute('/api/ready')({
  server: {
    handlers: {
      GET: async () => {
        try {
          await checkDatabaseHealth()
          return new Response('ready', { status: 200 })
        } catch (err) {
          logger.error({ err }, 'readiness check failed')
          return new Response('database unavailable', { status: 503 })
        }
      },
    },
  },
})
