type NumericDisplayValue = string | number

export function stripNonDigits(value: NumericDisplayValue): string {
  return String(value).replace(/\D/g, '')
}

const PHONE_GROUP = /^(\d{0,4})(\d{0,4})(\d{0,4})/

export function formatPhone(displayValue: string): string {
  const digits = stripNonDigits(displayValue)
  const match = digits.match(PHONE_GROUP)
  if (!match) return digits
  const parts = [match[1], match[2], match[3]].filter(Boolean)
  return parts.join('-')
}

export function formatNumber(displayValue: NumericDisplayValue): string {
  const digits = stripNonDigits(displayValue)
  if (!digits) return ''
  return new Intl.NumberFormat('id-ID').format(Number(digits))
}

export function stripNumberFormatting(
  displayValue: NumericDisplayValue,
): string {
  return stripNonDigits(displayValue)
}

export function firstError(errors: Array<unknown>): string | null {
  const error = errors[0]
  if (!error) return null
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  )
    return error.message
  return String(error)
}
