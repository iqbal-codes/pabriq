const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatPdfCurrency(amount: number): string {
  return currencyFormatter.format(amount)
}

export function formatPdfDate(date: Date | string): string {
  const value = typeof date === 'string' ? new Date(date) : date
  return value.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

export function formatPdfPercent(percent: number): string {
  return `${percent.toFixed(2)}%`
}
