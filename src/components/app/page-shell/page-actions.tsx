import { Link } from '@tanstack/react-router'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import type { PageAction } from './page-shell-types'

type PageActionsProps = {
  primaryAction?: PageAction
  secondaryActions?: PageAction[]
}

export function PageActions({
  primaryAction,
  secondaryActions,
}: PageActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {primaryAction?.href ? (
        <Button asChild>
          <Link to={primaryAction.href}>{primaryAction.label}</Link>
        </Button>
      ) : primaryAction?.onClick ? (
        <Button
          onClick={primaryAction.onClick}
          isLoading={primaryAction.isLoading}
        >
          {primaryAction.label}
        </Button>
      ) : null}
      {secondaryActions && secondaryActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {secondaryActions.map((action) => (
              <DropdownMenuItem key={action.label}>
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
