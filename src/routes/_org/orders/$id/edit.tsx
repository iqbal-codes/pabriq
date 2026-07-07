import { createFileRoute } from '@tanstack/react-router'
import { OrdersListPage } from '#/features/orders/pages/orders-list-page'

export const Route = createFileRoute('/_org/orders/$id/edit')({
  beforeLoad: () => ({
    breadcrumb: 'editOrder',
    parentBreadcrumbs: [{ label: 'orders', href: '/orders' }],
    pageTitle: 'editOrder',
  }),
  component: () => {
    const { id } = Route.useParams()
    return <OrdersListPage sheet={{ type: 'edit', id }} />
  },
})
