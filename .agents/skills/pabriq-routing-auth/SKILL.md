---
name: pabriq-routing-auth
description: >
  Route creation, auth guards, role gating, portal tokens, and raw API endpoints in TanStack Start file-based routing.
  Use when adding a page under /_org/, /operator/, or /api/, gating a route by role with can* predicates,
  creating a token-gated portal endpoint, wiring a createServerFn with auth, or modifying session resolution
  and subdomain rewrites.
---

# Pabriq Routing & Auth

## Scope

Use this skill for TanStack Start routes, layout guards, role gates, server functions, raw API handlers, portal-token endpoints, session resolution, and subdomain rewrites.

## How to

1. Classify the route as public, organization-guarded, operator, role-gated, raw API, server function, or portal-token.
2. Read the closest existing route and its owning auth resolver before editing. Layouts own shared guards; child routes consume layout context.
3. Keep page metadata and search validation consistent with nearby routes, then trace generated route references and callers.
4. For API or portal changes, preserve the existing response, tenant-resolution, token, and rewrite boundary instead of adding a parallel path.

## Source pointers

- Session and organization resolution: `src/lib/auth-session.ts` and `src/lib/auth-session-server.ts`.
- Role predicates and access control: `src/features/permissions/model.ts` and `src/lib/auth.ts`.
- Layout guards: `src/routes/_org.tsx` and `src/routes/operator.tsx`.
- Route examples: `src/routes/sign-in.tsx`, `src/routes/_org/orders/index.tsx`, `src/routes/_org/settings/production-stages.tsx`, and `src/routes/order.$token.tsx`.
- API examples: `src/routes/api/healthz.ts`, `src/routes/api/documents/`, and `src/routes/api/midtrans-notification.ts`.
- Domain rewrites and portal URLs: `src/lib/domain-routing.ts` and `src/router.tsx`.
- Root metadata: `src/routes/__root.tsx`.

## Guardrails

- Keep shared authentication at the owning layout; do not duplicate it in child routes.
- Reuse named permission predicates instead of inline role comparisons.
- Return explicit responses for expected raw-API outcomes.
- Keep portal-token access separate from session-authenticated access.
- Keep route implementation knowledge in source files; this skill contains navigation only.

## Verification

Run `bun run typecheck` and the focused route or domain-routing test through `bun run test -- <path>`.

<!-- CODEBASE-SKILL-FORGE:HUMAN:START -->
<!-- Add intentional project policy here. Sync preserves this region byte-for-byte. -->
<!-- CODEBASE-SKILL-FORGE:HUMAN:END -->
