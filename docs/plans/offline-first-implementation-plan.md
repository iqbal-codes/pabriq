# Offline-First Implementation Plan

## Goal
Add offline-first support to Pabriq without changing the server-authoritative data model.

The target end state is:
- the app shell loads while offline,
- selected business data remains readable from local storage,
- selected workflows can be created/edited offline and synced later,
- auth, permissions, and high-risk financial actions remain online-authoritative.

## Scope Decision
This plan intentionally chooses a **hybrid local-first** architecture:
- **Better Auth stays online-first** for real authentication/session validity.
- **IndexedDB becomes the local data store** for offline reads and queued writes.
- **TanStack Query remains the transport/cache coordinator**, not the only offline store.
- **Serwist remains the shell/runtime helper**, not the business sync engine.

## Preconditions
1. The installable PWA worktree (`.worktree/pwa-setup`) should be merged first, or its equivalent should land before Phase 1. This offline plan assumes an app shell + service worker already exist.
2. Do not expand scope to “full local replica of every feature” in the first pass.
3. Keep auth, payment finalization, and role/membership changes online-only until a later explicit design says otherwise.

## Non-Goals
- No offline sign-in, sign-up, or session revalidation.
- No generic cache-first behavior for every authenticated JSON response.
- No service-worker-only sync layer.
- No queueing of stale presigned upload URLs.
- No first-pass offline support for invoice confirmation/rejection, payment finalization, or org/member administration.

## Principles
1. **Server remains the source of truth.** Local state is a durable projection plus an outbox.
2. **Explicit domain sync beats implicit network retries.** Queue business commands, not raw assumptions.
3. **Only make low-conflict workflows offline first.** Start with read models, drafts, comments, and constrained task actions.
4. **Uploads are special.** Store blobs locally; fetch fresh upload URLs when reconnecting.
5. **Offline mode must be honest.** Show “offline”, “sync pending”, “sync failed”, and “session not verified” states clearly.

## Phase 0 — Merge the installable shell baseline
### Goal
Land the PWA shell/service-worker baseline before adding domain offline features.

### Target files
- `.worktree/pwa-setup/src/routes/__root.tsx` (or the repo equivalent after merge)
- `.worktree/pwa-setup/src/sw.ts`
- `.worktree/pwa-setup/src/tanstack-serwist-plugin.ts`
- `.worktree/pwa-setup/vite.config.ts`
- `.worktree/pwa-setup/public/manifest.json`

### Acceptance
- app installs as a PWA,
- service worker registers in production,
- shell assets are precached,
- no business-data runtime caching is introduced yet.

## Phase 1 — Add the offline foundation layer
### Goal
Introduce a browser-side offline subsystem without changing product behavior yet.

### Tasks
1. **Create an offline module under `src/lib/offline/`**
   - New files:
     - `src/lib/offline/db.ts`
     - `src/lib/offline/schema.ts`
     - `src/lib/offline/network.ts`
     - `src/lib/offline/types.ts`
     - `src/lib/offline/index.ts`
   - Responsibilities:
     - Dexie database bootstrap
     - table definitions
     - online/offline event helpers
     - shared sync status types

2. **Define IndexedDB tables for the first rollout**
   - New Dexie tables should include at least:
     - `products`
     - `customers`
     - `orders`
     - `productionTasks`
     - `taskActivities`
     - `outbox`
     - `blobs`
     - `syncState`
     - `uiState`
   - Suggested common fields:
     - `id`
     - `orgId`
     - `updatedAt`
     - `syncedAt`
     - `syncStatus`
     - `deletedAt` when soft-delete semantics matter

3. **Add network state primitives**
   - Build a shared hook or store for:
     - `isOnline`
     - `lastSyncAt`
     - `hasPendingSync`
     - `sessionVerifiedAt`
   - New files:
     - `src/lib/offline/use-network-state.ts`
     - `src/lib/offline/use-sync-state.ts`

4. **Extend the QueryClient bootstrap**
   - File: `src/lib/query-client.ts`
   - Add:
     - persisted client cache
     - hydration/restore path
     - default options for offline-safe queries
   - Add a persister helper, likely:
     - `src/lib/offline/query-persister.ts`
   - Keep server-side QueryClient behavior unchanged.

### Acceptance
- IndexedDB opens successfully on the client.
- Query cache persists across reloads.
- Shared network/sync status is available to the UI.
- No route or feature behavior changes yet beyond persistence plumbing.

