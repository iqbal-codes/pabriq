import { createFileRoute, redirect } from '@tanstack/react-router'
import { PaymentMethodsPage } from '#/features/invoices/pages/payment-methods-page'
import { canManageSettings, type Role } from '#/features/permissions/model'

export const Route = createFileRoute('/_org/settings/payment-methods')({
  beforeLoad: ({ context }) => {
    const role = ((context.org as Record<string, unknown> | undefined)?.role ??
      'member') as Role
    if (!canManageSettings(role)) {
      throw redirect({ to: '/' })
    }
    return {
      breadcrumb: 'paymentMethods',
      pageTitle: 'paymentMethods',
    }
  },
  component: PaymentMethodsPage,
})
