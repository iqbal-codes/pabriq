---
name: pabriq-operations
description: Deploy and operate build, container, health probes, startup, owner bootstrap, and observability. Use when modifying the Dockerfile, CI workflow, health endpoints, production startup script, Sentry instrumentation, or owner bootstrap.
---

# Operations

Deployment contract ownership: build pipeline, container construction, startup signal flow, health probes, owner bootstrap, CI, and observability. Governs the boundary between application code and running infrastructure.

## Build contracts

**[Observed]** `bun run build` runs `vite build` then copies `instrument.server.mjs` into `dist/server` (`package.json:15`). The production entry is `dist/server/server.js` served by srvx (`package.json:26`).

**[Observed]** `packageManager: "bun@1.3.10"` (`package.json:6`). The builder stage uses `oven/bun:1.3.10-alpine` (`Dockerfile:2`). Lockfile is `bun.lock`. `--frozen-lockfile` is mandatory in CI (`.github/workflows/ci.yml:35`) and Docker (`Dockerfile:9,21`).

**[Observed]** Vite build target is `es2022` (`vite.config.ts:46`). Browser polyfills stub `node:stream`, `node:stream/web`, and `node:async_hooks` for SSR (`vite.config.ts:16-36`). Neon launchpad plugin is dev-only, gated on `NEON_LAUNCHPAD_DISABLED` and `DATABASE_URL` (`vite.config.ts:40-43`).

**[Observed]** The `start` script loads Sentry via Node `--import` flag: `srvx serve --prod --import ./dist/server/instrument.server.mjs --entry ./dist/server/server.js -s ../client` (`package.json:26`). The `instrument.server.mjs` must exist at `dist/server/instrument.server.mjs` for the production server to start.

Completion criterion: `bun run build` succeeds; `dist/server/instrument.server.mjs` and `dist/server/server.js` both exist.

## Container construction

**[Observed]** Three-stage Dockerfile (`Dockerfile:1-49`):
1. `builder` (`oven/bun:1.3.10-alpine`) — full deps, `bun run build`
2. `prod-deps` (`oven/bun:1.3.10-alpine`) — production deps only (`bun install --frozen-lockfile --production`)
3. `runner` (`node:20-alpine`) — non-root `pabriq` user, copies `dist/`, `node_modules/`, `package.json`, `scripts/start-production.mjs`

**[Required]** `STOPSIGNAL SIGTERM` (`Dockerfile:44`). The container must receive SIGTERM for graceful shutdown via `start-production.mjs`.

**[Required]** `USER pabriq` (`Dockerfile:42`). The container runs as non-root. Do not add sudo or run as root.

**[Required]** `HEALTHCHECK` targets `/api/ready` on `$PORT` (default 3001) (`Dockerfile:46-47`):
- `start-period=30s` — liveness disabled during startup
- `interval=30s`, `timeout=5s`, `retries=3`

**[Observed]** `CMD ["npm", "run", "start:prod"]` (`Dockerfile:49`). The runner stage uses npm, not bun. This is intentional: the runner is `node:20-alpine` without bun installed.

**[Observed]** Only `scripts/start-production.mjs` is copied to the runner stage (`Dockerfile:35`). `scripts/bootstrap-owner.ts` and other scripts are unavailable in the container.

Completion criterion: `docker build .` succeeds; container starts and `HEALTHCHECK` reports healthy within 60s; container runs as non-root `pabriq` user (observe via `id` in container).

## Startup signal flow

**[Observed]** `scripts/start-production.mjs` is a Node process supervisor (`scripts/start-production.mjs:1-32`):
- Spawns `npm run start` as child process (`scripts/start-production.mjs:9-12`)
- Forwards `SIGTERM`/`SIGINT` to child (`scripts/start-production.mjs:27-28`)
- Grace period: `SHUTDOWN_GRACE_MS` env, default 10,000ms (`scripts/start-production.mjs:5`)
- `childExiting` flag prevents double-shutdown (`scripts/start-production.mjs:7`)
- On grace timeout: `process.exit(1)` (`scripts/start-production.mjs:18-20`)
- On child exit: `clearTimeout` + `process.exit(0)` (`scripts/start-production.mjs:21-24`)
- Child exit (no signal): `process.exit(code ?? 1)` (`scripts/start-production.mjs:30-32`)

**[Observed]** `npm run start` invokes srvx which loads Sentry instrumentation before serving (`package.json:26`). The `--import` flag ensures `instrument.server.mjs` executes before any application code.

**[Observed]** Docker sends `SIGTERM` on stop (`Dockerfile:44`). `SIGINT` covers manual interruption (Ctrl+C in terminal).

