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

export function formatPdfDateTime(date: Date | string): string {
  const value = typeof date === 'string' ? new Date(date) : date
  const dateStr = formatPdfDate(value)
  const hours = String(value.getHours()).padStart(2, '0')
  const minutes = String(value.getMinutes()).padStart(2, '0')
  return `${dateStr}, ${hours}:${minutes}`
}
