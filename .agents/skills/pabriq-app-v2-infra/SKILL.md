---
name: pabriq-app-v2-infra
description: "Infrastructure for the pabriq-app-v2 codebase: multi-stage Dockerfile (bun build, node runtime), Infisical secret management via Universal Auth, Sentry server instrumentation, PWA/Serwist service worker + manifest, and Sandcastle agent sandbox. Use whenever the user touches Dockerfile, .dockerignore, .infisical.json, scripts/infisical-run.sh, instrument.server.mjs, .env.example, src/sw.ts, src/tanstack-serwist-plugin.ts, public/manifest.json, .sandcastle/Dockerfile, or deploy/runtime config in pabriq-app-v2."
---

# pabriq-app-v2 — Infrastructure

Infrastructure layer for pabriq-app-v2: Docker builds, secret management (Infisical), error monitoring (Sentry), PWA/Serwist service worker, environment variables, and the Sandcastle agent sandbox. This skill covers deployment, runtime config, and dev-environment bootstrapping — everything outside the application code itself.

> Read `../pabriq-app-v2-foundation/references/codebase-profile.md` first for the stack, architecture, and tooling context. This skill adds the infrastructure-specific details.

## Where things live

| Concern | Path | Purpose |
|---|---|---|
| App Dockerfile | `Dockerfile` | Multi-stage build: bun build → prod deps → node runtime |
| Docker ignore | `.dockerignore` | Excludes node_modules, .git, dist, env files |
| Infisical config | `.infisical.json` | Workspace ID for local `infisical run` |
| Infisical script | `scripts/infisical-run.sh` | Machine Identity auth for CI/agents |
| Sentry init | `instrument.server.mjs` | Server-side Sentry instrumentation |
| Env template | `.env.example` | All required env vars documented |
| Service worker | `src/sw.ts` | Serwist SW — precaches shell assets (production only) |
| SW build plugin | `src/tanstack-serwist-plugin.ts` | Custom Vite plugin: builds SW + injects precache manifest via `@serwist/build` |
| PWA manifest | `public/manifest.json` | Installable PWA metadata (name, icons, display mode) |
| PWA icons | `public/logo192.png`, `public/logo512.png`, `public/pwa-icon.svg` | PWA icons (192px, 512px, maskable) |
| Offline-first plan | `docs/plans/offline-first-implementation-plan.md` | Phased plan for offline data + sync (not yet implemented) |
| Sandcastle Dockerfile | `.sandcastle/Dockerfile` | Agent sandbox (node + bun + gh + OpenCode) |
| Sandcastle env | `.sandcastle/.env.example` | Agent sandbox env vars (API keys) |
| Sandcastle standards | `.sandcastle/CODING_STANDARDS.md` | Enforced rules for agent code review |

## Dockerfile — Multi-stage build

Three-stage build optimized for cache and minimal runtime image:

**Stage 1 — Builder** (bun:1.3.10-alpine): installs all deps, copies source, runs `bun run build`.
**Stage 2 — Prod deps** (bun:1.3.10-alpine): installs production-only deps.
**Stage 3 — Runner** (node:20-alpine): copies built artifacts + prod deps, runs `npm run start`.

> from `Dockerfile`

```dockerfile
# Stage 1: Build the application
FROM oven/bun:1.3.10-alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Stage 2: Install production dependencies only
FROM oven/bun:1.3.10-alpine AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Stage 3: Runtime
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

Key details:
- Build step runs `vite build` then copies `instrument.server.mjs` into `dist/server` (the `build` script: `vite build && cp instrument.server.mjs dist/server`).
- Production start uses `srvx serve --prod --import ./dist/server/instrument.server.mjs --entry ./dist/server/server.js -s ../client`.
- The runner uses Node 20 (not Bun) because srvx serves with Node in production.
- `--frozen-lockfile` ensures reproducible installs; `--production` in stage 2 strips devDeps.

## .dockerignore

Excludes `node_modules`, `.git`, `.github`, `dist`, `.env*`, test artifacts, `.worktree`, `.impeccable`, `bun.lockb`, and logs from the Docker build context. Prevents leaking secrets and bloat.

## Infisical secret management

pabriq-app-v2 uses [Infisical](https://infisical.com) for secret management with two auth modes:

### Local dev (interactive login)

Uses the `infisical` CLI directly — authenticates via browser-based login:

```bash
# package.json scripts
"load-env": "infisical run --env=dev --projectId=40d6476c-55e5-4e1b-8079-b251009c6772",
"load-env-test": "infisical run --env=staging --projectId=40d6476c-55e5-4e1b-8079-b251009c6772",
```

Dev commands that need secrets chain through `load-env`:

```bash
"dev:infisical": "bun run load-env -- bun run dev",
"db:studio:infisical": "bun run load-env -- bun run db:studio",
```

### CI / agent auth (Machine Identity)

> from `scripts/infisical-run.sh`

```bash
#!/bin/bash
set -e

