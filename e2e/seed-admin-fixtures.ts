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
      `DELETE FROM member WHERE organization_id IN
         (SELECT id FROM organization WHERE slug = ANY($1::text[]))`,
      [ORG_FIXTURES.map((o) => o.slug)],
    )
    await client.query(
      `DELETE FROM organization WHERE slug = ANY($1::text[])`,
      [ORG_FIXTURES.map((o) => o.slug)],
    )

    // ── organizations + membership + audit trail ────────────────────────
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
    console.log(
      `seeded: ${orgs.length} orgs (${orgs.map((o) => o.name).join(', ')}) + ${events.n} audit events`,
    )
  } finally {
    await client.end()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