## Phase 2 — Make protected routing offline-aware
### Goal
Allow already-authenticated users to open cached workspace routes offline in a constrained/read-only way.

### Problem
Current protected routes call `resolveOrgContext()` in `beforeLoad`, which requires the server on every load.

### Tasks
1. **Introduce a last-known session/org hint store**
   - New file: `src/lib/offline/session-hint.ts`
   - Persist only non-sensitive display fields:
     - `userId`
     - `email`
     - `name`
     - `orgId`
     - `orgName`
     - `role`
     - `verifiedAt`
   - Never store tokens or reconstruct Better Auth session state.

2. **Add an offline-aware route guard strategy**
   - Files:
     - `src/routes/_org.tsx`
     - `src/routes/operator.tsx`
     - `src/routes/sign-in.tsx`
     - `src/routes/onboarding.tsx`
   - Behavior:
     - online: keep the current `resolveOrgContext()` behavior
     - offline + last-known session/org hint exists: allow entry into offline-capable surfaces with an “offline / session not verified” banner
     - offline + no hint: route to sign-in or an explicit offline-unavailable view

3. **Add app-shell sync banners and mode indicators**
   - Likely files:
     - `src/routes/__root.tsx`
     - `src/components/app/` (new banner/status component)
   - New files:
     - `src/components/app/offline-status-banner.tsx`
     - `src/components/app/sync-status-pill.tsx`

### Acceptance
- Offline reload of a previously used protected route can render the shell and local data when a last-known org/user hint exists.
- Offline users are clearly informed that auth/session is not currently verified.
- Users with no prior session hint do not get fake access.

## Phase 3 — Add offline read models for the first business slice
### Goal
Make the highest-value read flows work from local storage.

### First slice
- products
- customers
- orders
- production board snapshot
- task detail + task activities

### Tasks
1. **Add local repository adapters**
   - New files under `src/lib/offline/repositories/`:
     - `products-repo.ts`
     - `customers-repo.ts`
     - `orders-repo.ts`
     - `production-repo.ts`
   - Responsibilities:
     - write normalized data into Dexie after successful server fetches
     - expose read helpers for local boot

2. **Wrap selected feature queries with local read/write-through behavior**
   - Target files:
     - `src/features/products/hooks.ts`
     - `src/features/customers/hooks.ts`
     - `src/features/orders/hooks.ts`
     - `src/features/production/hooks.ts`
   - Pattern:
     - online fetch stays the same
     - on success, persist the result into Dexie
     - when offline, return cached local data instead of hard-failing when safe
   - Use TanStack Query only where it helps; do not force every screen through a single abstraction.

3. **Persist sync metadata per domain**
   - Track:
     - last full sync time
     - last entity sync time
     - stale markers
     - sync errors

### Acceptance
- Previously visited product, customer, order, and production screens remain readable offline.
- Offline reads clearly show “last synced at” when appropriate.
- Online refetch still updates both the UI and the local store.

## Phase 4 — Add an explicit outbox for offline mutations
### Goal
Support offline creation/edit flows via queued domain commands.

### First mutation slice
- draft order create/update
- production task comments
- requirement form progress / notes

### Tasks
1. **Define the outbox model**
   - New files:
     - `src/lib/offline/outbox.ts`
     - `src/lib/offline/outbox-types.ts`
   - Outbox row fields should include:
     - `id`
     - `type`
     - `orgId`
     - `entityId`
     - `payload`
     - `baseVersion` or `baseUpdatedAt`
     - `createdAt`
     - `attemptCount`
     - `status`
     - `lastError`

2. **Create a sync runner**
   - New files:
     - `src/lib/offline/sync-runner.ts`
     - `src/lib/offline/replay.ts`
   - Responsibilities:
     - consume queued commands in order
     - stop on hard conflict
     - retry transient failures
     - update local projections after replay success

3. **Add idempotency-friendly mutation inputs on selected server functions**
   - Likely files:
     - `src/features/orders/server.ts`
     - `src/features/production/server.ts`
     - corresponding model files
   - Add optional fields like:
     - `clientMutationId`
     - `baseUpdatedAt`
   - Use them only where replay safety matters.

4. **Patch local state optimistically before replay**
   - Target files:
     - `src/features/orders/hooks.ts`
     - `src/features/production/hooks.ts`
   - Instead of “server success -> invalidate only”, update Dexie first, enqueue the command, and surface pending sync state.

### Acceptance
- Users can create/update draft orders offline.
- Users can save task comments offline.
- Queued mutations replay automatically on reconnect.
- Duplicate reconnects do not double-apply the same command.