Completion criterion: Sending SIGTERM to the supervisor causes the child to receive SIGTERM; the supervisor exits 0 if the child exits within `SHUTDOWN_GRACE_MS`; exits 1 if the child exceeds the grace period.

## Health probe contracts

**[Observed]** `/api/healthz` — liveness contract (`src/routes/api/healthz.ts:1-9`):
- Returns `200 "ok"` unconditionally
- Zero dependencies, zero auth, zero logging
- Not referenced by any automated health check (Docker uses `/api/ready`)

**[Observed]** `/api/ready` — readiness contract (`src/routes/api/ready.ts:1-19`):
- Calls `checkDatabaseHealth()` which executes `SELECT 1` (`src/db/index.ts:32-34`)
- Returns `200 "ready"` on success, `503 "database unavailable"` on failure
- Logs failures via pino (`src/routes/api/ready.ts:13`)
- Used by Docker `HEALTHCHECK` (`Dockerfile:46-47`)

**[Observed]** Database initialization (`src/db/index.ts:11-28`):
- `DATABASE_URL` is required; module throws on import if missing (`src/db/index.ts:12`)
- Pool created with `connectionTimeoutMillis: 10000` (`src/db/index.ts:14-17`)
- Connection string normalized: `sslmode` upgraded to `verify-full` (`src/db/connection-string.ts:4-16`)
- Fail-fast: pool connection tested at import; failure throws with masked connection string (`src/db/index.ts:19-28`)

**[Required]** Liveness and readiness have distinct semantic roles. Liveness (`healthz`) confirms the process is alive and accepting connections. Readiness (`ready`) confirms the process can serve traffic. A database outage should degrade readiness (503) without killing the process — liveness must never check external dependencies.

Completion criterion: `curl localhost:3001/api/healthz` returns 200 regardless of database state; `curl localhost:3001/api/ready` returns 503 when database is unreachable; `curl localhost:3001/api/ready` returns 200 when database is healthy.

## Owner bootstrap

**[Observed]** `scripts/bootstrap-owner.ts` delegates to `bootstrapOwnerAccount()` (`src/features/auth/bootstrap.ts:44-91`):
- CLI args `--email`, `--password`, `--name` override env vars `BOOTSTRAP_OWNER_EMAIL`, `BOOTSTRAP_OWNER_PASSWORD`, `BOOTSTRAP_OWNER_NAME` (`scripts/bootstrap-owner.ts:10-40`)
- Required: `email`, `password` (minimum 8 characters). Optional: `name` (derived from email prefix if omitted) (`scripts/bootstrap-owner.ts:42-52`)
- Email validated by regex `/^\S+@\S+\.\S+$/` and normalized: trim + lowercase (`src/features/auth/bootstrap.ts:18-19,35-36`)
- Duplicate email → throws `"Email already has an account"` (`src/features/auth/bootstrap.ts:59`)
- Cleanup-on-failure: if password hashing or account linking fails, the partially-created user is deleted (`src/features/auth/bootstrap.ts:83-88`)
- Output: JSON `{ ok, created, email, userId, next }` (`scripts/bootstrap-owner.ts:65-77`)

**[Required]** Bootstrap is a one-time operation. Running twice with the same email fails on duplicate check.

**[Observed]** Bootstrap is unavailable in the container — only `scripts/start-production.mjs` is copied to the runner stage (`Dockerfile:35`). Run bootstrap before container deployment or via a separate init container.

Completion criterion: `bun run bootstrap:owner` with valid credentials outputs JSON with `created: true`; re-running with same email exits 1 with duplicate error.

## Observability

**[Observed]** Sentry is initialized via Node `--import` flag (`instrument.server.mjs:1-18`):
- `VITE_SENTRY_DSN` env var required; warns and skips if absent (`instrument.server.mjs:6-8`)
- `tracesSampleRate: 1.0` — 100% trace sampling (`instrument.server.mjs:14`)
- `replaysSessionSampleRate: 1.0` — 100% session replay (`instrument.server.mjs:15`)
- `replaysOnErrorSampleRate: 1.0` — 100% error replay (`instrument.server.mjs:16`)
- `sendDefaultPii: true` — sends request headers and IP (`instrument.server.mjs:13`)

**[Conflict]** All Sentry sample rates are 1.0 (100%) with no environment guard. In production this generates maximum telemetry volume. The code has no conditional logic to differentiate production vs development sampling rates.

**[Observed]** Pino logger singleton (`src/lib/logger.ts:1-17`):
- Level: `LOG_LEVEL` env, defaults to `debug` in dev, `info` in production (`src/lib/logger.ts:6`)
- `pino-pretty` transport active only when `NODE_ENV !== 'production'` (`src/lib/logger.ts:7-15`)
- No request-scoped context (no user/org fields) — the logger is a stateless singleton

