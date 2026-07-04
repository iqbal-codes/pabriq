---
name: pabriq-app-v2-infra
description: Infrastructure for the pabriq-app-v2 codebase: multi-stage Dockerfile (bun build, node runtime), Infisical secret management via Universal Auth, Sentry server instrumentation, and Sandcastle agent sandbox. Use whenever the user touches Dockerfile, .dockerignore, .infisical.json, scripts/infisical-run.sh, instrument.server.mjs, .env.example, or deploy/runtime config in pabriq-app-v2.
---

# pabriq-app-v2 — Infrastructure

Infrastructure and deployment configuration for the pabriq-app-v2 monolith. Covers containerization (Dockerfile), secrets management (Infisical), server instrumentation (Sentry), and the Sandcastle agent sandbox. No CI/CD pipelines or IaC exist yet.

> Read `../pabriq-app-v2-foundation/references/codebase-profile.md` first for the stack, architecture, and tooling context. This skill adds the infrastructure-specific details.

## Where things live

- `Dockerfile` — multi-stage production container build
- `.dockerignore` — build context exclusions
- `.infisical.json` — Infisical workspace binding
- `scripts/infisical-run.sh` — Universal Auth token fetcher for agent environments
- `instrument.server.mjs` — Sentry server-side instrumentation (copied into `dist/server` at build)
- `.env.example` — full env var reference for local development
- `.sandcastle/Dockerfile` — Sandcastle agent sandbox container (dev tooling, not production)

## How we do infrastructure here

### Multi-stage Docker build

Three-stage Dockerfile: build with Bun, install production deps separately, run on Node.

> from `Dockerfile`
```dockerfile
FROM oven/bun:1.3.10-alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1.3.10-alpine AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./package.json
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 3000
ENV PORT=3000
ENV HOST=0.0.0.0
CMD ["npm", "run", "start"]
```

Why: Bun builds the app but the runtime image uses Node 20 Alpine — production deps are installed in a separate stage so devDependencies never reach the final image.

### Infisical secret injection

Secrets are never committed. Two pathways load them at runtime:

**Direct CLI** (local dev with Infisical CLI installed):
```
bun run dev:infisical    # infisical run --env=dev ... bun run dev
bun run load-env-test    # infisical run --env=staging ... (for tests)
```

**Universal Auth** (agent / CI without local Infisical CLI):

> from `scripts/infisical-run.sh`
```bash
CLIENT_ID="${INFISICAL_CLIENT_ID}"
CLIENT_SECRET="${INFISICAL_CLIENT_SECRET}"
PROJECT_ID="${INFISICAL_PROJECT_ID:-40d6476c-55e5-4e1b-8079-b251009c6772}"

ACCESS_TOKEN=$(curl -s -X POST 'https://app.infisical.com/api/v1/auth/universal-auth/login' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "clientId=$CLIENT_ID" \
  -d "clientSecret=$CLIENT_SECRET" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

infisical run --token="$ACCESS_TOKEN" --env=dev --projectId="$PROJECT_ID" -- "$@"
```

Why: The script authenticates via Machine Identity (Universal Auth), gets a short-lived token, and forwards it to `infisical run`. Agent environments use `bun run dev:agent` which calls this script.

### Server instrumentation (Sentry)

Sentry is initialized at server startup via a Vite import hook, not at the app entry point:

> from `instrument.server.mjs`
```javascript
import * as Sentry from '@sentry/tanstackstart-react'

const sentryDsn =
  import.meta.env?.VITE_SENTRY_DSN ?? process.env.VITE_SENTRY_DSN

if (!sentryDsn) {
  console.warn('VITE_SENTRY_DSN is not defined. Sentry is not running.')
} else {
  Sentry.init({
    dsn: sentryDsn,
    sendDefaultPii: true,
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 1.0,
    replaysOnErrorSampleRate: 1.0,
  })
}
```

Why: The `--import ./instrument.server.mjs` flag in the dev and start commands ensures Sentry captures server-side errors before the app boots. The file is copied into `dist/server` during build (`cp instrument.server.mjs dist/server`).

## Commands

- Build: `bun run build` (vite build && cp instrument.server.mjs dist/server)
- Start (production): `bun run start` (srvx serve --prod --import ./dist/server/instrument.server.mjs --entry ./dist/server/server.js -s ../client)
- Dev (local): `bun run dev`
- Dev (Infisical): `bun run dev:infisical`
- Dev (agent): `bun run dev:agent`
- Docker build: `docker build -t pabriq-app-v2 .`
- Docker run: `docker run -p 3000:3000 pabriq-app-v2`

## Conventions observed

- Bun 1.3.10 is pinned in both the Dockerfile and `packageManager` field — updates require changing both.
- The `.dockerignore` excludes `node_modules`, `dist`, `.env*`, and `test-results` to keep the build context minimal.
- Secrets are never in env files committed to the repo — `.env` is gitignored; `.env.example` documents the shape.
- `instrument.server.mjs` is a top-level file (not inside `src/`) because it must be importable by Vite's `--import` flag before the app boots.

## Anti-patterns to avoid

- Do not hardcode secrets or connection strings in the Dockerfile or any committed config. Use Infisical or env vars.
- Do not add `apt-get install` or heavy tools to the production Dockerfile — it uses Alpine for minimal image size.
- Do not skip the `--frozen-lockfile` flag in Docker `bun install` — it ensures reproducible builds.
- Do not move `instrument.server.mjs` into `src/` — it must remain at the project root for the `--import` flag to resolve.

## Gaps / verify

- **No CI/CD pipelines**: No `.github/workflows/`, `.gitlab-ci.yml`, or equivalent exists. Deployment strategy is not codified. Verify before assuming any automated deploy path.
- **No docker-compose**: No compose file for local multi-service development (e.g. DB, Redis). Developers run services externally or via Neon local dev.
- **No IaC**: No Terraform, Pulumi, or CloudFormation configs. Infrastructure provisioning is manual or managed externally.
- **Production runtime mismatch**: The Dockerfile uses `npm run start` but the project uses Bun. Verify the `start` script works correctly under Node in the runner stage.