## Phase 5 — Add conflict handling and reconciliation
### Goal
Handle reconnect safely when the server has newer data.

### Tasks
1. **Define conflict policy per domain**
   - Draft orders: field-level last-write-wins is acceptable initially.
   - Task comments: append-only.
   - Requirement responses: last-write-wins unless future audit rules require merge.
   - Task advancement: server must reject stale transitions explicitly.

2. **Add conflict surfaces in the UI**
   - New files under `src/components/app/` or domain components:
     - `sync-conflict-dialog.tsx`
     - `sync-error-banner.tsx`
   - Show:
     - local change pending
     - replay rejected
     - server version changed

3. **Reduce broad invalidation where it blocks reconciliation**
   - Current examples to narrow over time:
     - `src/features/orders/hooks.ts`
     - `src/features/production/hooks.ts`
   - Prefer entity patching + targeted background refetch over broad “invalidate all”.

### Acceptance
- Replay failures do not silently discard user work.
- Server conflict responses are visible and actionable.
- Reconciled entities converge correctly after reconnect.

## Phase 6 — Add offline file capture and delayed upload
### Goal
Support offline file capture without relying on stale presigned URLs.

### Problem
`buildUploadUrl()` currently requests upload URLs with a 900-second expiry. Those URLs should not be replayed later.

### Tasks
1. **Store blobs locally before upload**
   - New files:
     - `src/lib/offline/blob-store.ts`
     - `src/lib/offline/upload-queue.ts`
   - Persist:
     - blob/file
     - intended usage
     - original filename
     - MIME type
     - related entity metadata

2. **On reconnect, fetch a fresh upload URL**
   - Existing target files likely involved:
     - `src/features/assets/model.ts`
     - `src/features/portal/hooks.ts`
     - relevant asset upload components under `src/components/app/`
   - Flow:
     1. reconnect
     2. request fresh signed URL
     3. upload blob
     4. submit resulting metadata to the existing server fn

3. **Keep payment proof / high-risk submission online-finalized**
   - The offline behavior should queue the blob and metadata, not claim final server acceptance until replay succeeds.

### Acceptance
- Users can capture files offline.
- Reconnect obtains fresh upload URLs before upload.
- No expired signed URL is replayed from storage.

## Phase 7 — Expand to selective production actions
### Goal
After drafts/comments are stable, add constrained offline support for production actions.

### Candidate actions
- task advancement request
- approval request comments
- requirement-response save/update

### Tasks
1. Start with **request/intent** flows before irreversible state transitions.
2. Add server-side stale-state checks before accepting replayed stage transitions.
3. Only expand approval actions once the conflict path is already proven with lower-risk commands.

### Acceptance
- Production operators can continue the constrained offline workflow without hiding server conflicts.
- Riskier state transitions remain guarded until replay semantics are proven.

## Features intentionally left online-only in the first rollout
- sign-in / sign-up / auth session refresh
- org membership and role changes
- invoice payment confirmation/rejection
- destructive admin actions
- any action that requires immediate authoritative financial state

## Files to Modify
### Core runtime
- `src/lib/query-client.ts` — add persisted client-cache bootstrap.
- `src/routes/__root.tsx` — add global offline/sync UI and, after PWA merge, keep shell wiring aligned.
- `src/routes/_org.tsx` — add offline-aware protected-route fallback.
- `src/routes/operator.tsx` — same offline-aware guard logic for operator surface.
- `src/routes/sign-in.tsx` — handle offline/no-session-hint behavior explicitly.
- `src/routes/onboarding.tsx` — keep online-only behavior clear when offline.

### Domain hooks
- `src/features/products/hooks.ts`
- `src/features/customers/hooks.ts`
- `src/features/orders/hooks.ts`
- `src/features/production/hooks.ts`
- `src/features/portal/hooks.ts`

### Server functions for replay-safe mutations
- `src/features/orders/server.ts`
- `src/features/orders/model.ts`
- `src/features/production/server.ts`
- `src/features/production/model.ts`
- `src/features/assets/model.ts`
- `src/features/portal/server.ts`

### Existing utilities to reference during implementation
- `src/lib/query-keys.ts`
- `src/lib/mutation-invalidation.ts`
- `src/lib/auth-session.ts`
- `src/lib/r2.ts`

