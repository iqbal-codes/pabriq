import { createFileRoute } from '@tanstack/react-router'
import { PaymentMethodsPage } from '#/features/invoices/pages/payment-methods-page'

export const Route = createFileRoute('/_org/settings/payment-methods')({
  beforeLoad: () => ({
    breadcrumb: 'paymentMethods',
    pageTitle: 'paymentMethods',
  }),
  component: PaymentMethodsPage,
})
