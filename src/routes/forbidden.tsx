import { createFileRoute } from '@tanstack/react-router'
import { ForbiddenPage } from '#/components/app/forbidden-page'

export const Route = createFileRoute('/forbidden')({
  component: () => <ForbiddenPage actionHref="/" actionKey="backToDashboard" />,
})
