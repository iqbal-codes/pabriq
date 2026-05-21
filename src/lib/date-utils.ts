/**
 * Add working days to a date.
 * Working days: Monday (1) through Saturday (6)
 * Non-working days: Sunday (0)
 *
 * @param startDate - Starting date (inclusive)
 * @param workingDays - Number of working days to add
 * @returns Resulting date after adding working days
 */
export function addWorkingDays(startDate: Date, workingDays: number): Date {
  if (workingDays <= 0) return startDate

  const result = new Date(startDate)
  let daysAdded = 0

  // Start from the next day
  result.setDate(result.getDate() + 1)

  while (daysAdded < workingDays) {
    const dayOfWeek = result.getDay()
    // Sunday = 0, skip it. Monday-Saturday = 1-6, count as working day
    if (dayOfWeek !== 0) {
      daysAdded++
      if (daysAdded < workingDays) {
        result.setDate(result.getDate() + 1)
      }
    } else {
      // Skip Sunday
      result.setDate(result.getDate() + 1)
    }
  }

  return result
}

/**
 * Calculate the number of working days between two dates.
 * Working days: Monday (1) through Saturday (6)
 * Non-working days: Sunday (0)
 *
 * @param startDate - Starting date (inclusive)
 * @param endDate - Ending date (inclusive)
 * @returns Number of working days between the dates
 */
export function getWorkingDaysBetween(startDate: Date, endDate: Date): number {
  if (endDate <= startDate) return 0

  let count = 0
  const current = new Date(startDate)

  while (current < endDate) {
    current.setDate(current.getDate() + 1)
    const dayOfWeek = current.getDay()
    // Sunday = 0, skip it. Monday-Saturday = 1-6, count as working day
    if (dayOfWeek !== 0) {
      count++
    }
  }

  return count
}
