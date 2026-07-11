---
name: pabriq-integrations
description: Integrate R2 asset transfer, PDF generation routes and templates, Mastra assistant tools and request context, Midtrans payment gateway protocol, and PWA service-worker instrumentation. Use when changing presigned upload or download adapters, modifying PDF template composition or document routes, adding or altering Mastra tool context and authorization, working on Midtrans webhook signature verification or Snap SDK token creation or Core API reconciliation, or touching Serwist precache registration and build-plugin manifest injection.
---

# External Integrations

Scope covers seven external-boundary concerns: R2 asset transfer, PDF generation, Mastra AI assistant, Midtrans payment gateway, Serwist PWA, Biteship shipping, and Sentry monitoring. Ownership lives in `src/features/`, `src/mastra/`, `src/routes/api/`, and `src/lib/` — never in a top-level `integrations/` directory. Each branch below owns its contract; do not mix authorization logic across boundaries.

## R2 Asset Transfer

Upload pipeline: client `UploaderAdapter.uploadFile()` → `getUploadUrl` server function → `uploadToSignedUrl` PUT to presigned URL → `finalizeUpload` server function. Download pipeline: `getAssetSignedUrl` server function → signed URL with TTL.

### Recipe — Adding or Changing Upload Adapters

1. Define or modify the adapter implementing `UploaderAdapter` interface (`src/components/app/asset-upload/types.ts`).
2. Auth boundary: authenticated adapters call `getUploadUrl` (session via `resolveOrgId`); portal adapters call `createPortalR2UploaderAdapter` (token via `getOrgIdFromToken`).
3. Upstream queue: `useUploadMachine` manages concurrency (`MAX_CONCURRENT=3`), retry, 5-second undo timeout — never bypass the queue with direct fetch.
4. Key construction in `src/lib/r2.ts`: `org/{orgId}/{ownerType}/{ownerIdOrDraft}/{assetId}/{variant}.{ext}`.
5. Downstream finalization: `finalizeUpload` writes asset metadata to DB; callers must not write R2 keys independently.

**Completion criterion**: adapter passes upload round-trip through `useUploadMachine`, DB row exists after finalization, signed URLs resolve within `SIGNED_URL_TTL_SECONDS` bounds (preview=15m, original=5m).

### Recipe — Adding Asset Consumers (Image/File Display)

1. `AssetImage` queries preview + original signed URLs via TanStack Query; fallback is Package icon on query error.
2. `AssetFileList`/`AssetFileGrid` fetch metadata + signed download URLs, render inline download links.
3. Both consume `getAssetSignedUrl` — never construct R2 URLs manually.

**Completion criterion**: component renders asset with valid signed URL or shows documented fallback; no manual key construction exists outside `src/lib/r2.ts`.

### Ownership and Limits

- `USAGE_LIMITS` in `src/features/assets/model.ts` enforces per-usage maxActive/maxBytes/kinds at both model and server-function layers.
- `deleteAsset` sets DB status='deleted' but does not remove the R2 blob — this is observed current behavior.

## PDF Generation

Server-side `@react-pdf/renderer` render → Buffer → HTTP Response. Templates share styles and components from `pdf-template-shared.tsx`.

### Recipe — Adding or Modifying a Document Type

1. Create a template in `src/features/documents/templates/` implementing a `@react-pdf/renderer` `Document` component.
2. Shared primitives: `createPdfStyles`, `PdfMetaRow`, `PdfAddressBlock`, `PdfPricingLine`, `registerPdfFonts` from `pdf-template-shared.tsx` — reuse, never redefine.
3. Register a GET route in `src/routes/api/documents/` that calls `resolveOrgForDocument` (session auth) or token-based lookup (portal auth) before invoking `generateInvoicePdf`/`generateQuotationPdf`.
4. Org resolution: `resolveOrgForDocument` → session → member table → orgId. Portal routes: token lookup via invoice/order token → orgId. Logo fetched via `getAssetSignedUrl` (cross-concern dependency on R2).
5. Currency/date formatting: `src/features/documents/pdf-format.ts` with static `id-ID` locale from `src/features/documents/pdf-locale.ts` — do not introduce `use-intl` here.

