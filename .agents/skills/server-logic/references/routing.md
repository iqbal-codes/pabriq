# Routing

> **Rules:** [`../rules/ui.md`](../rules/ui.md) (nuqs, sidebar) · [`../rules/auth.md`](../rules/auth.md) (route guards, session).

## Root Layout (`__root.tsx`)

Provider stack wrapping the entire app:

```
IntlProvider > QueryClientProvider > ThemeProvider > TooltipProvider > NuqsAdapter
                                                                              > Outlet
                                                                              > Toaster
              > TanStack DevTools (Router + Query panels, client-only)
```

Router context type:

```typescript
interface MyRouterContext {
  queryClient: QueryClient
  session?: { session: Record<string, unknown>, user: { id, name, email, image } }
  org?: { id, name, slug, logo? }
}
```

## Org Layout Guard (`_org.tsx`)

```typescript
beforeLoad: async ({ location }) => {
  const session = await getCurrentSession()
  if (!session) throw redirect({ to: '/sign-in', search: { redirect: location.href } })

  const orgs = await listUserOrgs()
  if (!orgs || orgs.length === 0) throw redirect({ to: '/onboarding' })

  return { session, org: orgs[0] }
}
```

## Route Context for Page Metadata

Routes provide breadcrumbs, titles, and actions via `beforeLoad`:

```typescript
export const Route = createFileRoute('/_org/entity')({
  beforeLoad: () => ({
    breadcrumb: 'entityName',        // key for useTranslations('breadcrumb')
    pageTitle: 'entityName',          // key for mobile header
    primaryAction: { label: 'createEntity', href: '/entity/new' },
    parentBreadcrumbs: [{ label: 'parent', href: '/parent' }],
  }),
})
```

## Auth Routes Pattern

```typescript
// Redirect authenticated users away from sign-in/sign-up
export const Route = createFileRoute('/sign-in')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (session) throw redirect({ to: search.redirect ?? '/onboarding' })
  },
})
```

## URL Search Params (nuqs)

```tsx
import { useQueryState, parseAsString, parseAsInteger } from 'nuqs'

const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''))
const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
```

## Router Configuration (`router.tsx`)

```typescript
const router = createTanStackRouter({
  routeTree,
  context,
  scrollRestoration: true,
  defaultPreload: 'intent',
  defaultNotFoundComponent: NotFound,
  rewrite: {
    input: ({ url }) => deLocalizeUrl(url),
    output: ({ url }) => localizeUrl(url, getCurrentLocale()),
  },
})
setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })
```

## Route Structure

| Route | File | Description |
|---|---|---|
| `/` | (redirect via root) | Redirects to locale-prefixed home |
| `/sign-in` | `sign-in.tsx` | Sign-in with redirect param validation |
| `/sign-up` | `sign-up.tsx` | Sign-up |
| `/onboarding` | `onboarding.tsx` | Org creation form |
| `/_org` | `_org.tsx` | Protected org layout with sidebar |
| `/_org/` | `index.tsx` | Dashboard |
| `/_org/entity/` | list route | Entity list with search params |
| `/_org/entity/new` | create route | Entity create form |
| `/_org/entity/$id/` | detail route | Entity detail view |
| `/_org/entity/$id/edit` | edit route | Entity edit form |
| `/order/$token` | public portal | Public order portal |
| `/api/auth/$` | API handler | Better Auth handler |

## Key Rules

- Use `nuqs` for URL search params (NOT `useSearchParams`)
- Validate `redirect` param in auth routes to prevent open redirect attacks
- Use `_org.tsx` `beforeLoad` for session + org guard
- Provide `breadcrumb`, `pageTitle`, `primaryAction` in route contexts used by org layout
