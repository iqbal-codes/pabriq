---
name: pabriq-integrations
description: Integrate R2 asset transfer, PDF generation routes and templates, Mastra assistant tools and request context, Midtrans payment gateway protocol, and PWA service-worker instrumentation. Use when changing presigned upload or download adapters, modifying PDF template composition or document routes, adding or altering Mastra tool context and authorization, working on Midtrans webhook signature verification or Snap SDK token creation or Core API reconciliation, or touching Serwist precache registration and build-plugin manifest injection.
---

# Pabriq Integrations

## Scope

Use this skill for external-service boundaries in assets, documents, assistant tools, payments, shipping, PWA runtime, and monitoring. Read the owning implementation first; provider behavior and authorization stay in source.

## How to

1. Identify the provider boundary and its server/client owner.
2. Read the nearest existing implementation and focused test before changing the protocol, adapter, or registration path.
3. Reuse the shared adapter, renderer, request context, auth resolver, signing path, or build plugin already used by that branch.
4. Trace callers and preserve tenant isolation, provider validation, idempotency, and production-only behavior established by source.

## Source pointers

- R2 assets: `src/lib/r2.ts`, `src/features/assets/model.ts`, `src/features/assets/server.ts`, and `src/features/assets/upload-machine.ts`.
- PDFs: `src/features/documents/server.tsx`, `src/features/documents/templates/`, and `src/routes/api/documents/`.
- Mastra: `src/mastra/index.ts`, `src/mastra/agents/business-assistant-agent.ts`, `src/mastra/tools/business-tools.ts`, and `src/features/assistant/server.ts`.
- Midtrans: `src/features/invoices/model.ts`, `src/features/invoices/server.ts`, `src/routes/api/midtrans-notification.ts`, and `src/routes/api/midtrans-reconciliation.ts`.
- PWA: `src/sw.ts`, `src/tanstack-serwist-plugin.ts`, `src/routes/__root.tsx`, and `src/lib/node-polyfills-stub.ts`.
- Shipping and monitoring: `src/features/address/model.ts`, `instrument.server.mjs`, `src/lib/logger.ts`, and `src/lib/server-logger-middleware.ts`.

## Guardrails

- Do not construct asset URLs or storage keys outside the shared R2 module.
- Do not accept unverified tenant or user identity from assistant tool input.
- Keep document and payment authorization at the route/provider boundary used by the nearest implementation.
- Keep webhook verification, reconciliation, and duplicate protection aligned with the invoice source.
- Keep service-worker registration production-gated and monitoring initialization centralized.

## Verification

Run only affected project checks, such as `bun run test -- src/routes/api/-midtrans-notification.test.ts`, `bun run test -- src/routes/api/-midtrans-reconciliation.test.ts`, or `bun run build` for bundling and PWA changes.

<!-- CODEBASE-SKILL-FORGE:HUMAN:START -->
<!-- Add intentional project policy here. Sync preserves this region byte-for-byte. -->
<!-- CODEBASE-SKILL-FORGE:HUMAN:END -->
