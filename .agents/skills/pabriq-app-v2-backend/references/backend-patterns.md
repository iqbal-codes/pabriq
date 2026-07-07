# pabriq-app-v2 — Backend Pattern Catalog

> Read `../pabriq-app-v2-foundation/references/codebase-profile.md` first for shared stack and architecture context.
> This file expands the `pabriq-app-v2-backend` skill with reusable patterns and boilerplate preferences.

## How to use this catalog

- Prefer these existing patterns before creating new abstractions.
- Copy from the canonical examples listed here.
- If docs and source disagree, follow the drift note and verify in live source before editing.

## Patterns

### createServerFn — list (GET)

- **Use when**: Any data-fetching server function (list, get, detail).
- **Prefer**: `createServerFn({ method: 'GET' })` with `.inputValidator()` for typed input.
- **Canonical examples**:
  - `src/features/customers/server.ts` — `listCustomersFn`, `getCustomerFn` (cleanest thin wrappers)
  - `src/features/products/server.ts` — `listProductsFn` (complex: search, sort, pagination, column narrowing)
  - `src/features/orders/server.ts` — `listOrdersFn` (dynamic model import)
- **Why**: GET functions return data directly; no error wrapping needed (errors propagate as exceptions).
- **Do**:
  - Use `method: 'GET'` for all read operations
  - Dynamic-import the model function inside the handler
  - Parallelize `resolveOrgId()` with model import using `Promise.all`
- **Avoid**:
  - Using `method: 'POST'` for reads
  - Importing model functions at file top level

### createServerFn — mutate (POST)

- **Use when**: Any mutation server function (create, update, delete).
- **Prefer**: `createServerFn({ method: 'POST' })` returning `MutationResult`.
- **Canonical examples**:
  - `src/features/customers/server.ts` — `createCustomerFn`, `updateCustomerFn`, `deleteCustomerFn` (canonical CRUD pattern)
  - `src/features/invoices/server.ts` — `createInvoiceFn`, `markInvoicePaidFn` (includes session lookup for audit)
  - `src/features/assets/server.ts` — `finalizeUpload` (complex validation with Zod schemas)
- **Why**: POST mutations wrap results in `MutationResult` for safe client consumption.
- **Do**:
  - Return `{ ok: true }` or `{ ok: true; id: string }` on success
  - Catch exceptions and return `{ ok: false, error: e instanceof Error ? e.message : 'Unknown error' }`
  - Use `MutationResult` from `#/lib/server-results` when no extra data is returned
- **Avoid**:
  - Throwing errors to the caller (catch and return in the discriminated union)
  - Returning raw data without the `{ ok: true }` wrapper

### Org resolution — resolveOrgId

- **Use when**: Any server function needs the current user's organization ID.
- **Prefer**: `resolveOrgId()` from `#/lib/auth-session-server`.
- **Canonical examples**:
  - `src/features/customers/server.ts` — simple org resolution pattern
  - `src/features/products/server.ts` — parallelized with model import
  - `src/features/invoices/server.ts` — parallelized with auth + model imports
- **Why**: Re-verified from the session against the DB; never trusts client-provided orgId.
- **Do**:
  - Call `resolveOrgId()` inside the handler, not from input
  - Use `Promise.all([resolveOrgId(), import('./model')])` to parallelize
  - Accept `orgId` in input type only as a pass-through (server re-derives it)
  - Import from `#/lib/auth-session-server` in server.ts files
- **Avoid**:
  - Using `data.orgId` from client input as the source of truth
  - Creating a second org resolution pattern (there is only one)
  - Importing `resolveOrgId` from `#/lib/auth-session` (the client module does not export it)

### Org context — resolveOrgContext

- **Use when**: Route guards need session + org + role in a single call.
- **Prefer**: `resolveOrgContext()` from `#/lib/auth-session`.
- **Canonical examples**:
  - `src/routes/_org.tsx` — the org layout guard
- **Why**: Returns a discriminated union with all three states (authenticated+org, unauthenticated, no-org) so the caller can redirect appropriately.
- **Do**:
  - Check `result.ok` first, then `result.reason` for the failure case
  - Return `{ session, org, role }` for downstream route context
- **Avoid**:
  - Using `getCurrentSession()` when you also need org resolution (use `resolveOrgContext`)
  - Manually querying memberships when `resolveOrgContext` already does it

### Input validation with Zod

- **Use when**: Mutation endpoints need runtime validation beyond TypeScript types.
- **Prefer**: Zod schemas defined in `src/lib/validation-schemas.ts` for shared schemas; inline for feature-specific.
- **Canonical examples**:
  - `src/lib/validation-schemas.ts` — `productFormSchema`, `customerFormSchema`, `orderFormSchema`
  - `src/features/assets/server.ts` — inline Zod schemas in `.inputValidator()` for upload types
  - `docs/agents/boilerplate/server-functions.md` — `createItemSchema` example
