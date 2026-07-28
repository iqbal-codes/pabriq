---
name: pabriq-operations
description: Deploy and operate build, container, health probes, startup, owner bootstrap, and observability. Use when modifying the Dockerfile, CI workflow, health endpoints, production startup script, Sentry instrumentation, or owner bootstrap.
---

# Pabriq Operations

## Scope

Use this skill for build and deployment behavior, containers, startup, health probes, owner bootstrap, CI, logging, and monitoring.

## How to

1. Identify the operational surface and read its current script, configuration, and adjacent tests before editing.
2. Follow the existing build, container, supervisor, health, bootstrap, and instrumentation path; change the owner rather than adding a parallel mechanism.
3. Preserve non-root execution, signal forwarding, liveness/readiness separation, bootstrap isolation, and centralized telemetry.
4. Keep test execution under `pabriq-test-safety` and verify only the affected operational command.

## Source pointers

- Build and start scripts: `package.json` and `vite.config.ts`.
- Container: `Dockerfile`.
- Startup supervisor: `scripts/start-production.mjs`.
- Health probes: `src/routes/api/healthz.ts`, `src/routes/api/ready.ts`, and `src/db/index.ts`.
- Owner bootstrap: `scripts/bootstrap-owner.ts` and `src/features/auth/bootstrap.ts`.
- Logging and instrumentation: `instrument.server.mjs`, `src/lib/logger.ts`, and `src/lib/server-logger-middleware.ts`.
- CI: `.github/workflows/ci.yml`.

## Guardrails

- Keep the production container non-root and preserve graceful shutdown.
- Keep liveness independent of external dependencies; readiness owns dependency checks.
- Keep bootstrap outside the production runner path unless the source architecture changes.
- Do not duplicate telemetry initialization or bypass the existing supervisor.

## Verification

Run the narrowest relevant project command, such as `bun run build`, `bun run typecheck`, or the affected operational smoke check.

<!-- CODEBASE-SKILL-FORGE:HUMAN:START -->
<!-- Add intentional project policy here. Sync preserves this region byte-for-byte. -->
<!-- CODEBASE-SKILL-FORGE:HUMAN:END -->
