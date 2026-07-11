import { formatShortDate } from '#/lib/formatters'

export type TaskContext = Record<
  string,
  string | number | boolean | null
> | null

export type DeadlineInfo = {
  date: Date
  dayDelta: number
  dateLabel: string
}

export function getTaskDeadlineInfo(
  ctx: TaskContext,
  locale: string,
  referenceDate: Date,
): DeadlineInfo | null {
  const raw = ctx?.deadline
  if (raw == null || raw === '') return null
  const date = new Date(String(raw))
  if (Number.isNaN(date.getTime())) return null
  const msPerDay = 24 * 60 * 60 * 1000
  const startOfReference = new Date(referenceDate)
  startOfReference.setHours(0, 0, 0, 0)
  const startOfDeadline = new Date(date)
  startOfDeadline.setHours(0, 0, 0, 0)
  const dayDelta = Math.round(
    (startOfDeadline.getTime() - startOfReference.getTime()) / msPerDay,
  )
  return {
    date,
    dayDelta,
    dateLabel: formatShortDate(date.toISOString(), locale),
  }
}

export function getTaskDeadlineClasses(
  daysFromNow: number,
  showDeadlineOutcome: boolean,
): string {
  if (showDeadlineOutcome) {
    if (daysFromNow > 0)
      return 'bg-success text-success-foreground border-transparent'
    if (daysFromNow === 0)
      return 'bg-brand-accent text-primary border-transparent'
    return 'bg-destructive text-destructive-foreground border-transparent'
  }
  if (daysFromNow < 0) {
    return 'bg-destructive text-destructive-foreground border-transparent font-semibold animate-pulse'
  }
  if (daysFromNow === 0) {
    return 'bg-destructive text-destructive-foreground border-transparent font-medium'
  }
  if (daysFromNow <= 2) {
    return 'bg-warning text-warning-foreground border-transparent'
  }
  if (daysFromNow <= 5) {
    return 'bg-warning/80 text-warning-foreground border-transparent'
  }
  return 'bg-success text-success-foreground border-transparent'
}
