import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'

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

  return (
    <div className="space-y-2">
      <div className="relative max-w-48">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
          Rp
        </span>
        <Input
          aria-label={ariaLabel}
          inputMode="numeric"
          type="text"
          value={value === 0 ? '' : String(value)}
          placeholder="0"
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, '')
            if (digits.length === 0) {
              onChange(0)
              return
            }
            onChange(Math.min(maxAmount, Number(digits)))
          }}
          className="pl-10"
        />
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
