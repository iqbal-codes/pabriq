---
name: pabriq-test-safety
description: Testing and test safety for pabriq-app-v2 — adding or modifying unit, database integration, React component, route-navigation, or E2E tests; choosing which test type covers a change; running targeted test subsets; ensuring staging database safety through project scripts only. Use whenever writing tests, changing test infrastructure, or debugging test failures in this repository.
---

# Pabriq Test Safety

## Scope

Use this skill when choosing, adding, or debugging unit, database integration, React component, route-navigation, or E2E tests.

## How to

1. Choose the narrowest test tier that proves the observable contract: pure logic, database round-trip, rendered interaction, route effect, or full browser flow.
2. Read the nearest representative test and its setup before writing a new one. Keep tests co-located in `src/` or in `e2e/` according to the existing naming convention.
3. Keep database fixtures deterministic and file-local. Use real database behavior for database tests and mock only external boundaries or module seams used by the nearest test.
4. Assert caller-visible results, rendered output, navigation, responses, or durable side effects rather than implementation details.
5. Run the targeted project script and inspect failures before widening scope.

## Source pointers

- Test setup: `vitest.config.ts`, `src/test/setup.ts`, `playwright.config.ts`, and `e2e/global-setup.ts`.
- Unit example: `src/features/pricing/engine.test.ts`.
- Database example: `src/features/orders/model.test.ts`.
- Component example: `src/components/app-sidebar.test.tsx`.
- Route example: `src/routes/-route-guards.test.tsx`.
- E2E example and helpers: `e2e/auth.spec.ts` and `e2e/helpers/auth.ts`.

## Safety guardrails

- Run tests only through `bun run test -- <path>` or `bun run test:e2e -- <path>`; never invoke the underlying runners directly.
- Keep destructive database resets inside file-local integration-test setup and never in E2E tests.
- Do not run schema mutations during test execution.
- Keep fixtures isolated between test files.

## Verification

The targeted project test command must pass for the changed contract; run `bun run typecheck` when test code changes types or route wiring.

<!-- CODEBASE-SKILL-FORGE:HUMAN:START -->
<!-- Add intentional project policy here. Sync preserves this region byte-for-byte. -->
<!-- CODEBASE-SKILL-FORGE:HUMAN:END -->
