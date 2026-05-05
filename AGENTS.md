Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

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
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
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

## 5. Project Context

- Runtime: TanStack Start + React 19 + Vite + file-based TanStack Router.
- Package manager: Bun only.
- Tooling: Biome via `bun run check`, TypeScript via `bun run typecheck`.
- UI: Tailwind CSS v4 + shadcn/ui + lucide.
- Forms: TanStack Form.
- URL state: nuqs.
- Server boundary: TanStack Start `createServerFn`.
- Database: Neon Postgres + Drizzle.
- Auth: Better Auth + Drizzle adapter.
- Monitoring: Sentry optional locally, required in production when configured.

## 6. Agent skills

### Loading topic knowledge

Use the `skill` tool to load domain-specific knowledge on-demand. Each skill combines non-negotiables (rules) with reference (patterns/code):

| Skill                | When to load                                                   |
| -------------------- | -------------------------------------------------------------- |
| `ui-system`          | Building or modifying UI, forms, data tables, sidebar, styling |
| `server-logic`       | Writing server functions, feature modules, routes              |
| `data-layer`         | Writing DB queries, search/filter endpoints, migrations        |
| `auth`               | Sign-in/sign-up flows, session checks, permission guards       |
| `i18n`               | Adding translations, locale handling, user-facing text         |
| `testing`            | Writing tests, running verification pipeline before commit     |
| `project-foundation` | Understanding the stack, config, utilities                     |

### Issue tracker

Issues in GitHub Issues via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at repo root. See `docs/agents/domain.md`.

## 7. Code Best Practices

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

## 8. Non-Negotiable Project Rules

- Use Bun only: `bun install`, `bun run dev`, `bun run build`, `bun run check`, `bun run typecheck`.
- `bun.lock` is authoritative. Do not add npm, pnpm, or yarn lockfiles.
- Run `bun run check` and `bun run typecheck` before committing or final handoff.
- Run `bun run build` when changes touch routing, server functions, auth, database, or deployment behavior.
- Do not guess library APIs. If unsure, check official docs, Context7, or existing project patterns first.
- Do not use raw internal `fetch`; use `createServerFn`.
- Do not use raw `useSearchParams`; use nuqs.
- Do not hardcode user-facing text; use `use-intl` and update message files.
