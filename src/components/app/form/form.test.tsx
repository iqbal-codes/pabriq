import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { useAppForm } from './form-context'
import { FormActions, FormGrid, FormRoot, FormSection } from './form-layout'
import {
  formatNumber,
  formatPhone,
  stripNonDigits,
  stripNumberFormatting,
} from './form-utils'

describe('Form components', () => {
  it('renders a TextField with label', () => {
    function TestForm() {
      const form = useAppForm({
        defaultValues: { name: '' },
      })

      return (
        <form.AppField name="name">
          {(field) => <field.TextField label="Name" />}
        </form.AppField>
      )
    }

    render(<TestForm />)
    expect(screen.getByText('Name')).toBeDefined()
  })

  it('renders a TextareaField with label', () => {
    function TestForm() {
      const form = useAppForm({
        defaultValues: { notes: '' },
      })

      return (
        <form.AppField name="notes">
          {(field) => <field.TextareaField label="Notes" />}
        </form.AppField>
      )
    }

    render(<TestForm />)
    expect(screen.getByText('Notes')).toBeDefined()
  })

  it('renders a SelectField with options', () => {
    function TestForm() {
      const form = useAppForm({
        defaultValues: { status: '' },
      })

      return (
        <form.AppField name="status">
          {(field) => (
            <field.SelectField
              label="Status"
              placeholder="Choose..."
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          )}
        </form.AppField>
      )
    }

    render(<TestForm />)
    expect(screen.getByText('Status')).toBeDefined()
    expect(screen.getByText('Active')).toBeDefined()
    expect(screen.getByText('Inactive')).toBeDefined()
  })

  it('NumberField stores raw digits and displays Indonesian formatting', async () => {
    function TestForm() {
      const form = useAppForm({
        defaultValues: { price: 0 },
      })

      return (
        <form.AppField name="price">
          {(field) => <field.NumberField label="Price" />}
        </form.AppField>
      )
    }

    render(<TestForm />)
    const input = screen.getByLabelText('Price')

    await userEvent.type(input, '5000')
    expect(input).toHaveValue('5.000')
  })

  it('NumberField server-renders a numeric default value', () => {
    function TestForm() {
      const form = useAppForm({
        defaultValues: { price: 5000 },
      })

      return (
        <form.AppField name="price">
          {(field) => <field.NumberField label="Price" />}
        </form.AppField>
      )
    }

    expect(renderToString(<TestForm />)).toContain('value="5.000"')
  })

  it('PhoneField stores raw digits and displays grouped formatting', async () => {
    function TestForm() {
      const form = useAppForm({
        defaultValues: { phone: '' },
      })

      return (
        <form.AppField name="phone">
          {(field) => <field.PhoneField label="Phone" />}
        </form.AppField>
      )
    }

    render(<TestForm />)
    const input = screen.getByLabelText('Phone')

    await userEvent.type(input, '088804291032')
    expect(input).toHaveValue('0888-0429-1032')
  })

  it('SubmitButton renders with label', () => {
    function TestForm() {
      const form = useAppForm({
        defaultValues: { name: '' },
      })

      return (
        <>
          <form.AppField name="name">
            {(field) => <field.TextField />}
          </form.AppField>
          <form.AppForm>
            <form.SubmitButton>Save</form.SubmitButton>
          </form.AppForm>
        </>
      )
    }

    render(<TestForm />)
    expect(screen.getByText('Save')).toBeDefined()
  })

  it('FormError renders error message', () => {
    function TestForm() {
      const form = useAppForm({
        defaultValues: { name: '' },
      })

      return (
        <form.AppForm>
          <form.FormError message="Something went wrong" />
        </form.AppForm>
      )
    }

    render(<TestForm />)
    expect(screen.getByText('Something went wrong')).toBeDefined()
  })

  it('FormError renders nothing when no message', () => {
    function TestForm() {
      const form = useAppForm({
        defaultValues: { name: '' },
      })

      return (
        <form.AppForm>
          <form.FormError message={null} />
        </form.AppForm>
      )
    }

    const { container } = render(<TestForm />)
    expect(container.textContent).toBe('')
  })
})

describe('FormRoot', () => {
  it('renders form and calls handleSubmit on submit', async () => {
    let submitted = false

    function TestForm() {
      const form = useAppForm({
        defaultValues: { name: '' },
        onSubmit: () => {
          submitted = true
        },
      })

      return (
        <FormRoot form={form}>
          <form.AppField name="name">
            {(field) => <field.TextField label="Name" />}
          </form.AppField>
          <button type="submit" onClick={() => form.handleSubmit()}>
            Submit
          </button>
        </FormRoot>
      )
    }

    render(<TestForm />)
    await userEvent.click(screen.getByText('Submit'))
    expect(submitted).toBe(true)
  })
})

describe('FormSection', () => {
  it('renders title and description', () => {
    render(
      <FormSection title="Details" description="Enter your details">
        <div>content</div>
      </FormSection>,
    )

    expect(screen.getByText('Details')).toBeDefined()
    expect(screen.getByText('Enter your details')).toBeDefined()
  })
})

describe('FormGrid', () => {
  it('renders children in a grid', () => {
    const { container } = render(
      <FormGrid>
        <div>col 1</div>
        <div>col 2</div>
      </FormGrid>,
    )

    expect(screen.getByText('col 1')).toBeDefined()
    expect(screen.getByText('col 2')).toBeDefined()
    expect(container.querySelector('[data-slot="field-group"]')).toBeDefined()
  })
})

describe('FormActions', () => {
  it('renders children', () => {
    render(
      <FormActions>
        <button type="submit">Save</button>
      </FormActions>,
    )

    expect(screen.getByText('Save')).toBeDefined()
  })
})

describe('form-utils', () => {
  describe('stripNonDigits', () => {
    it('removes non-digit characters', () => {
      expect(stripNonDigits('abc123!@#')).toBe('123')
    })

    it('preserves digits only', () => {
      expect(stripNonDigits('5000')).toBe('5000')
    })
  })

  describe('stripNumberFormatting', () => {
    it('strips dots from formatted number', () => {
      expect(stripNumberFormatting('5.000')).toBe('5000')
    })
  })

  describe('formatNumber', () => {
    it('formats number with Indonesian thousands separator', () => {
      expect(formatNumber('5000')).toBe('5.000')
    })

    it('formats numeric values from form defaults', () => {
      expect(formatNumber(5000)).toBe('5.000')
    })

    it('returns empty string for empty input', () => {
      expect(formatNumber('')).toBe('')
    })
  })

  describe('formatPhone', () => {
    it('formats phone with Indonesia-first grouping', () => {
      expect(formatPhone('088804291032')).toBe('0888-0429-1032')
    })

    it('handles partial input', () => {
      expect(formatPhone('0888')).toBe('0888')
      expect(formatPhone('088804')).toBe('0888-04')
    })
  })
})
