# 00 - Pabriq Specs Overview And Implementation Order

## Purpose

This active spec set replaces the generic BaseStack specs for the Pabriq product slice described in `docs/PRD.md` and GitHub issue #1.

The old generic SaaS specs are preserved under `docs/specs/later/` for future reference. Do not implement those files for the current Pabriq slice unless a later product decision explicitly brings them back into scope.

## Active Spec Order

Reusable application components come first because feature slices depend on consistent forms, tables, responsive cards, empty states, and translated UI chrome.

| Order | Spec | GitHub alignment |
| --- | --- | --- |
| 01 | Application page shell components | Prerequisite for workspace page chrome and responsive header behavior |
| 01b | UI components | Prerequisite for all feature slices |
| 02 | Application form components | Prerequisite for onboarding, products, customers, orders, token forms, invoices, settings |
| 03 | Application data table components | Prerequisite for customers, products, orders, production, invoices, members, activity |
| 04 | Auth onboarding workspace | #2 |
| 05 | Tenant isolation, schema, RBAC foundation | #2, #3-#13 foundation, #12 |
| 06 | Customer registry | #3 |
| 07 | Product catalog and pricing | #4 |
| 08 | Draft order management | #5 |
| 09 | Customer token approval portal | #6 |
| 10 | Order lifecycle approvals | #7 |
| 11 | Production floor management and kanban board | #8, #9 |
| 13 | Invoices and manual payments | #10 |
| 14 | Dashboard, members, settings, activity | #11, #12, #13 |
| 15 | Testing strategy | Cross-cutting acceptance for #2-#13 |
| 16 | Reusable asset upload components and R2 pipeline | Cross-cutting reusable upload foundation |

## Dependency Rules

- Build specs `01`, `01b`, `02`, and `03` before feature implementation.
- Build specs `04` and `05` before org-scoped domain feature slices.
- Build customer and product foundations before draft orders.
- Build draft orders before customer token review.
- Build customer token review before pending order approval flows.
- Build order lifecycle before workflow task spawning and production kanban.
- Build invoices after approved orders exist.
- Build dashboard, member management, settings, and activity after the underlying events and resources exist.

## Current Needs-Triage Issue Alignment

The open `needs-triage` issues #2 through #13 already match the PRD slice sequence. The docs should align with those issues instead of creating a competing implementation order.

These issues still need maintainer triage labels beyond `needs-triage` before AFK implementation, but the spec content should treat them as the current source of planned slices.

## Out Of Scope For Current Slice

- Stripe, card payments, webhooks, refunds, and automatic reconciliation.
- Redis queues and background workers.
- Video transcoding, resumable uploads, and advanced media processing pipelines.
- External REST API, API keys, OpenAPI, and third-party webhook dispatch.
- Generic ERP modules such as inventory, procurement, payroll, advanced CRM, shipping carrier integration, or machine scheduling.
- Drag-and-drop kanban interactions.
- Multi-organization switching for a single user.
- Production-grade subdomain routing when apex workspace routing is sufficient locally.
