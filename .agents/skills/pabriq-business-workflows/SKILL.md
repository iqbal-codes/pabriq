---
name: pabriq-business-workflows
description: >-
  Orchestrate order-to-delivery workflows across four state machines —
  order lifecycle and pricing, invoice and payment, production task
  boards, and portal customer access.
  Use when working with order status transitions and pricing calculations,
  invoice creation or payment confirmation and balance reconciliation,
  production task advancement through stages or board transitions,
  or portal order confirmation and timeline views.
---

# Pabriq Business Workflows

## Scope

Use this skill for order/pricing, invoice/payment, production/task, and portal workflows. The implementation in `src/features/` is the source of truth; this skill only routes an agent to it and names invariants to preserve.

## How to

1. Identify the aggregate, transition, and server entry point being changed.
2. Read the closest model and server implementation, then trace its callers, consumers, and focused tests before editing.
3. Preserve server-resolved organization scope, source-status guards, business preconditions, transaction boundaries, idempotency, and activity logging wherever the existing path uses them.
4. For cross-domain changes, update the write-side owner and verify every read-side consumer of that contract.

## Source pointers

- Orders and pricing: `src/features/orders/model.ts`, `src/features/orders/server.ts`, and `src/features/pricing/engine.ts`.
- Invoices and payments: `src/features/invoices/model.ts`, `src/features/invoices/server.ts`, and `src/routes/api/midtrans-notification.ts`.
- Production and tasks: `src/features/production/model.ts`, `spawner.ts`, `task-spawn-helpers.ts`, and `server.ts`.
- Portal and timelines: `src/features/portal/model.ts`, `src/features/portal/server.ts`, and `src/routes/order.$token.tsx`.
- Permissions: `src/features/permissions/model.ts`.
- Cross-domain examples: `approveOrder`, `startProductionForOrder`, `adjustOrderQuantity`, `confirmPayment`, and `confirmPortalOrder` in the source files above.
- Focused behavior tests: `src/features/orders/model.test.ts`, `src/features/invoices/model.test.ts`, `src/features/production/model.test.ts`, `src/features/portal/model.test.ts`, and `src/features/pricing/engine.test.ts`.

## Guardrails

- Do not bypass organization scoping or role predicates.
- Do not mutate a workflow without checking its current status and business preconditions.
- Keep coupled writes atomic and side effects idempotent when the existing implementation requires it.
- Keep activity events and timeline consumers consistent with successful transitions.
- Do not copy state machines, error lists, or recipes into this skill; read the source.

## Verification

Run the narrowest affected workflow test through `bun run test -- <path>` and include all affected aggregate tests when a cross-domain contract changes.

<!-- CODEBASE-SKILL-FORGE:HUMAN:START -->
<!-- Add intentional project policy here. Sync preserves this region byte-for-byte. -->
<!-- CODEBASE-SKILL-FORGE:HUMAN:END -->
