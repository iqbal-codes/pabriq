import { createFileRoute } from '@tanstack/react-router'
import { CreateCustomerPage } from '#/features/customers/pages/create-customer-page'

export const Route = createFileRoute('/_org/customers/new')({
  beforeLoad: () => ({
    breadcrumb: 'createCustomer',
    pageTitle: 'createCustomer',
  }),
  component: CreateCustomerPage,
})
