import { createFileRoute } from '@tanstack/react-router'
import { OrdersListPage } from '#/features/orders/pages/orders-list-page'
import { globalOverlaySearchSchema } from '#/hooks/use-global-overlay'

export const Route = createFileRoute('/_org/orders/')({
  validateSearch: (search) => globalOverlaySearchSchema.parse(search),
  beforeLoad: () => ({
    breadcrumb: 'orders',
    pageTitle: 'orders',
  }),
  component: OrdersListPage,
})