**Completion criterion**: route returns `application/pdf` with correct content; template compiles with `@react-pdf/renderer`; org-scoping verified for both session and portal auth paths.

### Auth Boundary

Three route patterns, two auth mechanisms:
- `GET /api/documents/invoices/$id/pdf` — session auth
- `GET /api/documents/invoices/portal/$invoiceId/$token` — portal token auth
- `GET /api/documents/orders/$id/quotation` — session auth

Logo fetch failure is silenced in `buildOrgPdfInfo` — this is observed, not recommended. Adding a new document type must replicate the auth-route pattern, not invent a new mechanism.

## Mastra Assistant

Mastra `Agent` with `RequestContext`-injected auth, three tools, and `PostgresStore` memory (schema 'mastra' on shared `DATABASE_URL`).

### Recipe — Adding or Changing a Tool

1. Tool lives in `src/mastra/tools/business-tools.ts`. Each tool receives `AssistantToolContext` via `RequestContext` — never trust client-supplied org/user IDs.
2. Auth injection: `resolveAssistantAuthContext()` in `src/features/assistant/server.ts` extracts session → member table → orgId + role. Passed as `RequestContext` to `agent.generate()`.
3. Domain access control: `getAssistantAllowedDomains(role)` — owner/admin see all five domains (customers, products, orders, invoices, board tasks); member sees production only.
4. Tool must read `context.requestContext.get('orgId'|'userId'|'role')` and delegate to domain logic in `src/features/assistant/model.ts`.

**Completion criterion**: tool executes only within `RequestContext` org scope; role restriction enforced; no org/user ID accepted from tool input parameters.

### Recipe — Order Draft Proposals

1. `resolveOrderDraftTool` returns a structured proposal; `proposeOrderDraftFn` persists it with max 16-minute TTL.
2. `consumeOrderDraftProposalFn` uses a DB `FOR UPDATE` row lock and calls `createDraftOrderFromAction` in a transaction.
3. Client: `OrderDraftProposalCard` renders countdown, consume/cancel buttons, and navigation on confirm.
4. Proposal expiry with clock drift tolerance is built-in — do not add parallel expiry mechanisms.

**Completion criterion**: proposal lifecycle (propose → consume/cancel → expiry) verified; `FOR UPDATE` lock prevents concurrent consumption; TTL enforced.

### Configuration

- `MASTRA_MODEL`: format `openrouter/{provider}/{model}`
- `OPENROUTER_API_KEY`: for LLM calls
- Agent memory: `PostgresStore` with `lastMessages: 10`

## Midtrans Payment Gateway

Three-path architecture: Snap token creation (client redirect) → webhook callback (push) → Core API reconciliation (pull). All three must stay synchronized in behavior.

### Recipe — Snap Token Creation (Client Redirect)

1. `createSnapTokenFn` server function → `createMidtransTransaction` in `src/features/invoices/model.ts`.
2. SDK: `midtrans-client` Snap, reads credentials from `getMidtransCredentials` (org-level `organization_profiles`).
3. Returns `{ token, redirectUrl, clientKey, isProduction }` to client for Snap popup embedding.
4. Enabled payments: `['qris', 'bca_va', 'bni_va', 'bri_va']`.

**Completion criterion**: Snap token resolves; client popup renders; per-org credentials verified via `organization_profiles`.

### Recipe — Webhook Handler

1. Route: `POST /api/midtrans-notification` in `src/routes/api/midtrans-notification.ts`.
2. Signature verification: `SHA512(order_id + status_code + gross_amount + serverKey)` — returns 403 on mismatch.
3. Per-org server key lookup from `organization_profiles.midtrans_server_key`.
4. Success conditions: `'settlement'` OR (`'capture'` + `fraud='accept'`).
5. Idempotency: checks `payments WHERE invoiceId + reference=orderId + status=confirmed`.
6. `confirmedBy` field distinguishes source: `'midtrans-webhook'`.

