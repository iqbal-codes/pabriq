---
name: i18n
description: Internationalization — use-intl setup, message structure (en.ts/id.ts), locale resolution, adding keys, test wrappers, namespaces. Use when adding user-facing text, new translation keys, or locale handling; or when user mentions i18n, translations, locale.
---

# i18n

## Non-Negotiables

- MUST use `useTranslations()` for every user-facing text in JSX.
- MUST use `getTranslations()` for text computed outside JSX (beforeLoad, loader).
- MUST define every key in the `Messages` type in `src/messages/en.ts` before using it.
- MUST provide both `en` and `id` values for every key — missing `id` keys cause type errors.
- MUST use existing namespace structure; add new ones as top-level keys in `Messages` type.
- Namespace keys MUST use camelCase.
- MUST wrap test components using `useTranslations` in `IntlProvider` with test messages.
- MUST NOT use raw strings in `beforeLoad` breadcrumb/pageTitle values — these are keys for `useTranslations('breadcrumb')` and `useTranslations('app')`.

## Message Structure

```
src/messages/
├── en.ts     # Messages type + English values (source of truth)
├── id.ts     # Indonesian values (typed as Messages)
└── index.ts  # Aggregation, locale list
```

## Adding a Key

```typescript
// 1. Add to Messages type in en.ts
export type Messages = {
  myFeature: {
    title: string
    save: string
  }
}

// 2. Add values to en.ts and id.ts in the same shape

// 3. Use in component:
const t = useTranslations('myFeature')
return <h1>{t('title')}</h1>
```

## Locale Resolution (`#/lib/i18n.utils.ts`)

URL path prefixes (`/id/products`). Uses `createIsomorphicFn`:
- `getCurrentLocale()` — returns 'en' or 'id' from URL path or cookie
- `deLocalizeUrl(url)` — strips locale prefix
- `localizeUrl(url, locale)` — adds locale prefix

Ignored paths: `/admin/**`, `/api/**`

Router rewrites in `router.tsx`:
```typescript
rewrite: {
  input: ({ url }) => deLocalizeUrl(url),
  output: ({ url }) => localizeUrl(url, getCurrentLocale()),
},
```

## Testing with i18n

```typescript
function renderWithIntl(ui: React.ReactElement) {
  return render(
    <IntlProvider locale="en" messages={{ status: { active: 'Active' } }}>
      {ui}
    </IntlProvider>,
  )
}

it('renders status badge', () => {
  renderWithIntl(<StatusBadge status="active" />)
  expect(screen.getByText('Active')).toBeInTheDocument()
})
```

## Namespaces

auth, admin, app, assetUpload, common, settings, dataTable, combobox, orders, breadcrumb, status, org, sidebar, customers, dashboard, products, address, production, portal

## References

When you need deeper detail: [`references/i18n.md`](references/i18n.md) — message structure, locale resolution, adding keys.
