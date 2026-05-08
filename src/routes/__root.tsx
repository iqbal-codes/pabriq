import { TanStackDevtools } from '@tanstack/react-devtools'
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  ClientOnly,
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router'
import { IntlProvider, useTranslations } from 'use-intl'
import { Toaster } from '#/components/ui/sonner'
import { ThemeProvider } from '#/components/ui/theme-provider'
import { TooltipProvider } from '#/components/ui/tooltip'
import { getCurrentLocale } from '#/lib/i18n.utils'
import { getQueryClient } from '#/lib/query-client'
import { messages } from '#/messages'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import appCss from '../styles.css?url'

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
    ],
  }),
  shellComponent: RootDocument,
  component: () => (
    <NuqsAdapter>
      <Outlet />
    </NuqsAdapter>
  ),
})

function TitleSetter() {
  const t = useTranslations('app')
  return <title>{t('title')}</title>
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const locale = getCurrentLocale()

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
          locale={locale}
          messages={messages[locale ?? 'en']}
          timeZone="UTC"
        >
          <TitleSetter />
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
              TanStackQueryDevtools,
            ]}
          />
        </ClientOnly>
        <Scripts />
      </body>
    </html>
  )
}
