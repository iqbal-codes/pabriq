import { useEffect, useState } from 'react'
import { useTranslations } from 'use-intl'
import { cn } from '#/lib/utils'
import type { PortalOrder } from '../model'
import { PortalHeader } from './portal-header'

type PortalShellProps = {
  order: Pick<PortalOrder, 'orgLogoAssetId' | 'orderNumber'>
  children: React.ReactNode
  footer?: React.ReactNode
  contentClassName?: string
}

export function PortalShell({
  order,
  children,
  footer,
  contentClassName,
}: PortalShellProps) {
  const t = useTranslations('portal')
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a
        href="#portal-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-primary focus-visible:px-3 focus-visible:py-1.5 focus-visible:text-primary-foreground focus-visible:shadow"
      >
        {t('skipToContent')}
      </a>

      <PortalHeader
        orgLogoAssetId={order.orgLogoAssetId}
        orderNumber={order.orderNumber}
        elevated={scrolled}
      />

      <main
        id="portal-content"
        className={cn(
          'mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8',
          contentClassName,
        )}
      >
        {children}
      </main>

      {footer ? (
        <div className="sticky bottom-0 z-10 border-t border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">
            {footer}
          </div>
        </div>
      ) : null}
    </div>
  )
}
