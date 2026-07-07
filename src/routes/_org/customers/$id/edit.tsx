import { createFileRoute } from '@tanstack/react-router'
import { CustomersListPage } from '#/features/customers/pages/customers-list-page'

export const Route = createFileRoute('/_org/customers/$id/edit')({
  beforeLoad: () => ({
    breadcrumb: 'edit',
    parentBreadcrumbs: [{ label: 'customers', href: '/customers' }],
    pageTitle: 'editCustomer',
  }),
  component: () => {
    const { id } = Route.useParams()
    return <CustomersListPage sheet={{ type: 'edit', id }} />
  },
})
