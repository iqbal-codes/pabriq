Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

> ⚠️ **CRITICAL SAFETY RULE:** Always run tests with `bun run test`, NEVER run `vitest` directly. Running vitest directly may use the wrong database and destroy production data. See Section 8 for details.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make them pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## 5. Agent Skills

> 🚫 **NON-NEGOTIABLE:** Before touching ANY task, load the relevant skill(s) via `read` with `skill://<name>` URIs. Do this every time, without exception — even if you "already know" the pattern. Skills encode the current codebase conventions; your training data does not.

### Skill registry

Project-local skills stored under `.agents/skills/` and available at runtime via `skill://` URIs:
- `pabriq-app-ui` — Compose React UI pages, forms, data tables, URL overlays, and responsive layouts.
- `pabriq-business-workflows` — Orchestrate order, invoice, payment, production, and portal state-machine workflows.
- `pabriq-data-features` — Build schema, model, server-function, query, mutation, migration, and tenant-scoped data features.
- `pabriq-integrations` — Integrate R2 assets, PDFs, Mastra, Midtrans, PWA instrumentation, shipping, and monitoring.
- `pabriq-operations` — Operate builds, containers, health probes, production startup, owner bootstrap, CI, and observability.
- `pabriq-routing-auth` — Create TanStack Start routes, auth guards, role gates, portal-token endpoints, and API handlers.
- `pabriq-test-safety` — Choose, write, and safely run unit, integration, component, route, and E2E tests.



## 6. Code Best Practices

### TypeScript

- MUST NOT use `any` in authored source (exceptions: routeTree.gen.ts, Drizzle `as SQL`, route context casts, catch `err: unknown` narrowed to Error)
- MUST NOT use non-null assertions (`!`)
- MUST use `verbatimModuleSyntax`-compliant imports: `import type` for type-only bindings
- MUST use `#/` prefix for all internal imports
- MUST prefer explicit return type annotations on exported functions
- MUST use `as const` for fixed tuples/lists and literal types
- Use discriminated unions for state machines and API response types
- Use utility types (`Partial`, `Pick`, `Omit`, `Record`) over creating types from scratch

### DRY (Don't Repeat Yourself)

- 3+ identical code blocks → extract into a shared function/module
- 2+ identical UI patterns → extract into a reusable component

### KISS (Keep It Simple)

- Prefer the simplest solution that works. No speculative abstractions.
- Flat structures over nested ones. Simple conditionals over clever one-liners.
- Short functions preferred (< 20 lines). One function = one concern.

### YAGNI (You Ain't Gonna Need It)

- No code for hypothetical future requirements
- No flexibility/configurability hooks until a concrete use case exists

### Error Handling

- Validate input at every server boundary (`.inputValidator()` with Zod for mutations)
- Use discriminated union return types: `{ ok: true, data: T } | { ok: false, error: string }`
- Don't swallow errors — surface them with meaningful messages
- TypeScript ≠ runtime safety — validate external inputs at system boundaries
- Catch at the right level, not globally

### Naming & Structure

- Booleans: prefix with `is*`, `has*`, `can*` (e.g. `isActive`, `canManageProducts`)
- Functions: verb phrases (`getOrder`, `createCustomer`, `formatPhone`), not nouns
- Components: PascalCase filenames, one component per file, default export
- Types: PascalCase for interfaces/types, camelCase for variables/functions/props

### Boy Scout Rule

- Leave code cleaner than you found it — rename confusing vars, extract long functions, remove dead imports on files you touched
- Continuous small refactoring compounds into a healthier codebase over time
- Readability over conciseness — code is read far more often than it's written

## 7. Database & Environment Safety

> ⚠️ **THIS IS THE MOST IMPORTANT SECTION. VIOLATIONS WILL DESTROY PRODUCTION DATA.**

- **NEVER** access Infisical or any secrets manager directly. Agents do not have permission to retrieve, inject, or override environment variables from Infisical or similar services.
- **NEVER** run test runners (`vitest`, `jest`, `playwright`, etc.) directly (e.g. `npx vitest run`). Always use the project scripts: `bun run test`, `bun run test:e2e`, etc. These scripts load the correct environment (staging/test) via `load-env-test` and prevent tests from hitting production databases.
- **NEVER** source `.env.local` or `.env` manually to run commands. Use `bun run load-env -- <command>` for dev, `bun run load-env-test -- <command>` for tests.
- Tests that touch the database (`TRUNCATE`, `INSERT`, `DELETE`) are **destructive**. If the wrong environment is loaded, they will destroy production data. Always verify which `DATABASE_URL` a test command will use before executing.

### Why this matters

The test files contain `TRUNCATE ... CASCADE` statements that clear database tables. If an agent runs `vitest` directly instead of `bun run test`, the tests may connect to the wrong database (production instead of staging) and destroy real data.

### Safe test execution

```bash
# ✅ CORRECT - uses load-env-test which loads staging environment
bun run test

# ✅ CORRECT - run only the test file you changed (preferred for most tasks)
bun run test -- src/features/products/model.test.ts

# ❌ WRONG - may use wrong database, will now fail with safety error
vitest run
npx vitest run
```

### Targeted testing over full suite

**Always run only the test files relevant to your changes.** The full test suite (`bun run test` with no arguments) is slow because integration tests hit a real database. Running the full suite when you only changed one feature file wastes time and increases the chance of hitting unrelated flaky tests.

- Changed a model file? → `bun run test -- src/features/<name>/model.test.ts`
- Changed a component? → `bun run test -- src/components/<name>.test.tsx`
- Changed a utility? → `bun run test -- src/lib/<name>.test.ts`
- Touched routes or server functions? → Run `bun run build` first, then targeted tests for affected features.
- Final handoff or pre-commit? → Run the full suite `bun run test` to catch regressions across features.

## 8. Non-Negotiable Project Rules (Legacy)

- Use Bun only: `bun install`, `bun run dev`, `bun run build`, `bun run check`, `bun run typecheck`.
- `bun.lock` is authoritative. Do not add npm, pnpm, or yarn lockfiles.
- Run `bun run check` and `bun run typecheck` before committing or final handoff.
- Run `bun run build` when changes touch routing, server functions, auth, database, or deployment behavior.
- Do not guess library APIs. If unsure, check official docs, Context7, or existing project patterns first.
- Do not use raw internal `fetch`; use `createServerFn`.
- Do not use raw `useSearchParams`; use nuqs.
- Do not hardcode user-facing text; use `use-intl` and update message files.
