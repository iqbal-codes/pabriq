import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/healthz')({
  server: {
    handlers: {
      GET: async () => new Response('ok', { status: 200 }),
    },
  },
})
