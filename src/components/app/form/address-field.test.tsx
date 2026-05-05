import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it } from 'vitest'

import type { AddressValue } from './address-field'
import { useAppForm } from './form-context'

const addressMessages = {
  address: {
    areaSearch: 'Search area',
    areaSearchPlaceholder: 'Search subdistrict...',
    streetAddress: 'Street Address',
    streetAddressPlaceholder: 'e.g. Jl. Raya Bogor No. 123',
    noResults: 'No results',
    areaNotSupported: 'Not supported',
    isWni: 'WNI',
    isWna: 'WNA',
    saveAsCustomerAddress: 'Save',
    orgAddressRequired: 'Required',
    areaNotFound: 'Not found',
    defaultAddress: 'Default',
    title: 'Address',
  },
}

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <IntlProvider locale="en" messages={addressMessages}>
        {ui}
      </IntlProvider>
    </QueryClientProvider>,
  )
}

describe('AddressField', () => {
  it('renders label when provided', () => {
    function TestForm() {
      const form = useAppForm({
        defaultValues: {
          address: {
            areaId: '',
            areaName: '',
            streetAddress: '',
          } satisfies AddressValue,
        },
      })

      return (
        <form.AppField name="address">
          {(field) => <field.AddressField label="Shipping Address" />}
        </form.AppField>
      )
    }

    renderWithProviders(<TestForm />)
    expect(screen.getByText('Shipping Address')).toBeDefined()
  })

  it('renders area search placeholder when no area selected', () => {
    function TestForm() {
      const form = useAppForm({
        defaultValues: {
          address: {
            areaId: '',
            areaName: '',
            streetAddress: '',
          } satisfies AddressValue,
        },
      })

      return (
        <form.AppField name="address">
          {(field) => <field.AddressField />}
        </form.AppField>
      )
    }

    renderWithProviders(<TestForm />)
    expect(screen.getByText('Search subdistrict...')).toBeDefined()
  })

  it('renders selected area name from form defaults', () => {
    function TestFormWithArea() {
      const form = useAppForm({
        defaultValues: {
          address: {
            areaId: 'area-1',
            areaName: 'Jakarta Pusat',
            streetAddress: 'Jl. Sudirman No. 1',
          } satisfies AddressValue,
        },
      })

      return (
        <form.AppField name="address">
          {(field) => <field.AddressField />}
        </form.AppField>
      )
    }

    renderWithProviders(<TestFormWithArea />)
    expect(screen.getByText('Jakarta Pusat')).toBeDefined()
  })

  it('hides area picker when disabled', () => {
    function TestFormWithoutAreaSearch() {
      const form = useAppForm({
        defaultValues: {
          address: {
            areaId: '',
            areaName: '',
            streetAddress: '',
          } satisfies AddressValue,
        },
      })

      return (
        <form.AppField name="address">
          {(field) => <field.AddressField showAreaSearch={false} />}
        </form.AppField>
      )
    }

    renderWithProviders(<TestFormWithoutAreaSearch />)
    expect(screen.queryByText('Search subdistrict...')).toBeNull()
    expect(
      screen.getByPlaceholderText('e.g. Jl. Raya Bogor No. 123'),
    ).toBeDefined()
  })
})
