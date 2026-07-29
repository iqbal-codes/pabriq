export async function getDetachedHeaders(): Promise<Headers> {
  const { getRequestHeaders } = await import('@tanstack/react-start/server')
  const rawHeaders = getRequestHeaders()
  const headers = new Headers()
  for (const [key, value] of rawHeaders.entries()) {
    headers.set(key, value)
  }
  return headers
}

export async function getSessionServer(inputHeaders?: Headers) {
  const { auth } = await import('#/lib/auth')
  let headers: Headers
  if (inputHeaders) {
    headers = new Headers()
    for (const [key, value] of inputHeaders.entries()) {
      headers.set(key, value)
    }
  } else {
    headers = await getDetachedHeaders()
  }
  return auth.api.getSession({ headers })
}

export async function resolveOrgId(): Promise<string> {
  const [{ db }, { member }, { eq }] = await Promise.all([
    import('#/db/index'),
    import('#/db/schema'),
    import('drizzle-orm'),
  ])

  const session = await getSessionServer()
  if (!session) throw new Error('Not authenticated')

  const memberships = await db
    .select({ orgId: member.organizationId })
    .from(member)
    .where(eq(member.userId, session.user.id))
    .limit(1)

  if (memberships.length === 0) throw new Error('No organization')
  return memberships[0].orgId
}

export type OrgAndRole = { orgId: string; role: string }

export async function resolveOrgAndRole(): Promise<OrgAndRole> {
  const [{ db }, { member }, { eq }] = await Promise.all([
    import('#/db/index'),
    import('#/db/schema'),
    import('drizzle-orm'),
  ])

  const session = await getSessionServer()
  if (!session) throw new Error('Not authenticated')

  const memberships = await db
    .select({ orgId: member.organizationId, role: member.role })
    .from(member)
    .where(eq(member.userId, session.user.id))
    .limit(1)

  if (memberships.length === 0) throw new Error('No organization')
  return { orgId: memberships[0].orgId, role: memberships[0].role }
}

export type OrgAndSubscriptionStatus = {
  orgId: string
  subscriptionStatus: string | null
}

export async function resolveOrgIdWithSubscription(): Promise<OrgAndSubscriptionStatus> {
  const orgId = await resolveOrgId()

  try {
    // Dynamic import keeps server-only code out of client bundles
    const { getSubscription } = await import('#/features/subscriptions/model')
    const sub = await getSubscription(orgId)
    return {
      orgId,
      subscriptionStatus: sub?.status ?? null,
    }
  } catch {
    // If subscription model isn't available (e.g., during setup), return null status
    return { orgId, subscriptionStatus: null }
  }
}
