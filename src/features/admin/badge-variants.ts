export function orgStatusBadgeVariant(
  status: string | null | undefined,
): 'success' | 'warning' | 'destructive' | 'secondary' {
  if (!status) return 'secondary'
  if (status === 'active' || status === 'trialing') return 'success'
  if (status === 'suspended' || status === 'canceled') return 'destructive'
  if (status === 'past_due' || status === 'grace_period') return 'warning'
  return 'secondary'
}

export function migrationStatusBadgeVariant(
  status: string | null | undefined,
): 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case 'accepted':
      return 'success'
    case 'failed':
      return 'destructive'
    case 'pending_review':
      return 'warning'
    default:
      return 'secondary'
  }
}
