import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useAppForm } from './form-context'

const options = [
  { value: 'option-a', label: 'Option A' },
  { value: 'option-b', label: 'Option B' },
  { value: 'option-c', label: 'Option C' },
]

describe('RadioGroupField', () => {
  it('renders with label and options', () => {
    function TestForm() {
      const form = useAppForm({
        defaultValues: { choice: '' },
      })

      return (
        <form.AppField name="choice">
          {(field) => (
            <field.RadioGroupField label="Choose one" options={options} />
          )}
        </form.AppField>
      )
    }

    render(<TestForm />)
    expect(screen.getByText('Choose one')).toBeDefined()
    expect(screen.getByText('Option A')).toBeDefined()
    expect(screen.getByText('Option B')).toBeDefined()
    expect(screen.getByText('Option C')).toBeDefined()
  })

  it('selects an option on click', async () => {
    function TestForm() {
      const form = useAppForm({
        defaultValues: { choice: '' },
      })

      return (
        <form.AppField name="choice">
          {(field) => (
            <field.RadioGroupField label="Choose one" options={options} />
          )}
        </form.AppField>
      )
    }

    const user = userEvent.setup()
    render(<TestForm />)

    await user.click(screen.getByText('Option B'))
    expect(
      screen.getByRole('radio', { name: 'Option B' }).getAttribute('aria-checked'),
    ).toBe('true')
  })
})

describe('RadioCardField', () => {
  it('renders with label and options', () => {
    function TestForm() {
      const form = useAppForm({
        defaultValues: { choice: '' },
      })

      return (
        <form.AppField name="choice">
          {(field) => (
            <field.RadioCardField label="Pick a card" options={options} />
          )}
        </form.AppField>
      )
    }

    render(<TestForm />)
    expect(screen.getByText('Pick a card')).toBeDefined()
    expect(screen.getByText('Option A')).toBeDefined()
    expect(screen.getByText('Option C')).toBeDefined()
  })

  it('selects an option on click', async () => {
    function TestForm() {
      const form = useAppForm({
        defaultValues: { choice: '' },
      })

      return (
        <form.AppField name="choice">
          {(field) => (
            <field.RadioCardField label="Pick a card" options={options} />
          )}
        </form.AppField>
      )
    }

    const user = userEvent.setup()
    render(<TestForm />)

    await user.click(screen.getByText('Option A'))
    expect(
      screen.getByRole('radio', { name: 'Option A' }).getAttribute('aria-checked'),
    ).toBe('true')
  })
})
