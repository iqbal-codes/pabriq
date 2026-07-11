import { Serwist } from '@serwist/window'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import {
  ClientOnly,
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router'
import { type ReactNode, useEffect } from 'react'
import { IntlProvider, useTranslations } from 'use-intl'
import { Toaster } from '#/components/ui/sonner'
import { ThemeProvider } from '#/components/ui/theme-provider'
import { TooltipProvider } from '#/components/ui/tooltip'
import { defaultLocale } from '#/lib/i18n'
import { getCurrentLocale } from '#/lib/i18n.utils'
import { getQueryClient } from '#/lib/query-client'
import { type Locale, type Messages, messages } from '#/messages'
import appCss from '../styles.css?url'

type PageTitleKey = keyof Messages['breadcrumb']
type PageTitleMatch = { routeId: string; context: unknown }
const pageTitleKeys = messages[defaultLocale].breadcrumb

function isPageTitleKey(value: unknown): value is PageTitleKey {
  return typeof value === 'string' && value in pageTitleKeys
}

export function getPageTitleKey(
  matches: ReadonlyArray<PageTitleMatch>,
): PageTitleKey | undefined {
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i]
    if (match.routeId === '__root__') continue
    const key = (match.context as Record<string, unknown>)?.pageTitle
    if (isPageTitleKey(key)) return key
  }
  return undefined
}

export function PageTitleSetter() {
  const t = useTranslations('app')
  const bt = useTranslations('breadcrumb')
  const matches = useRouterState({ select: (s) => s.matches })

  const appTitle = t('title')
  const pageTitleKey = getPageTitleKey(matches)
  const title = pageTitleKey ? `${appTitle} - ${bt(pageTitleKey)}` : appTitle

  useEffect(() => {
    document.title = title
  }, [title])

  return <title>{title}</title>
}

interface MyRouterContext {
  queryClient: QueryClient
  session?: {
    session: Record<string, unknown>
    user: {
      id: string
      name: string | null
      email: string
      image: string | null
    }
  }
  org?: {
    id: string
    name: string
    slug: string
    logo?: string | null
  }
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        name: 'theme-color',
        content: '#00B8A9',
      },
      {
        name: 'apple-mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-title',
        content: 'labq.dev',
      },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'black-translucent',
      },
    ],
    links: [
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
      {
        rel: 'icon',
        href: '/labq_bq_logo_vector.svg',
        type: 'image/svg+xml',
      },
      {
        rel: 'apple-touch-icon',
        href: '/logo192.png',
      },
    ],
  }),
  shellComponent: RootDocument,
  component: () => (
    <NuqsAdapter>
      <Outlet />
    </NuqsAdapter>
  ),
})

function RootDocument({ children }: { children: ReactNode }) {
  const locale = getCurrentLocale()

  useEffect(() => {
    if (!import.meta.env.PROD) {
      return
    }

    if (!('serviceWorker' in navigator)) {
      return
    }

    const serwist = new Serwist('/sw.js', { scope: '/', type: 'module' })

    void serwist.register().catch((error: unknown) => {
      console.error('Service worker registration failed:', error)
    })
  }, [])

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body
        className="font-sans antialiased wrap-anywhere"
        suppressHydrationWarning
      >
        <IntlProvider
          locale={(locale ?? defaultLocale) as Locale}
          messages={messages[locale ?? defaultLocale]}
          timeZone="UTC"
        >
          <PageTitleSetter />
          <QueryClientProvider client={getQueryClient()}>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <TooltipProvider>
                {children}
                <Toaster />
              </TooltipProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </IntlProvider>
        <ClientOnly fallback={null}>
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
              {
                name: 'Tanstack Query',
                render: <ReactQueryDevtoolsPanel />,
              },
            ]}
          />
        </ClientOnly>
        <Scripts />
      </body>
    </html>
  )
}
