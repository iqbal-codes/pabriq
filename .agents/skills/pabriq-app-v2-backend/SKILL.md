---
name: pabriq-app-v2-backend
description: How backend work is done in the pabriq-app-v2 codebase: server functions live in src/features/*/server.ts and call model functions in src/features/*/model.ts using Drizzle ORM; session/org resolution uses Better Auth via src/lib/auth-session.ts; raw HTTP API routes live in src/routes/api/. Use whenever the user adds or edits server functions, model queries, API routes, auth logic, or backend data access in pabriq-app-v2, even if they don't say 'backend'.
---

# pabriq-app-v2 — Backend

Backend logic in this codebase is split across two layers: **server functions** (`src/features/*/server.ts`) that handle auth, validation, and orchestration, and **model functions** (`src/features/*/model.ts`) that contain pure Drizzle queries and business logic. Raw HTTP API routes (webhooks, file downloads) live separately in `src/routes/api/`.

> Read `../pabriq-app-v2-foundation/references/codebase-profile.md` first for the stack, architecture, and tooling context. This skill adds the backend-specific details.

## Where things live

- **Server functions**: `src/features/<feature>/server.ts` — each feature module exports `createServerFn` handlers (e.g. `createInvoiceFn`, `listOrdersFn`). These resolve the session/org, validate input, and delegate to model functions.
- **Model / data layer**: `src/features/<feature>/model.ts` — pure async functions that accept `orgId` as the first parameter and run Drizzle ORM queries. Types are co-located here.
- **Auth & session**: `src/lib/auth.ts` (Better Auth config, access-control roles), `src/lib/auth-session.ts` (session resolution helpers: `resolveOrgId`, `resolveOrgContext`, `getCurrentSession`).
- **Raw API routes**: `src/routes/api/` — file-based TanStack Router routes with `server.handlers.GET/POST` for webhooks and binary responses (PDFs).
- **DB client**: `src/db/index.ts` — Drizzle client over `pg` Pool.
- **Schema**: `src/db/schema.ts` — all table definitions.
- **Shared error type**: `src/lib/server-results.ts` — `MutationResult`.

## How we do backend here

### Server functions with session resolution

Every server function follows the same shape: `createServerFn` → input validator → handler that resolves `orgId` via `resolveOrgId()`, then delegates to a model function. Errors are caught and returned as `{ ok: false, error }`.

> from `src/features/invoices/server.ts`

```ts
export const createInvoiceFn = createServerFn({ method: 'POST' })
  .inputValidator((input: CreateInvoiceInput) => input)
  .handler(async ({ data }): Promise<MutationResult> => {
    const orgId = await resolveOrgId()
    try {
      const { createInvoice } = await import('./model')
      await createInvoice(orgId, data)
      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  })
```

Why: `resolveOrgId()` queries the Better Auth session headers, finds the user's membership, and returns the first org — every handler is scoped to one organization.

### Zod validation at the boundary

When inputs need schema validation (untrusted or complex), server functions parse through Zod inside `.inputValidator()` instead of pass-through typing.

> from `src/features/invoices/server.ts`

```ts
const createPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(['bank_transfer', 'payment_gateway', 'cash']),
  reference: z.string().optional(),
  proofAssetId: z.string().optional(),
  receivedAt: z.string().datetime().optional(),
})

export const createPaymentFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => createPaymentSchema.parse(input))
  .handler(async ({ data }): Promise<MutationResult> => {
    const orgId = await resolveOrgId()
    const { createPayment } = await import('./model')
    await createPayment(orgId, { ... })
    return { ok: true }
  })
```

Why: Zod catches malformed input before it reaches the model layer; the `unknown` input type signals "validate from scratch" vs typed pass-through.

### Model functions: org-scoped Drizzle queries

Model functions are pure async functions that accept `orgId` first, import the Drizzle client and schema, and return typed results. Every query filters by `orgId`.

> from `src/features/invoices/model.ts`

```ts
export async function createInvoice(
  orgId: string,
  input: CreateInvoiceInput,
): Promise<CreateInvoiceResult> {
  const now = new Date()
  const invoiceId = generateId()
  const invoiceNumber = await generateInvoiceNumber(orgId)
  // ... build line items from order ...
  await db.insert(invoicesTable).values({
    id: invoiceId,
    orgId,
    invoiceNumber,
    // ...
  })
  return { id: invoiceId, invoiceNumber }
}
```

Why: Model functions never import auth or session helpers — they receive `orgId` as a parameter, keeping them testable and decoupled from the request layer.

### Raw API routes for webhooks and binary responses

Non-TanStack-Start endpoints (payment webhooks, PDF downloads) use `createFileRoute` with `server.handlers`.

> from `src/routes/api/midtrans-notification.ts`

```ts
export const Route = createFileRoute('/api/midtrans-notification')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as MidtransWebhookBody
        if (!verifyMidtransSignature(body)) {
          return new Response('Unauthorized signature', { status: 403 })
        }
        const [invoice] = await db
          .select()
          .from(invoicesTable)
          .where(eq(invoicesTable.invoiceNumber, invoiceNumber))
          .limit(1)
        // ... process webhook, return Response
      },
    },
  },
})
```

Why: Webhooks and file-serving routes need raw `Request`/`Response` control; they import the Drizzle client directly rather than going through server functions.

## Commands

- Dev server: `bun run dev`
- Build: `bun run build`
- Typecheck: `bun run typecheck`
- DB generate migration: `bun run db:generate`
- DB migrate: `bun run db:migrate`
- DB studio: `bun run db:studio`

## Conventions observed

- Every server function returns `MutationResult` (`{ ok: true } | { ok: false; error: string }`) for mutations, or a typed result for queries.
- Model functions take `orgId` as their first parameter; server functions are responsible for resolving it.
- Imports inside handlers use dynamic `await import('./model')` to keep server function bundles lean.
- Zod schemas are defined at the bottom of server files, near the functions that use them.
- Access-control roles (`owner`, `admin`, `member`) are defined in `src/lib/auth.ts` via Better Auth's `createAccessControl` plugin.
- File-based API routes use `src/routes/api/` with TanStack Router's `createFileRoute` and `server.handlers`.

## Anti-patterns to avoid

- Never call `resolveOrgId()` or `auth.api.getSession()` from model functions — they are request-layer concerns only.
- Never use pass-through typed input on endpoints that accept external/untrusted data — use Zod `.parse()` instead.
- Never return raw `Error` objects from server functions — always extract `.message` into the `MutationResult` error string.
- Never import server-only code (`#/lib/auth`, `#/db/index`) in client-side hooks or components.

## Gaps / verify

- The `resolveOrgId()` function always picks the first membership (`limit(1)`); multi-org switching is a known TODO (see `src/lib/auth-session.ts:89`).
- No formal API route for most operations — the primary API surface is TanStack `createServerFn` endpoints, not REST. Verify before assuming REST-style endpoints exist.
- The `src/lib/rls.ts` file referenced in some docs does not exist; org scoping is done manually via `eq(table.orgId, orgId)` in every query.
