import { screen, render as tlRender } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import { useAppForm } from './form-context'

// Mock PointerCapture APIs for Radix UI Components in happy-dom / jsdom
if (!HTMLElement.prototype.setPointerCapture) {
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    value: () => {},
    writable: true,
  })
}

if (!HTMLElement.prototype.releasePointerCapture) {
  Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
    value: () => {},
    writable: true,
  })
}

if (!HTMLElement.prototype.hasPointerCapture) {
  Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
    value: () => false,
    writable: true,
  })
}

const testMessages = {
  dateField: {
    pickDate: 'Pick a date',
    pickDateRange: 'Pick a date range',
    selectDate: 'Select date',
    startDate: 'Start date',
    endDate: 'End date',
    clear: 'Clear',
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
    nextWeek: 'Next Week',
    last7Days: 'Last 7 Days',
    last30Days: 'Last 30 Days',
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
  },
}

function render(ui: React.ReactNode) {
  return tlRender(
    <IntlProvider locale="en" messages={testMessages}>
      {ui}
    </IntlProvider>,
  )
}

describe('DateField', () => {
  it('renders single DateField with placeholder when value is empty', () => {
    function TestForm() {
      const form = useAppForm({
        defaultValues: { date: '' },
      })

      return (
        <form.AppField name="date">
          {(field) => (
            <field.DateField label="Pick Schedule" placeholder="Choose a day" />
          )}
        </form.AppField>
      )
    }

    render(<TestForm />)
    expect(screen.getByText('Pick Schedule')).toBeDefined()
    expect(screen.getByText('Choose a day')).toBeDefined()
  })

  it('renders single DateField and parses initial string value', () => {
    function TestForm() {
      const form = useAppForm({
        defaultValues: { date: '2026-07-07' },
      })

      return (
        <form.AppField name="date">
          {(field) => <field.DateField label="Pick Schedule" />}
        </form.AppField>
      )
    }

    render(<TestForm />)
    expect(screen.getByText('July 7, 2026')).toBeDefined()
  })

  it('renders range DateField and formats initial range value', () => {
    function TestForm() {
      const form = useAppForm({
        defaultValues: {
          dateRange: {
            from: '2026-07-07',
            to: '2026-07-10',
          },
        },
      })

      return (
        <form.AppField name="dateRange">
          {(field) => <field.DateField label="Duration" mode="range" />}
        </form.AppField>
      )
    }

    render(<TestForm />)
    expect(screen.getByText('Jul 7, 2026 - Jul 10, 2026')).toBeDefined()
  })

  it('shows presets and updates the form value on click', async () => {
    const handleValueChange = vi.fn()

    function TestForm() {
      const form = useAppForm({
        defaultValues: { date: '' },
      })

      return (
        <form.AppField name="date">
          {(field) => {
            // Intercept handle change to verify it
            const origChange = field.handleChange
            field.handleChange = (val) => {
              origChange(val)
              handleValueChange(val)
            }
            return <field.DateField label="Date" presets={true} />
          }}
        </form.AppField>
      )
    }

    render(<TestForm />)

    const trigger = screen.getByRole('button', { name: 'Date' })
    await userEvent.click(trigger)

    // Preset options should render
    const todayBtn = screen.getByRole('button', { name: 'Today' })
    expect(todayBtn).toBeDefined()

    await userEvent.click(todayBtn)

    // Form value should update to today's date formatted as YYYY-MM-DD
    expect(handleValueChange).toHaveBeenCalled()
    const calledVal = handleValueChange.mock.calls[0][0]
    expect(typeof calledVal).toBe('string')
    expect(calledVal).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('allows clearing the date value via the inline clear button', async () => {
    const handleValueChange = vi.fn()

    function TestForm() {
      const form = useAppForm({
        defaultValues: { date: '2026-07-07' },
      })

      return (
        <form.AppField name="date">
          {(field) => {
            const origChange = field.handleChange
            field.handleChange = (val) => {
              origChange(val)
              handleValueChange(val)
            }
            return <field.DateField label="Date" />
          }}
        </form.AppField>
      )
    }

    render(<TestForm />)

    // Initially displays the date
    expect(screen.getByText('July 7, 2026')).toBeDefined()

    const clearBtn = screen.getByRole('button', { name: 'Clear' })
    await userEvent.click(clearBtn)

    // The value should be cleared (empty string for string mode)
    expect(handleValueChange).toHaveBeenCalledWith('')
  })
})
