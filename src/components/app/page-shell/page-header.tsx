import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { PageActions } from './page-actions'
import type { PageAction } from './page-shell-types'

type PageHeaderProps = {
  title: string
  description?: string
  backAction?: PageAction
  primaryAction?: PageAction
  secondaryActions?: PageAction[]
  className?: string
}

export function PageHeader({
  title,
  description,
  backAction,
  primaryAction,
  secondaryActions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'hidden md:flex md:items-center md:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        {backAction?.href ? (
          <Button variant="ghost" size="icon-sm" asChild>
            <Link to={backAction.href} aria-label={backAction.label}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
        ) : backAction?.onClick ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={backAction.onClick}
            aria-label={backAction.label}
          >
            <ArrowLeft className="size-4" />
          </Button>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <PageActions
        primaryAction={primaryAction}
        secondaryActions={secondaryActions}
      />
    </div>
  )
}