**Completion criterion**: 403 returned for bad signature; 404 for unknown order; idempotent on duplicate webhook; success path creates confirmed payment.

### Recipe — Reconciliation (Core API Pull)

1. `reconcilePortalPaymentFn` (token auth) or `reconcileInvoicePaymentFn` (session auth) → `reconcilePayment`.
2. `getMidtransTransactionStatus` calls CoreApi `transaction.status(orderId)`.
3. Amount mismatch protection: compares response amount against invoice total.
4. Idempotency: same check as webhook path.
5. `confirmedBy`: `'midtrans-reconcile'`.

**Completion criterion**: amount mismatch caught and rejected; idempotent; `confirmedBy` correctly distinguishes reconciliation from webhook.

### Security Notes

- SHA-512 signature verification is the sole webhook authentication — no IP allowlist observed.
- Per-org credentials enforce tenant isolation: org A's server key cannot verify org B's transactions.
- Test coverage in `src/routes/api/-midtrans-notification.test.ts` covers 403, 404, valid, and idempotency cases.

## PWA Runtime (Serwist)

Build: Vite → `tanstackSerwistPlugin` → `@serwist/build` injectManifest → `dist/client/sw.js`. Registration: `__root.tsx` useEffect (production only).

### Recipe — Modifying Precache Patterns or Registration

1. `src/sw.ts`: Serwist instance with `precacheEntries` from injected `__SW_MANIFEST`, `skipWaiting`, `clientsClaim`.
2. `src/tanstack-serwist-plugin.ts`: Vite Plugin that builds `sw.ts` on `closeBundle`, injects manifest via `@serwist/build` with `globPatterns: js/css/html/png/svg/ico/json/woff`.
3. `src/routes/__root.tsx`: `new Serwist('/sw.js').register()` inside `useEffect` gated on `isProduction`.
4. PWA manifest: `public/manifest.json` — app name, standalone display, theme color.

**Completion criterion**: service worker registers only in production; precache manifest matches `globPatterns`; `skipWaiting`/`clientsClaim` behavior verified; no dev-mode SW registration.

### Configuration

- Packages: `serwist` + `@serwist/build` + `@serwist/window` (all v9.5.11)
- `navigationPreload: false`
- Client polyfills for `node:stream`, `node:stream/web`, `node:async_hooks` in `src/lib/node-polyfills-stub.ts` — required for client bundle compatibility.

## Biteship Address Model (Source-Only)

Thin evidence — two inline REST endpoints, no SDK, no shared abstraction. Source: `src/features/address/model.ts`.

- `searchAreas`: `GET /v1/maps/areas?countries=ID&input={query}` — returns `[]` on missing API key (silent failure, observed).
- `calculateShippingRates`: `POST /v1/rates/couriers` — handles multiple Biteship response body formats, logs via pino on error.
- Env: `BITESHIP_API_KEY`. No retry, timeout, or circuit breaker.

Do not build recipes around Biteship — the integration is a thin fetch wrapper.

## Sentry Instrumentation (Source-Only)

Thin evidence — `instrument.server.mjs` bootstrapped via `NODE_OPTIONS='--import'`, `@sentry/tanstackstart-react` in dependencies. No runtime capture calls in `src/`.

- `instrument.server.mjs`: Sentry init, shared singleton with `serverLoggerMiddleware`'s `captureException`.
- `instrument.server.mjs` sets `tracesSampleRate: 1.0` in production — no env guard on rates.
- Env: `SENTRY_DSN`, `VITE_SENTRY_DSN`, `SENTRY_ENVIRONMENT`.

If modifying Sentry configuration, read `instrument.server.mjs` and `src/lib/logger.ts` directly. Do not duplicate logger setup.

<!-- CODEBASE-SKILL-FORGE:HUMAN:START -->
<!-- Add intentional project policy here. Sync preserves this region byte-for-byte. -->
<!-- CODEBASE-SKILL-FORGE:HUMAN:END -->