- **Why**: Zod provides runtime validation + type inference; `.inputValidator()` is the enforcement point.
- **Do**:
  - Use `z.object(...)` inside `.inputValidator()` for POST endpoints
  - Parse with `.parse(input)` to get validated + typed output
  - Co-locate feature-specific schemas near the server function; shared schemas in `validation-schemas.ts`
- **Avoid**:
  - Trusting TypeScript types alone (they're erased at runtime)
  - Defining duplicate schemas when one already exists in `validation-schemas.ts`

### Query key factory

- **Use when**: Any TanStack Query usage.
- **Prefer**: `queryKeys` from `#/lib/query-keys.ts`.
- **Canonical examples**:
  - `src/lib/query-keys.ts` — `products`, `customers`, `orders`, `assets`, `invoices`, `production`, `portal`, `address`, `assistant`
- **Why**: Centralized keys prevent invalidation mismatches and make cache management predictable.
- **Do**:
  - Use the `all → lists → list(filters)` hierarchy for list queries
  - Use the `all → details → detail(id)` hierarchy for single-item queries
  - Include filter params in the key for automatic cache separation
- **Avoid**:
  - Inline string arrays like `['products', 'list']`
  - Mutating cache manually when `queryClient.invalidateQueries` suffices

### Sort column maps

- **Use when**: Any server-side sorted list endpoint.
- **Prefer**: `buildOrderBy` with `SortColumnMap` from `#/lib/sorting.ts`.
- **Canonical examples**:
  - `src/features/products/server.ts` — `PRODUCT_SORT_COLUMNS` with `satisfies SortColumnMap`
  - `src/lib/sorting.ts` — `buildOrderBy`, `encodeSort`, `decodeSort`
- **Why**: Type-safe sort column mapping prevents invalid column references and supports null ordering.
- **Do**:
  - Define a `const SORT_COLUMNS = { ... } satisfies SortColumnMap` per feature
  - Use `{ expression: col, nulls: 'last' }` for nullable columns
  - Pass a fallback `desc(table.createdAt)` as the default sort
- **Avoid**:
  - Custom sort implementations outside `buildOrderBy`
  - Accepting arbitrary sort field names from the client without validation

### Asset upload — R2 signed URL flow

- **Use when**: Any file upload to Cloudflare R2.
- **Prefer**: `createR2UploaderAdapter` from `src/features/assets/server.ts`.
- **Canonical examples**:
  - `src/features/assets/server.ts` — `getUploadUrl`, `finalizeUpload` (presigned PUT flow)
  - `src/components/app/asset-upload/` — `AssetUploadDropzone`, `PhotoGridUpload`, `FileListUpload`
  - `docs/agents/boilerplate/asset-upload.md` — full adapter interface
- **Why**: Two-step flow (get presigned URL → upload directly to R2 → finalize metadata) avoids proxying large files through the server.
- **Do**:
  - Use `getUploadUrl` to get a presigned PUT URL + asset ID
  - Upload directly to R2 with the presigned URL
  - Call `finalizeUpload` with the asset ID and metadata after upload completes
  - Use `USAGE_LIMITS` and `getAcceptedMimeTypes` for client-side validation
- **Avoid**:
  - Proxying file bytes through the server
  - Uploading without a presigned URL (direct server upload)

### Dynamic imports — server-only modules

- **Use when**: Importing `auth`, `db`, or any server-only module inside a `createServerFn` handler.
- **Prefer**: `await import('#/lib/auth')` inside the handler body.
- **Canonical examples**:
  - `src/features/orders/server.ts:18` — `const { listOrders } = await import('./model')`
  - `src/features/invoices/server.ts:25` — `const { createInvoice } = await import('./model')`
  - `src/lib/auth-session.ts:44-47` — parallel dynamic imports of `getRequestHeaders` and `auth`
- **Why**: Prevents server-only code (auth, DB driver) from being bundled into client code by Vite.
- **Do**:
  - Use `const { fn } = await import('./model')` for model functions
  - Use `const { auth } = await import('#/lib/auth')` for auth
  - Parallelize with `Promise.all` when multiple dynamic imports are needed
- **Avoid**:
  - Top-level `import` of server-only modules in server.ts files
  - Using static imports for `#/lib/auth` or `#/db/index` in server function files

### Permission guards

- **Use when**: Role-based access checks in UI or server logic.
- **Prefer**: Pure functions from `src/features/permissions/model.ts`.
- **Canonical examples**:
  - `src/features/permissions/model.ts` — `canManageMembers`, `canManageProducts`, `canCreateOrders`, `canApproveOrders`, `canManageInvoices`, `canViewProduction`, `canAdvanceProductionTask`
- **Why**: Centralized role-to-permission mapping; Better Auth also enforces statement-level permissions.
- **Do**:
  - Import and call the guard function with the role: `if (canManageProducts(org.role)) { ... }`
  - Use the `Role` type (`'owner' | 'admin' | 'member'`) from `#/features/permissions/model`
- **Avoid**:
  - Inline role string comparisons (`role === 'admin'`)
  - Duplicating permission logic outside the permission module

### Batch operations — avoid N+1

- **Use when**: Multiple DB inserts, updates, or deletes on the same table.
- **Prefer**: Drizzle's array-accepting `insert()`, `update()`, `delete()` methods.
- **Canonical examples**:
  - `src/features/orders/server.ts` — order creation with line items (known N+1 risk per `docs/agents/rules/query-patterns.md`)
  - `src/features/production/server.ts` — production task spawning (known N+1 risk)
- **Why**: Single round-trip to Postgres instead of N round-trips; transaction-safe.
- **Do**:
  - Use `db.insert(table).values([...manyRows])` instead of looping `db.insert(table).values(row)`
  - Wrap loops in a transaction when atomicity is required
- **Avoid**:
  - `for` loops with individual DB calls
  - Assuming "small list today" means "small list forever"

### AI Assistant & Mastra Agent Integration
- **Use when**: Implementing conversational AI features or autonomous agents with access to database resources.
- **Prefer**: Mastra `Mastra` core instance in `src/mastra/index.ts` with custom tools in `src/mastra/tools/business-tools.ts` executing model-layer functions.
- **Canonical examples**:
  - `src/mastra/index.ts` — main entry registering tools (`businessSearchTool`, `businessOverviewTool`, `resolveOrderDraftTool`), agents, and logger.
  - `src/features/assistant/server.ts` — server functions (`loadAssistantChatFn`, `sendAssistantMessageFn`, `proposeOrderDraftFn`) wrapper.
  - `src/features/assistant/model.ts` — model functions resolving memory scopes and business overview logic.
- **Do**:
  - Perform auth validation first, and resolve `orgId` and `role` before calling agent tools.
  - Parallelize context resolution and import of the Mastra instance inside handlers.
  - Capture and log execution durations and errors to Sentry using the logger.
- **Avoid**:
  - Direct execution of agent logic on the client side.
  - Granting agents tools that skip user-role permission constraints.

### Midtrans snap token and payment reconciliation
- **Use when**: Generating secure payment tokens and reconciling webhook notifications or manual lookup states.
- **Prefer**: `createSnapTokenFn`, `reconcilePortalPaymentFn`, and `reconcileInvoicePaymentFn` in `src/features/invoices/server.ts`.
- **Canonical examples**:
  - `src/features/invoices/server.ts` — snap token and reconciliation handlers.
  - `src/features/invoices/model.ts` — Midtrans client wrappers.
- **Do**:
  - Catch all exceptions during external payment calls and map to typed error results.
  - Re-verify transaction state from the gateway (Midtrans Snap API) during reconciliation, never trust client state.
- **Avoid**:
  - Storing raw client signatures without verifying them against gateway tokens.
### Auth-session module separation

- **Use when**: Any server-only code needs `resolveOrgId`; any client-safe code needs `getCurrentSession` or `resolveOrgContext`.
- **Prefer**: Import `resolveOrgId` from `#/lib/auth-session-server` in server functions; import `getCurrentSession`, `resolveOrgContext`, and type definitions from `#/lib/auth-session` in route guards and client-safe code.
- **Canonical examples**:
  - `src/lib/auth-session-server.ts` — `resolveOrgId()` (server-only, uses dynamic imports internally)
  - `src/lib/auth-session.ts` — `getCurrentSession` (createServerFn wrapper), `resolveOrgContext()`, `AuthSession`, `OrgContextResult` types
- **Why**: Separating server-only code from client-safe code prevents server-only modules (auth, DB driver) from being bundled into client code by Vite.
- **Do**:
  - Import `resolveOrgId` from `#/lib/auth-session-server` in `src/features/*/server.ts`
  - Import `resolveOrgContext` / `getCurrentSession` from `#/lib/auth-session` in route guards
  - Use dynamic imports inside `resolveOrgId` to avoid bundling server modules
- **Avoid**:
  - Importing `resolveOrgId` from `#/lib/auth-session` (the client module does not export it)
  - Mixing server-only and client-safe auth helpers in the same file

### Cross-feature model calls

- **Use when**: A server function in one feature needs to call a model function from another feature (e.g., order timeline for admin views).
- **Prefer**: Dynamic-import the other feature's model function inside the handler.
- **Canonical examples**:
  - `src/features/orders/server.ts` — `getOrderAdminTimelineFn` imports `getOrderTimelineByOrderId` from `#/features/portal/model`
  - `src/features/portal/model.ts` — `getOrderTimeline()` delegates to `getOrderTimelineByOrderId()` (same module, token-based wrapper)
- **Why**: Cross-feature calls are rare but legitimate. Dynamic-import keeps the dependency lazy and avoids circular imports.
- **Do**:
  - Use `const { fn } = await import('#/features/other-feature/model')` inside the handler
  - Keep the import path explicit with `#/` prefix for clarity
- **Avoid**:
  - Top-level imports of other feature modules in server.ts files
  - Creating thin re-export wrappers to avoid the dynamic import
