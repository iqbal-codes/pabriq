import { randomUUID } from 'node:crypto'
import { Client } from 'pg'

/**
 * Seed deterministic fixtures for the admin control-panel E2E spec.
 *
 * Idempotent: tears down fixture rows first, then inserts. Runs against
 * DATABASE_URL from .env.local (the DB the dev server actually reads).
 *
 * Usage: bun run e2e/seed-admin-fixtures.ts
 */
const GUARD_EMAIL = 'guard@pabriq.dev'
const ORG_FIXTURES = [
  { name: 'PT Karet Jaya Abadi', slug: 'karet-jaya-abadi' },
  { name: 'Furniture Nusantara', slug: 'furniture-nusantara' },
]
const PLAN_FIXTURE = { slug: 'fixture-starter', name: 'Starter (fixture)' }

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    const actor = (
      await client.query('SELECT id, name FROM "user" WHERE email = $1', [
        GUARD_EMAIL,
      ])
    ).rows[0]
    if (!actor) {
      throw new Error(
        `${GUARD_EMAIL} not found — run bootstrap first (BOOTSTRAP_OWNER_EMAIL=${GUARD_EMAIL} bun run bootstrap:owner)`,
      )
    }

    // ── teardown (idempotent) ───────────────────────────────────────────
    await client.query(
      `DELETE FROM audit_events WHERE details->>'fixture' = 'true'`,
    )
    await client.query(
      `DELETE FROM subscriptions WHERE org_id IN
         (SELECT id FROM organization WHERE slug = ANY($1::text[]))`,
      [ORG_FIXTURES.map((o) => o.slug)],
    )
    await client.query(`DELETE FROM plans WHERE slug = $1`, [PLAN_FIXTURE.slug])
    await client.query(
      `DELETE FROM member WHERE organization_id IN
         (SELECT id FROM organization WHERE slug = ANY($1::text[]))`,
      [ORG_FIXTURES.map((o) => o.slug)],
    )
    await client.query(
      `DELETE FROM organization WHERE slug = ANY($1::text[])`,
      [ORG_FIXTURES.map((o) => o.slug)],
    )

    // ── plan + organizations + membership + subscriptions + audit ──────
    const planId = randomUUID()
    await client.query(
      `INSERT INTO plans
         (id, slug, name, version, description, entitlements,
          monthly_price_cents, annual_price_cents, active, created_at, updated_at)
       VALUES ($1, $2, $3, 1, 'E2E fixture plan',
               '{"maxOrders": 100, "maxProducts": 50, "maxCustomers": 100,
                 "maxMembers": 10, "maxStorageBytes": null,
                 "features": ["orders"], "warningThresholds": {}}',
               50000, 500000, true, now() - interval '30 days', now())`,
      [planId, PLAN_FIXTURE.slug, PLAN_FIXTURE.name],
    )

    for (const org of ORG_FIXTURES) {
      const orgId = randomUUID()
      await client.query(
        `INSERT INTO organization (id, name, slug, created_at, updated_at)
         VALUES ($1, $2, $3, now() - interval '30 days', now())`,
        [orgId, org.name, org.slug],
      )
      await client.query(
        `INSERT INTO member (id, organization_id, user_id, role, created_at)
         VALUES ($1, $2, $3, 'owner', now() - interval '30 days')`,
        [randomUUID(), orgId, actor.id],
      )
      await client.query(
        `INSERT INTO subscriptions
           (id, org_id, plan_id, status, billing_cadence,
            current_period_starts_at, current_period_ends_at,
            created_at, updated_at)
         VALUES ($1, $2, $3, 'active', 'monthly',
                 now() - interval '30 days', now() + interval '30 days',
                 now() - interval '30 days', now())`,
        [randomUUID(), orgId, planId],
      )
      await client.query(
        `INSERT INTO audit_events
           (id, actor_id, actor_name, organization_id, organization_name,
            action, details, created_at)
         VALUES ($1, $2, $3, $4, $5, 'organization.created',
                 '{"fixture": true}', now() - interval '3 days')`,
        [randomUUID(), actor.id, actor.name, orgId, org.name],
      )
    }

    // one platform-level event (no org)
    await client.query(
      `INSERT INTO audit_events
         (id, actor_id, actor_name, action, details, created_at)
       VALUES ($1, $2, 'Superuser', 'plan.created', '{"fixture": true}',
               now() - interval '2 hours')`,
      [randomUUID(), actor.id],
    )

    const orgs = (
      await client.query(
        `SELECT name FROM organization WHERE slug = ANY($1::text[])`,
        [ORG_FIXTURES.map((o) => o.slug)],
      )
    ).rows
    const events = (
      await client.query(
        `SELECT count(*)::int AS n FROM audit_events WHERE details->>'fixture' = 'true'`,
      )
    ).rows[0]
    const subs = (
      await client.query(
        `SELECT count(*)::int AS n FROM subscriptions s
         JOIN organization o ON o.id = s.org_id
         WHERE o.slug = ANY($1::text[])`,
        [ORG_FIXTURES.map((o) => o.slug)],
      )
    ).rows[0]
    console.log(
      `seeded: ${orgs.length} orgs (${orgs.map((o) => o.name).join(', ')}) + ${events.n} audit events + ${subs.n} subscriptions`,
    )
  } finally {
    await client.end()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
