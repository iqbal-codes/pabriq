import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
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
import { Textarea } from '#/components/ui/textarea'
import { orgStatusBadgeVariant } from '#/features/admin/badge-variants'
import {
  useCreateOrganizationExport,
  useOrganizations,
  useRestoreOrganization,
  useSuspendOrganization,
} from '#/features/admin/hooks'

export const Route = createFileRoute('/_admin/organizations')({
  component: OrganizationsPage,
})

function OrganizationsPage() {
  const t = useTranslations('admin')
  const [search, setSearch] = useState('')
  const { data: orgs, isLoading } = useOrganizations(search || undefined)

  return (
    <PageContent>
      <PageHeader title={t('organizations')} />
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <Input
              placeholder={t('searchOrgs')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => i).map((id) => (
                <Skeleton key={id} className="h-12 w-full" />
              ))}
            </div>
          ) : orgs && orgs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('orgName')}</TableHead>
                  <TableHead>{t('members')}</TableHead>
                  <TableHead>{t('subscription')}</TableHead>
                  <TableHead>{t('plan')}</TableHead>
                  <TableHead>{t('orders')}</TableHead>
                  <TableHead>{t('unpaidInvoices')}</TableHead>
                  <TableHead>{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{org.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {org.slug}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{org.memberCount}</TableCell>
                    <TableCell>
                      <Badge
                        variant={orgStatusBadgeVariant(org.subscriptionStatus)}
                      >
                        {org.subscriptionStatus ?? '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>{org.planName ?? '-'}</TableCell>
                    <TableCell>{org.orderCount}</TableCell>
                    <TableCell>{org.invoiceUnpaidCount}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {org.subscriptionStatus !== 'suspended' ? (
                          <SuspendOrgDialog org={org} />
                        ) : (
                          <RestoreOrgDialog org={org} />
                        )}
                        <ExportOrgDialog org={org} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              {t('noOrgs')}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContent>
  )
}

function SuspendOrgDialog({ org }: { org: { id: string; name: string } }) {
  const t = useTranslations('admin')
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const suspendMutation = useSuspendOrganization()

  const handleSuspend = async () => {
    if (!reason.trim()) return
    const result = await suspendMutation.mutateAsync({
      orgId: org.id,
      reason: reason.trim(),
    })
    if (result.ok) {
      toast.success(t('orgSuspended'))
      setOpen(false)
      setReason('')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setReason('')
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          {t('suspend')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('suspendOrg')}</DialogTitle>
          <DialogDescription>
            {t('suspendOrgDesc', { name: org.name })}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('reasonPlaceholder')}
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false)
              setReason('')
            }}
          >
            {t('cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleSuspend}
            disabled={!reason.trim() || suspendMutation.isPending}
          >
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RestoreOrgDialog({ org }: { org: { id: string; name: string } }) {
  const t = useTranslations('admin')
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const restoreMutation = useRestoreOrganization()

  const handleRestore = async () => {
    if (!reason.trim()) return
    const result = await restoreMutation.mutateAsync({
      orgId: org.id,
      reason: reason.trim(),
    })
    if (result.ok) {
      toast.success(t('orgRestored'))
      setOpen(false)
      setReason('')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setReason('')
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t('restore')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('restoreOrg')}</DialogTitle>
          <DialogDescription>
            {t('restoreOrgDesc', { name: org.name })}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('reasonPlaceholder')}
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false)
              setReason('')
            }}
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handleRestore}
            disabled={!reason.trim() || restoreMutation.isPending}
          >
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ExportOrgDialog({ org }: { org: { id: string; name: string } }) {
  const t = useTranslations('admin')
  const [open, setOpen] = useState(false)
  const exportMutation = useCreateOrganizationExport()

  const handleExport = async () => {
    const result = await exportMutation.mutateAsync({ orgId: org.id })
    if (result.ok) {
      toast.success(t('exportInitiated'))
      setOpen(false)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          {t('export')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('exportOrg')}</DialogTitle>
          <DialogDescription>
            {t('exportOrgDesc', { name: org.name })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleExport} disabled={exportMutation.isPending}>
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
