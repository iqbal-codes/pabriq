const _currencyFormatters = new Map<string, Intl.NumberFormat>()
export function formatCurrency(amount: number, locale: string): string {
  let fmt = _currencyFormatters.get(locale)
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
    _currencyFormatters.set(locale, fmt)
  }
  return fmt.format(amount)
}

const _numberFormatters = new Map<string, Intl.NumberFormat>()
export function formatNumber(value: number, locale: string): string {
  let fmt = _numberFormatters.get(locale)
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale)
    _numberFormatters.set(locale, fmt)
  }
  return fmt.format(value)
}

const _shortDateFormatters = new Map<string, Intl.DateTimeFormat>()
export function formatShortDate(value: string, locale: string): string {
  let fmt = _shortDateFormatters.get(locale)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
    })
    _shortDateFormatters.set(locale, fmt)
  }
  return fmt.format(new Date(value))
}

const _longDateFormatters = new Map<string, Intl.DateTimeFormat>()
export function formatLongDate(value: string, locale: string): string {
  let fmt = _longDateFormatters.get(locale)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    _longDateFormatters.set(locale, fmt)
  }
  return fmt.format(new Date(value))
}
