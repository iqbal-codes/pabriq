import { createFileRoute } from '@tanstack/react-router'
import { KanbanPage } from '#/features/production/pages/kanban-page'

export const Route = createFileRoute('/_org/production/')({
  beforeLoad: () => ({
    breadcrumb: 'production',
    pageTitle: 'production',
  }),
  component: KanbanPage,
})
