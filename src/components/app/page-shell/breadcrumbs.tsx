import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronsRight, Home } from 'lucide-react'
import { Fragment } from 'react'
import { useTranslations } from 'use-intl'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '#/components/ui/breadcrumb'
import { Button } from '#/components/ui/button'

export function Breadcrumbs() {
  const matches = useRouterState({ select: (s) => s.matches })
  const t = useTranslations('breadcrumb')

  const crumbs = matches.filter(
    (m) =>
      m.routeId !== '__root__' &&
      (m.context as unknown as Record<string, unknown>)?.breadcrumb,
  )

  if (crumbs.length === 0) return null

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Button size="sm" className="size-7" variant="ghost" asChild>
              <Link to="/">
                <Home className="h-4 w-4" />
              </Link>
            </Button>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {crumbs.map((crumb, i) => {
          const label = (crumb.context as unknown as Record<string, unknown>)
            ?.breadcrumb as string
          return (
            <Fragment key={crumb.routeId}>
              <BreadcrumbSeparator>
                <ChevronsRight />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {i === crumbs.length - 1 ? (
                  <BreadcrumbPage>{t(label)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.pathname}>{t(label)}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
