import { createFileRoute } from '@tanstack/react-router'
import { ForbiddenPage } from '#/components/app/forbidden-page'

export const Route = createFileRoute('/forbidden')({
  beforeLoad: () => ({ pageTitle: 'accessDenied' as const }),
  component: () => <ForbiddenPage actionHref="/" actionKey="backToDashboard" />,
})
