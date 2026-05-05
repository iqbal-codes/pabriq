# Utilities

## `cn()` (`src/lib/utils.ts`)

```typescript
import { cn } from '#/lib/utils'
// clsx + tailwind-merge — for conditional className merging
```

## Logger (`src/lib/logger.ts`)

Pino logger with pino-pretty in development. Used by `server-logger-middleware.ts`.

## R2 / S3 Storage (`src/lib/r2.ts`)

| Export | Description |
|---|---|
| `r2Client` | S3 client instance |
| `uploadToR2(key, body, contentType)` | Upload file |
| `generateSignedDownloadUrl(key)` | Presigned GET URL |
| `generateSignedUploadUrl(key)` | Presigned PUT URL |
| `buildR2Key(orgId, ownerType, ownerId, fileHash)` | Key builder |
| `parseR2Key(key)` | Reverse of builder |

## Subdomain (`src/lib/subdomain.ts`)

```typescript
extractSubdomain(host: string): string | null
// For multi-tenant subdomain routing
```

## Query Client (`src/lib/query-client.ts`)

```typescript
import { getQueryClient } from '#/lib/query-client'
// SSR-safe singleton QueryClient
```

## RLS (`src/lib/rls.ts`)

```typescript
setCurrentOrg(orgId: string)    // Sets app.current_org_id PG session var
resetCurrentOrg()               // Clears it
orgFilter(col: string)          // SQL fragment: "col = current_setting('app.current_org_id')"
```
