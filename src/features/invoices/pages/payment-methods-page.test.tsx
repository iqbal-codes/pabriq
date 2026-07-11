import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import { PaymentMethodsPage } from './payment-methods-page'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('#/components/app/data-table', () => ({
  DataTable: ({
    data,
    emptyTitle,
  }: {
    data: unknown[]
    emptyTitle: string
  }) => (
    <div data-testid="data-table">
      <span data-testid="row-count">{data.length}</span>
      <span>{emptyTitle}</span>
    </div>
  ),
}))

vi.mock('#/components/app/form', () => ({
  FormRoot: ({ children }: { children: React.ReactNode }) => (
    <form>{children}</form>
  ),
  FormGrid: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useAppForm: ({
    defaultValues,
    onSubmit,
  }: {
    defaultValues: Record<string, unknown>
    onSubmit: (ctx: { value: Record<string, unknown> }) => Promise<void>
  }) => ({
    state: { values: defaultValues },
    handleSubmit: (e: React.FormEvent) => {
      e.preventDefault()
      onSubmit({ value: defaultValues })
    },
    AppField: ({
      name,
      children,
    }: {
      name: string
      children: (field: {
        state: { value: unknown }
        handleChange: (v: unknown) => void
        PasswordField: (props: { label: string }) => React.ReactNode
        TextField: (props: { label: string }) => React.ReactNode
      }) => React.ReactNode
    }) => {
      const PasswordField = ({ label }: { label: string }) => (
        <span>{label}</span>
      )
      const TextField = ({ label }: { label: string }) => <span>{label}</span>
      return children({
        state: { value: defaultValues[name] },
        handleChange: vi.fn(),
        PasswordField,
        TextField,
      })
    },
    AppForm: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    SubmitButton: ({ children }: { children: React.ReactNode }) => (
      <button type="submit">{children}</button>
    ),
  }),
}))

vi.mock('#/components/app/page-shell/page-header', () => ({
  PageHeader: ({
    title,
    primaryAction,
  }: {
    title: string
    primaryAction?: { label: string; onClick: () => void }
  }) => (
    <div data-testid="page-header">
      <span>{title}</span>
      {primaryAction && (
        <button type="button" onClick={primaryAction.onClick}>
          {primaryAction.label}
        </button>
      )}
    </div>
  ),
}))

vi.mock('#/components/ui/card', () => ({
  Card: ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

vi.mock('#/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => (
    // biome-ignore lint/a11y/noLabelWithoutControl: test mock
    <label>{children}</label>
  ),
}))

vi.mock('#/components/ui/switch', () => ({
  Switch: (props: {
    checked?: boolean
    onCheckedChange?: (v: boolean) => void
  }) => (
    <input
      type="checkbox"
      checked={props.checked}
      onChange={(e) => props.onCheckedChange?.(e.target.checked)}
    />
  ),
}))

vi.mock('#/features/invoices/components/payment-method-columns', () => ({
  usePaymentMethodColumns: () => [],
  PaymentMethodRowActions: () => null,
}))

vi.mock('#/features/invoices/components/payment-method-delete-dialog', () => ({
  PaymentMethodDeleteDialog: () => null,
}))

vi.mock('#/features/invoices/hooks', () => ({
  usePaymentMethods: () => ({
    data: [
      {
        id: 'pm-1',
        orgId: 'org-1',
        type: 'bank_transfer',
        name: 'Bank BCA',
        accountNumber: '1234567890',
        accountHolder: 'PT Test',
        instructions: null,
        isDefault: true,
        active: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ],
    isLoading: false,
  }),
  useDeletePaymentMethod: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('#/features/settings/hooks', () => ({
  useOrgSettings: () => ({
    data: {
      midtransServerKey: 'test-server-key',
      midtransClientKey: 'test-client-key',
      midtransIsProduction: false,
    },
    isLoading: false,
  }),
  useUpdateOrgSettings: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ ok: true }),
    isPending: false,
  }),
}))

vi.mock('#/hooks/use-global-overlay', () => ({
  useGlobalModal: () => ({ openModal: vi.fn() }),
}))

const messages = {
  settings: {
    paymentMethods: 'Payment Methods',
    addPaymentMethod: 'Add Payment Method',
    noPaymentMethods: 'No payment methods',
    noPaymentMethodsDesc: 'Add a payment method to get started.',
    deletePaymentMethod: 'Delete payment method',
    midtransIntegration: 'Midtrans Integration',
    midtransIntegrationDescription: 'Configure one Midtrans payment gateway.',
    midtransServerKey: 'Server Key',
    midtransClientKey: 'Client Key',
    midtransProduction: 'Use production',
    save: 'Save',
    saved: 'Saved',
    saveFailed: 'Save failed',
    bankAccounts: 'Bank Accounts',
  },
  dataTable: {
    clearFilters: 'Clear',
    columnVisibility: 'Columns',
    errorRetry: 'Retry',
    errorTitle: 'Error',
    firstPage: 'First',
    lastPage: 'Last',
    loading: 'Loading...',
    nextPage: 'Next',
    of: 'of',
    page: 'Page',
    perPage: 'Per page',
    previousPage: 'Previous',
    resetColumns: 'Reset',
    rowsSelected: 'selected of total',
    visibleRows: '1-10 of 20',
  },
}

function renderPage() {
  return render(
    <IntlProvider locale="en" messages={messages}>
      <PaymentMethodsPage />
    </IntlProvider>,
  )
}

describe('PaymentMethodsPage', () => {
  it('renders bank account table with data', () => {
    renderPage()
    expect(screen.getByTestId('data-table')).toBeDefined()
    expect(screen.getByTestId('row-count').textContent).toBe('1')
  })

  it('renders Midtrans Integration card', () => {
    renderPage()
    expect(screen.getByText('Midtrans Integration')).toBeDefined()
    expect(
      screen.getByText('Configure one Midtrans payment gateway.'),
    ).toBeDefined()
  })

  it('renders Midtrans form fields', () => {
    renderPage()
    expect(screen.getByText('Server Key')).toBeDefined()
    expect(screen.getByText('Client Key')).toBeDefined()
    expect(screen.getByText('Use production')).toBeDefined()
  })

  it('renders page header with add button', () => {
    renderPage()
    expect(screen.getByTestId('page-header')).toBeDefined()
    expect(screen.getByText('Payment Methods')).toBeDefined()
    expect(screen.getByText('Add Payment Method')).toBeDefined()
  })
})
