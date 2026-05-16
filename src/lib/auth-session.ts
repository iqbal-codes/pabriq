import { createServerFn } from '@tanstack/react-start'

export const getCurrentSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const [{ getRequestHeaders }, { auth }] = await Promise.all([
      import('@tanstack/react-start/server'),
      import('#/lib/auth'),
    ])
    return auth.api.getSession({
      headers: getRequestHeaders(),
    })
  },
)
