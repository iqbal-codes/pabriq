import {
  AlertCircle,
  RefreshCw,
  Search,
  Shield,
  UserCheck,
  UserX,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { useChannelAccesses } from '#/features/channels/hooks'

export type ChannelAccessRowData = {
  id: string
  displayName: string
  username?: string | null
  telegramUserId: string | number
  status: 'pending' | 'approved' | 'revoked' | string
  createdAt?: Date | string | null
  approvedAt?: Date | string | null
  revokedAt?: Date | string | null
}

interface AccessIdentitiesCardProps {
  onActionClick: (
    kind: 'approve' | 'revoke' | 'decline',
    access: ChannelAccessRowData,
  ) => void
}

function formatDate(val?: Date | string | null): string {
  if (!val) return ''
  const d = typeof val === 'string' ? new Date(val) : val
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function AccessIdentitiesCard({
  onActionClick,
}: AccessIdentitiesCardProps) {
  const t = useTranslations('channels')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'approved' | 'revoked'
  >('all')
  const [searchQuery, setSearchQuery] = useState('')

  const {
    data: accessesData,
    isLoading,
    isError,
    error,
    refetch,
  } = useChannelAccesses()

  const accesses: ChannelAccessRowData[] = useMemo(() => {
    if (!Array.isArray(accessesData)) return []
    return accessesData as ChannelAccessRowData[]
  }, [accessesData])

  const filteredAccesses = useMemo(() => {
    return accesses.filter((acc) => {
      const matchesStatus =
        statusFilter === 'all' || acc.status === statusFilter
      const q = searchQuery.toLowerCase().trim()
      const matchesQuery =
        !q ||
        acc.displayName.toLowerCase().includes(q) ||
        acc.username?.toLowerCase().includes(q) ||
        String(acc.telegramUserId).toLowerCase().includes(q)
      return matchesStatus && matchesQuery
    })
  }, [accesses, statusFilter, searchQuery])

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">
              {t('access')}
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('accessDescription')}
            </p>
          </div>
          {/* Status Filter Buttons */}
          <div className="flex flex-wrap gap-1">
            {(['all', 'pending', 'approved', 'revoked'] as const).map((st) => (
              <Button
                key={st}
                variant={statusFilter === st ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2.5 text-xs capitalize"
                onClick={() => setStatusFilter(st)}
              >
                {t(`status.${st}`)}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('table.searchPlaceholder')}
            className="h-9 pl-9 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="space-y-2 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isError ? (
          <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>
                {error instanceof Error ? error.message : t('error.loadFailed')}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => refetch()}
            >
              <RefreshCw className="mr-1 size-3" />
              {t('actions.cancel')}
            </Button>
          </div>
        ) : filteredAccesses.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
            <Shield className="size-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium">{t('empty')}</p>
          </div>
        ) : (
          <>
            {/* Desktop View Table */}
            <div className="hidden rounded-md border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.identity')}</TableHead>
                    <TableHead>{t('table.telegramId')}</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                    <TableHead>{t('table.lifecycle')}</TableHead>
                    <TableHead className="text-right">
                      {t('table.actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccesses.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell className="font-medium">
                        <div>
                          <span>{acc.displayName}</span>
                          {acc.username ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              (@{acc.username})
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {acc.telegramUserId}
                      </TableCell>
                      <TableCell>
                        {acc.status === 'approved' ? (
                          <Badge variant="success" className="capitalize">
                            {t('status.approved')}
                          </Badge>
                        ) : acc.status === 'revoked' ? (
                          <Badge variant="destructive" className="capitalize">
                            {t('status.revoked')}
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="capitalize">
                            {t('status.pending')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {acc.status === 'approved' && acc.approvedAt
                          ? t('lifecycle.approved', {
                              date: formatDate(acc.approvedAt),
                            })
                          : acc.status === 'revoked' && acc.revokedAt
                            ? t('lifecycle.revoked', {
                                date: formatDate(acc.revokedAt),
                              })
                            : t('lifecycle.requested', {
                                date: formatDate(acc.createdAt),
                              })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          {acc.status === 'pending' ? (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                className="h-7 px-2.5 text-xs"
                                onClick={() => onActionClick('approve', acc)}
                              >
                                <UserCheck className="mr-1 size-3" />
                                {t('actions.approve')}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs text-destructive hover:bg-destructive/10"
                                onClick={() => onActionClick('decline', acc)}
                              >
                                <UserX className="mr-1 size-3" />
                                {t('actions.decline')}
                              </Button>
                            </>
                          ) : acc.status === 'approved' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2.5 text-xs text-destructive hover:bg-destructive/10"
                              onClick={() => onActionClick('revoke', acc)}
                            >
                              <UserX className="mr-1 size-3" />
                              {t('actions.revoke')}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2.5 text-xs"
                              onClick={() => onActionClick('approve', acc)}
                            >
                              <UserCheck className="mr-1 size-3" />
                              {t('actions.reapprove')}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile View Cards */}
            <div className="space-y-3 md:hidden">
              {filteredAccesses.map((acc) => (
                <div
                  key={acc.id}
                  className="flex flex-col justify-between space-y-2 rounded-lg border bg-card p-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">
                        {acc.displayName}
                      </p>
                      {acc.username ? (
                        <p className="text-muted-foreground">@{acc.username}</p>
                      ) : null}
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        ID: {acc.telegramUserId}
                      </p>
                    </div>
                    {acc.status === 'approved' ? (
                      <Badge variant="success" className="capitalize">
                        {t('status.approved')}
                      </Badge>
                    ) : acc.status === 'revoked' ? (
                      <Badge variant="destructive" className="capitalize">
                        {t('status.revoked')}
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="capitalize">
                        {t('status.pending')}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
                    <span className="text-[11px] text-muted-foreground">
                      {acc.status === 'approved' && acc.approvedAt
                        ? t('lifecycle.approved', {
                            date: formatDate(acc.approvedAt),
                          })
                        : acc.status === 'revoked' && acc.revokedAt
                          ? t('lifecycle.revoked', {
                              date: formatDate(acc.revokedAt),
                            })
                          : t('lifecycle.requested', {
                              date: formatDate(acc.createdAt),
                            })}
                    </span>
                    <div className="flex gap-1.5">
                      {acc.status === 'pending' ? (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => onActionClick('approve', acc)}
                          >
                            {t('actions.approve')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive"
                            onClick={() => onActionClick('decline', acc)}
                          >
                            {t('actions.decline')}
                          </Button>
                        </>
                      ) : acc.status === 'approved' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive"
                          onClick={() => onActionClick('revoke', acc)}
                        >
                          {t('actions.revoke')}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => onActionClick('approve', acc)}
                        >
                          {t('actions.reapprove')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
