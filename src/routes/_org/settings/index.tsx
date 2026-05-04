import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_org/settings/')({
  beforeLoad: () => {
    throw redirect({ to: '/settings/general' })
  },
})
