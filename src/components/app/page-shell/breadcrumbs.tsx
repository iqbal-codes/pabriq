import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronsRight } from 'lucide-react'
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

type BreadcrumbParent = {
  label: string
  href: string
}

type BreadcrumbEntry = BreadcrumbParent & {
  routeId: string
}

export function Breadcrumbs() {
  const matches = useRouterState({ select: (s) => s.matches })
  const t = useTranslations('breadcrumb')

  const routeCrumbs = matches.filter(
    (m) =>
      m.routeId !== '__root__' &&
      (m.context as unknown as Record<string, unknown>)?.breadcrumb,
  )

  const crumbs = routeCrumbs.flatMap((crumb): BreadcrumbEntry[] => {
    const context = crumb.context as unknown as Record<string, unknown>
    const parents = (context.parentBreadcrumbs ?? []) as BreadcrumbParent[]
    const label = context.breadcrumb as string

    return [
      ...parents.map((parent, i) => ({
        ...parent,
        routeId: `${crumb.routeId}-parent-${i}`,
      })),
      {
        label,
        href: crumb.pathname,
        routeId: crumb.routeId,
      },
    ]
  })

  if (crumbs.length === 0) return null

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => {
          return (
            <Fragment key={crumb.routeId}>
              {i > 0 && (
                <BreadcrumbSeparator>
                  <ChevronsRight />
                </BreadcrumbSeparator>
              )}
              <BreadcrumbItem>
                {i === crumbs.length - 1 ? (
                  <BreadcrumbPage>{t(crumb.label)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.href}>{t(crumb.label)}</Link>
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
