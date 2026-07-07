import type { ComponentProps } from 'react'
import { fieldContext } from '#/components/app/form/form-context-base'
import { NumberField } from '#/components/app/form/number-field'
import { Button } from '#/components/ui/button'

const QUICK_PERCENTAGES = [30, 50, 100] as const

type InvoiceAmountInputProps = {
  ariaLabel: string
  baseAmount: number
  value: number
  onChange: (value: number) => void
}

export function InvoiceAmountInput({
  ariaLabel,
  baseAmount,
  value,
  onChange,
}: InvoiceAmountInputProps) {
  const maxAmount = Math.max(0, Math.round(baseAmount * 100) / 100)

  const fakeField = {
    name: 'amount',
    state: {
      value,
      meta: {
        errors: [],
      },
    },
    handleChange: (val: number) => {
      onChange(Math.min(maxAmount, val))
    },
    handleBlur: () => {},
  }

  return (
    <div className="space-y-2" data-aria-label={ariaLabel}>
      <div className="relative [&_input]:pl-10 [&_.mt-1]:mt-0 [&_label]:sr-only">
        <span className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-sm text-muted-foreground">
          Rp
        </span>
        <fieldContext.Provider
          value={
            fakeField as unknown as ComponentProps<
              typeof fieldContext.Provider
            >['value']
          }
        >
          <NumberField label={ariaLabel} placeholder="0" />
        </fieldContext.Provider>
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK_PERCENTAGES.map((percentage) => {
          const quickAmount =
            Math.round(((maxAmount * percentage) / 100) * 100) / 100

          return (
            <Button
              key={percentage}
              type="button"
              variant={value === quickAmount ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onChange(quickAmount)}
            >
              {percentage}%
            </Button>
          )
        })}
      </div>
    </div>
  )
}
