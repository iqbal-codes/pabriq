import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/sign-up')({
  validateSearch: (search) => ({
    redirect:
      typeof search.redirect === 'string' &&
      search.redirect.startsWith('/') &&
      !search.redirect.startsWith('//')
        ? search.redirect
        : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/sign-in',
      search: { redirect: search.redirect },
    })
  },
  component: () => null,
})
