import { createFileRoute } from '@tanstack/react-router'
import { ViewCustomerPage } from '#/features/customers/pages/view-customer-page'

export const Route = createFileRoute('/_org/customers/$id/')({
  beforeLoad: () => ({
    breadcrumb: 'viewCustomer',
    pageTitle: 'viewCustomer',
  }),
  component: ViewCustomerPage,
})