CLIENT_ID="${INFISICAL_CLIENT_ID}"
CLIENT_SECRET="${INFISICAL_CLIENT_SECRET}"
PROJECT_ID="${INFISICAL_PROJECT_ID:-40d6476c-55e5-4e1b-8079-b251009c6772}"

if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ]; then
  echo "Error: INFISICAL_CLIENT_ID and INFISICAL_CLIENT_SECRET must be set"
  exit 1
fi

ACCESS_TOKEN=$(curl -s -X POST 'https://app.infisical.com/api/v1/auth/universal-auth/login' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "clientId=$CLIENT_ID" \
  -d "clientSecret=$CLIENT_SECRET" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

infisical run --token="$ACCESS_TOKEN" --env=dev --projectId="$PROJECT_ID" -- "$@"
```

The agent dev command chains through this script:

```bash
"dev:agent": "bash scripts/infisical-run.sh bun run dev",
```

### Infisical config

> from `.infisical.json`

```json
{
  "workspaceId": "40d6476c-55e5-4e1b-8079-b251009c6772"
}
```

Two environments are used: `dev` (local dev) and `staging` (tests).

## Sentry instrumentation

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

How it wires up:
- Dev: loaded via `NODE_OPTIONS='--import ./instrument.server.mjs'` in the `dev` script.
- Build: copied to `dist/server/instrument.server.mjs` by the `build` script.
- Production: loaded via `srvx serve --import ./dist/server/instrument.server.mjs`.
- Package: `@sentry/tanstackstart-react` (Sentry's TanStack Start integration).
- DSN comes from `VITE_SENTRY_DSN` (accessible in both client and server contexts via `import.meta.env` / `process.env`).
- All sampling rates are 1.0 (full capture) — appropriate for staging/early production; tune down for high-traffic production.

## PWA / Service Worker (Serwist)

pabriq-app-v2 is an installable PWA using [Serwist](https://serwist.pages.dev/) (v9.5) for service worker management. The current setup precaches shell assets only — no business-data runtime caching yet (planned in `docs/plans/offline-first-implementation-plan.md`).

### Architecture

Three files cooperate:

1. **`src/sw.ts`** — The service worker source. Uses `Serwist` with `skipWaiting: true` and `clientsClaim: true` for immediate activation. Precache entries come from `self.__SW_MANIFEST` (injected at build time).

> from `src/sw.ts`
```typescript
import { Serwist } from 'serwist'

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
})
serwist.addEventListeners()
```

2. **`src/tanstack-serwist-plugin.ts`** — Custom Vite plugin that runs after the main build (`closeBundle` hook). It:
   - Builds `src/sw.ts` into `dist/client/sw.js` as an ES module library
   - Runs `@serwist/build`'s `injectManifest()` to inject precache entries for `**/*.{js,css,html,png,svg,ico,json,webmanifest,woff,woff2}`
   - Only runs in production builds (`isProduction` guard)

3. **`src/routes/__root.tsx`** — Registers the service worker on the client using `@serwist/window`:

> from `src/routes/__root.tsx`
```typescript
import { Serwist } from '@serwist/window'

useEffect(() => {
  if (!('serviceWorker' in navigator)) return
  const serwist = new Serwist('/sw.js', { scope: '/', type: 'module' })
  void serwist.register()
}, [])
```

### PWA manifest

> from `public/manifest.json`
```json
{
  "name": "Pabriq",
  "short_name": "Pabriq",
  "description": "Production management for made-to-order businesses.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#111111"
}
```

Icons: `favicon.ico` (multi-size), `logo192.png` (192px), `logo512.png` (512px, `any` + `maskable`).

### Dependencies

| Package | Version | Role |
|---|---|---|
| `serwist` | ^9.5.11 | Core SW library (precache, runtime caching) |
| `@serwist/build` | ^9.5.11 | Build-time manifest injection |
| `@serwist/window` | ^9.5.11 | Client-side SW registration |

### How the build works

1. `vite build` runs the main app build → `dist/client/`
2. `tanstackSerwistPlugin().closeBundle()` fires after main build
3. Plugin builds `src/sw.ts` → `dist/client/sw.js` (separate Vite lib build)
4. `injectManifest()` scans `dist/client/` for matching assets and injects the precache array into `sw.js`
5. Result: `dist/client/sw.js` contains the precache list + Serwist runtime

### Offline-first plan

A detailed phased plan exists at `docs/plans/offline-first-implementation-plan.md`. Phase 0 (installable shell) is complete. Phases 1–7 (IndexedDB, offline routing, read models, outbox, conflict handling, file capture, observability) are not yet implemented. Key decisions:
- IndexedDB via Dexie for local data store
- Server remains source of truth; local state is a projection + outbox
- Auth, payments, and org admin stay online-only
- TanStack Query remains the transport/cache coordinator

## Environment variables

> from `.env.example`

| Variable | Purpose | Used by |
|---|---|---|
| `DATABASE_URL` | Neon Postgres connection (direct) | Drizzle / pg Pool |
| `DATABASE_URL_POOLER` | Neon Postgres pooled connection | Serverless-friendly |
| `NEON_LAUNCHPAD_DISABLED` | Skip Neon Launchpad setup | Dev bootstrapping |
| `BETTER_AUTH_SECRET` | Better Auth signing secret | Auth |
| `BETTER_AUTH_URL` | Base URL for auth callbacks | Auth |
| `COOKIE_DOMAIN` | Cookie domain for auth sessions | Auth |
| `TRUSTED_ORIGINS` | CORS trusted origins | Auth |
| `VITE_ENABLE_ORGANIZATIONS` | Feature flag for org plugin | Client + server |
| `SENTRY_DSN` / `VITE_SENTRY_DSN` | Sentry DSN | Monitoring |
| `SENTRY_ENVIRONMENT` | Sentry environment tag | Monitoring |
| `BITESHIP_API_KEY` | Biteship shipping API | Address feature |
| `R2_ENDPOINT` | Cloudflare R2 endpoint | File storage |
| `R2_ACCESS_KEY_ID` | R2 access key | File storage |
| `R2_SECRET_ACCESS_KEY` | R2 secret key | File storage |
| `R2_BUCKET_NAME` | R2 bucket | File storage |
| `R2_PUBLIC_URL` | R2 public URL | File storage |
| `MASTRA_MODEL` | Model string (e.g. `openrouter/openai/gpt-4o`) | AI assistant |
| `OPENROUTER_API_KEY` | OpenRouter API key | AI assistant |
| `MIDTRANS_SERVER_KEY` | Midtrans server key | Payments |
| `VITE_MIDTRANS_CLIENT_KEY` | Midtrans client key (exposed to browser) | Payments |
| `VITE_MIDTRANS_IS_PRODUCTION` | Toggle Midtrans prod mode | Payments |

Variables prefixed `VITE_` are bundled into client JS by Vite. All others are server-only.

## Sandcastle agent sandbox

The `.sandcastle/` directory provides a sandboxed Docker environment for AI coding agents.

> from `.sandcastle/Dockerfile`

```dockerfile
FROM node:22-bookworm

RUN apt-get update && apt-get install -y \
  git \
  curl \
  jq \
  && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
  | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && apt-get update && apt-get install -y gh \
  && rm -rf /var/lib/apt/lists/*

ARG AGENT_UID=1000
RUN usermod -u $AGENT_UID -d /home/agent -m -l agent node
USER agent

RUN curl -fsSL https://bun.sh/install | bash
ENV BUN_INSTALL="/home/agent/.bun"
ENV PATH="$BUN_INSTALL/bin:$PATH"

RUN bun install -g opencode-ai@latest
WORKDIR /home/agent

ENTRYPOINT ["sleep", "infinity"]
```

Key details:
- Base: `node:22-bookworm` (Debian, not Alpine — needs gh CLI and full apt).
- `AGENT_UID` build arg aligns container UID with host user (default 1000).
- Installs: git, curl, jq, GitHub CLI (`gh`), Bun, and OpenCode CLI.
- Sandcastle bind-mounts the git worktree at `${SANDBOX_REPO_DIR}` and overrides `WORKDIR` at container start.
- `ENTRYPOINT ["sleep", "infinity"]` — container stays alive for agent interaction.
- Agent sandbox env (`.sandcastle/.env.example`) needs: `OPENCODE_API_KEY`, `GH_TOKEN`.

### Sandcastle coding standards

The agent reviewer loads `.sandcastle/CODING_STANDARDS.md` during code review. This file enforces all project conventions (TypeScript style, architecture patterns, data layer rules, UI constraints, auth/security, testing standards). Agents operating in the sandbox MUST comply with these standards.

## Commands

All infra-adjacent commands from `package.json`:

| Command | What it does |
|---|---|
| `bun run build` | `vite build && cp instrument.server.mjs dist/server` — builds app + copies Sentry init |
| `bun run start` | `srvx serve --prod --import ./dist/server/instrument.server.mjs --entry ./dist/server/server.js -s ../client` — production server |
| `bun run dev` | Dev server with Sentry instrumentation on port 3001 |
| `bun run dev:infisical` | Dev with Infisical secrets (local interactive auth) |
| `bun run dev:agent` | Dev with Infisical Machine Identity (for agents) |
| `bun run load-env` | `infisical run --env=dev --projectId=...` — inject dev secrets |
| `bun run load-env-test` | `infisical run --env=staging --projectId=...` — inject staging secrets |

## Conventions observed

- Build uses Bun, runtime uses Node — don't conflate the two.
- `--frozen-lockfile` on all installs; never mutate lockfile in Docker.
- Secrets are NEVER in `.env` files committed to git; `.env` and `.env.*` are gitignored.
- `instrument.server.mjs` is a flat ES module with no bundler — loaded via `--import` flag.
- Sentry is optional at runtime (warns and skips if DSN missing).
- Sandcastle agents get their own UID mapping to avoid permission issues with bind-mounted repos.
- The Infisical project ID is hardcoded in `.infisical.json` and `scripts/infisical-run.sh` — consistent across local and CI.
- Service worker only runs in production builds — dev mode has no SW to avoid caching conflicts.
- PWA manifest is linked via `<link rel="manifest">` in the root route's `head()` function.
- Serwist uses `skipWaiting: true` + `clientsClaim: true` — new SW activates immediately, no user prompt.

## Anti-patterns to avoid

- Do NOT bake secrets into the Docker image — use Infisical or env vars at runtime.
- Do NOT use `bun` in the production Dockerfile CMD — the runner stage uses Node 20 with srvx.
- Do NOT add devDependencies to the prod-deps stage — only `--production` install.
- Do NOT skip the Sentry `--import` flag in production — without it, errors won't be captured.
- Do NOT hardcode Infisical credentials in scripts — they come from the agent environment.
- Do NOT use Alpine for the Sandcastle image — it needs Debian for `gh` CLI and apt packages.
- Do NOT add runtime caching to the service worker without consulting `docs/plans/offline-first-implementation-plan.md` — the plan specifies which domains get offline support and which stay online-only.
- Do NOT register the service worker in dev mode — it interferes with HMR and caches stale assets.

## Gaps / verify

- Production deployment beyond the Dockerfile is not documented in-repo. The profile's open questions note: "Production deployment details beyond Dockerfile not found in-repo. Verify deploy process."
- No `.github/workflows` directory found — CI/CD pipeline is managed outside the repo or in a private CI system.
- Sentry sampling rates are all 1.0 — should be tuned before high-traffic production.
- The `start` script references `srvx` which is not listed in `package.json` dependencies — verify it's bundled by Vite or available at runtime.
- Sandcastle's `AGENT_UID=1000` default works for most setups but may need adjustment for non-standard host UIDs.