**[Observed]** Server function middleware (`src/lib/server-logger-middleware.ts:1-36`):
- Registered globally via `createStart` (`src/start.ts:4-8`)
- Wraps every `createServerFn` call
- Logs `fn` name and `durationMs` on success (`src/lib/server-logger-middleware.ts:20`)
- Logs `fn`, `durationMs`, `err`, `cause` on error (`src/lib/server-logger-middleware.ts:29-32`)
- Dynamically imports `captureException` from Sentry on error — swallows import failure (`src/lib/server-logger-middleware.ts:5-8`)
- Re-throws after logging — middleware is observability-only, not error-handling (`src/lib/server-logger-middleware.ts:34`)

Completion criterion: `VITE_SENTRY_DSN` set → Sentry init log confirms DSN; `LOG_LEVEL=debug` → pino outputs debug-level logs; server function calls produce structured log entries with `fn` and `durationMs`.

## CI pipeline

**[Observed]** `.github/workflows/ci.yml` (`.github/workflows/ci.yml:1-44`):
- Triggers: PR to `develop`/`main`, push to `develop`/`main` (`.github/workflows/ci.yml:4-9`)
- Concurrency: cancels in-progress runs for same ref (`.github/workflows/ci.yml:17-18`)
- Steps: checkout → setup-bun@v2 (1.3.10) → `bun install --frozen-lockfile` → `bun run check` → `bun run typecheck` → `bun run build` (`.github/workflows/ci.yml:25-44`)
- Timeout: 20 minutes (`.github/workflows/ci.yml:23`)
- No tests, no Docker build/push, no dependency caching

**[Conflict]** CI runs lint, typecheck, and build but no unit, integration, or E2E tests. The SAFETY ABORT gate in `vitest.config.ts:6-11` requires `VITEST_FROM_SCRIPT=true` and Infisical staging env, which CI does not provision.

Completion criterion: `bun run check` passes; `bun run typecheck` passes; `bun run build` passes; the workflow file contains no test steps.

## Safe commands

**[Observed]** Operations scripts in `package.json:9-36`:
- `bun run build` — Vite build + `instrument.server.mjs` copy
- `bun run check` — Biome lint and format check
- `bun run typecheck` — TypeScript type checking (`tsc --noEmit`)
- `bun run start` — srvx production serve
- `bun run start:prod` — supervisor (`start-production.mjs`) wrapping `start`
- `bun run bootstrap:owner` — one-time owner provisioning
- `bun run db:generate`, `bun run db:migrate`, `bun run db:push` — Drizzle schema management

**[Required]** Test scripts (`bun run test`, `bun run test:e2e`) have safety gates and environment requirements governed by the `pabriq-test-safety` skill. When test execution is relevant to an operations change, read `pabriq-test-safety` before invoking test commands.

Completion criterion: Each operations script listed in `package.json` under `scripts` is reachable by name; test script safety rules are deferred to `pabriq-test-safety`.

## Risks and observations

These are current-state observations reported without migration recommendations.

**[Observation]** `start-production.mjs` has no test coverage. The signal forwarding and grace period edge cases (double-shutdown, child exit during grace period, SIGKILL) are untested.

**[Observation]** E2E tests run against `bun run dev` (development server), not the production build. Production-specific behaviors (minification, SSR bundling, env variable inlining) are untested by E2E.

**[Observation]** Three divergent org-resolution paths exist: `resolveOrgContext` in `src/lib/auth-session.ts` (via `listUserOrgs`), `resolveOrgId` in `src/lib/auth-session-server.ts` (direct DB query of `member` table), and `resolveOrgForDocument` in `src/features/documents/server.tsx` (separate DB query). They share the `member` table but use different surrounding logic.

**[Observation]** The `midtrans-notification` handler leaks error messages in 500 response bodies (`Error processing webhook: ${errorMessage}`). Document endpoints return generic `"Internal Server Error"` strings. The inconsistency means midtrans 500s expose internal details while document 500s do not.

**[Observation]** CI has no dependency caching. Every run performs a fresh `bun install` from lockfile.

**[Observation]** `bootstrap-owner.ts` is not available inside the Docker container (`Dockerfile:35` copies only `start-production.mjs`). Initial owner provisioning must happen outside the container lifecycle.

<!-- CODEBASE-SKILL-FORGE:HUMAN:START -->
<!-- Add intentional project policy here. Sync preserves this region byte-for-byte. -->
<!-- CODEBASE-SKILL-FORGE:HUMAN:END -->
