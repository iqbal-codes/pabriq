---
name: pabriq-app-ui
description: "Compose React UI pages, forms, data tables, URL overlays, and responsive layouts for Pabriq. Use when building new pages, adding forms with validation, creating list views with data tables, wiring global modals/sheets via URL state, or adapting components for mobile."
---

# Pabriq App UI

## Scope

Use this skill for page composition, forms, data tables, URL-driven overlays, localization, responsive rendering, accessibility, and loading/error/empty states. Keep domain transitions, server functions, persistence, and external integrations in their owning skills.

## How to

1. Classify the change as a page, form, list, overlay, or responsive-state change.
2. Read the closest existing implementation before choosing primitives. Start with `src/features/customers/pages/customers-list-page.tsx` and trace the app-layer components it uses.
3. Keep page structure in `src/components/app/page-shell/`, form behavior in `src/components/app/form/`, table behavior in `src/components/app/data-table/`, and overlay registration in `src/components/app/global-modal/` with `src/hooks/use-global-overlay.ts`.
4. Preserve translation, mobile, accessibility, and observable-state behavior by following source rather than copying this skill.

## Source pointers

- Page shell: `src/components/app/page-shell/page-header.tsx`, `page-content.tsx`, and `empty-state.tsx`.
- Forms: `src/components/app/form/form-context.tsx`, `form-layout.tsx`, `form-sheet.tsx`, and `form-error.tsx`.
- Data tables: `src/components/app/data-table/data-table.tsx`, `use-list-page-state.ts`, and `data-table-mobile-view.tsx`.
- URL overlays: `src/hooks/use-global-overlay.ts`, `src/components/app/global-modal/global-modal-registry-map.tsx`, and `global-modal-container.tsx`.

## Guardrails

- Compose app-layer primitives instead of building pages from raw base primitives.
- Route user-facing text through the existing localization system.
- Keep global modal and sheet state in URL search state.
- Implement loading, error, empty, and data states for every list or form flow, including its mobile representation.
- Keep detailed implementation knowledge in source files; this skill contains navigation only.

## Verification

Run the narrowest relevant project command, such as `bun run test -- src/components/app/form/form.test.tsx` or `bun run test -- src/components/app/data-table/data-table.test.tsx`.

<!-- CODEBASE-SKILL-FORGE:HUMAN:START -->
<!-- Add intentional project policy here. Sync preserves this region byte-for-byte. -->
<!-- CODEBASE-SKILL-FORGE:HUMAN:END -->