## New Files
### Offline core
- `src/lib/offline/db.ts`
- `src/lib/offline/schema.ts`
- `src/lib/offline/types.ts`
- `src/lib/offline/index.ts`
- `src/lib/offline/network.ts`
- `src/lib/offline/query-persister.ts`
- `src/lib/offline/session-hint.ts`
- `src/lib/offline/outbox.ts`
- `src/lib/offline/outbox-types.ts`
- `src/lib/offline/sync-runner.ts`
- `src/lib/offline/replay.ts`
- `src/lib/offline/blob-store.ts`
- `src/lib/offline/upload-queue.ts`
- `src/lib/offline/use-network-state.ts`
- `src/lib/offline/use-sync-state.ts`

### Offline repositories
- `src/lib/offline/repositories/products-repo.ts`
- `src/lib/offline/repositories/customers-repo.ts`
- `src/lib/offline/repositories/orders-repo.ts`
- `src/lib/offline/repositories/production-repo.ts`

### UI
- `src/components/app/offline-status-banner.tsx`
- `src/components/app/sync-status-pill.tsx`
- `src/components/app/sync-conflict-dialog.tsx`
- `src/components/app/sync-error-banner.tsx`

### Tests
- `src/lib/offline/*.test.ts`
- feature-level hook/model tests for each phase touched above

## Dependencies
1. Phase 0 must land before any app-shell offline behavior.
2. Phase 1 must land before routing, read-model, or outbox work.
3. Phase 2 depends on Phase 1 because offline routing needs local hint/state primitives.
4. Phase 3 depends on Phases 1-2 because offline reads need both persistence and route access.
5. Phase 4 depends on Phase 3 because queued writes need local projections to update first.
6. Phase 5 depends on Phase 4 because conflict handling only matters once replay exists.
7. Phase 6 depends on Phase 4 because uploads are another outbox specialization.
8. Phase 7 depends on Phases 4-5 because production transitions need proven replay and conflict paths.

## Verification Strategy
Each phase should ship with its own proof:

### Phase 0
- production build
- browser PWA installability smoke test

### Phase 1
- unit tests for Dexie schema/init and query persistence bootstrap
- browser reload test proving cached query state survives reload

### Phase 2
- route-guard tests for:
  - online authenticated
  - online unauthenticated
  - offline with last-known session hint
  - offline without last-known session hint

### Phase 3
- hook/model tests showing read models persist after successful fetch
- browser test proving previously visited pages remain readable offline

### Phase 4
- unit tests for outbox enqueue/dequeue/retry rules
- integration tests for replay-safe order draft updates and task comments
- browser test proving offline create/edit shows pending sync and later converges online

### Phase 5
- integration tests for stale-write rejection and conflict surfacing

### Phase 6
- browser test proving offline file capture stores blob locally, reconnect fetches fresh signed URL, and upload finalizes successfully

### Global phase gate
For any phase that lands code, run the narrowest relevant proof plus the repo verification pipeline that is practical at that point:
- `bun run check`
- `bun run typecheck`
- `bun run test`
- `bun run build` when routing, service worker, auth/session, or server behavior changes

## Risks
1. **Auth/routing risk** — current `beforeLoad` auth checks are hard online dependencies; route fallback must not fake a validated session.
2. **Replay risk** — without idempotency keys, reconnect can duplicate writes.
3. **Conflict risk** — production stage transitions are more sensitive than comments or drafts; do not start there.
4. **Upload risk** — presigned URLs expire; never persist them as replay artifacts.
5. **Scope risk** — if every domain is made offline at once, conflict rules and test complexity will explode.
6. **UX risk** — “offline”, “stale”, “pending sync”, and “conflict” must be distinct states, not one generic warning.

## Recommended rollout order
1. Merge the PWA shell baseline.
2. Ship offline foundation + route fallback.
3. Ship offline reads for products/customers/orders/production.
4. Ship outbox for draft orders and task comments.
5. Ship conflict UI + replay hardening.
6. Ship blob queue + fresh-presign upload flow.
7. Expand selectively into production task actions.

## Open questions to resolve before coding
1. Which protected routes should be available offline on day one: all cached admin routes, or only a subset such as orders + production?
2. For draft orders, do we want field-level merge or “server wins, user retries” on conflict for v1?
3. Should operator-only offline support ship before admin offline drafting, or after?
4. Do payment-proof uploads need offline blob capture in v1, or can uploads stay online-only while the rest of portal data becomes readable offline?
5. Should query hooks read directly from Dexie via domain hooks, or should Dexie only seed TanStack Query initial data in the first pass?
