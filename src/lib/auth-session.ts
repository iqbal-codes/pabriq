import { createServerFn } from '@tanstack/react-start'

export const getCurrentSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getRequestHeaders } = await import('@tanstack/react-start/server')
    const { auth } = await import('#/lib/auth')
    return auth.api.getSession({
      headers: getRequestHeaders(),
    })
  },
)
