import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { useLocale, useTranslations } from 'use-intl'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'
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
import { Label } from '#/components/ui/label'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  useCreateRetentionPolicy,
  useDeleteRetentionPolicy,
  useRetentionPolicies,
  useUpdateRetentionPolicy,
} from '#/features/admin/hooks'
import { formatLongDate } from '#/lib/formatters'

export const Route = createFileRoute('/_admin/retention-policies')({
  component: RetentionPoliciesPage,
})

export default function RetentionPoliciesPage() {
  const t = useTranslations('admin')
  const locale = useLocale()
  const { data: policies, isLoading } = useRetentionPolicies()
  const createPolicy = useCreateRetentionPolicy()
  const updatePolicy = useUpdateRetentionPolicy()
  const deletePolicy = useDeleteRetentionPolicy()

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [targetTable, setTargetTable] = useState('')
  const [retentionDays, setRetentionDays] = useState(30)
  const [enabled, setEnabled] = useState(true)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDays, setEditDays] = useState<number>(30)
  const [editEnabled, setEditEnabled] = useState<boolean>(true)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetTable.trim()) return

    try {
      await createPolicy.mutateAsync({
        targetTable: targetTable.trim(),
        retentionDays: Number(retentionDays),
        enabled,
      })
      toast.success(t('policyCreated'))
      setShowCreateDialog(false)
      setTargetTable('')
      setRetentionDays(30)
      setEnabled(true)
    } catch (err) {
      toast.error((err as Error).message || 'Failed to create policy')
    }
  }

  const handleStartEdit = (policy: {
    id: string
    retentionDays: number
    enabled: boolean
  }) => {
    setEditingId(policy.id)
    setEditDays(policy.retentionDays)
    setEditEnabled(policy.enabled)
  }

  const handleSaveEdit = async (id: string) => {
    try {
      await updatePolicy.mutateAsync({
        id,
        retentionDays: Number(editDays),
        enabled: editEnabled,
      })
      toast.success(t('policyUpdated'))
      setEditingId(null)
    } catch (err) {
      toast.error((err as Error).message || 'Failed to update policy')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deletePolicy.mutateAsync({ id })
      toast.success(t('policyDeleted'))
      setDeletingId(null)
    } catch (err) {
      toast.error((err as Error).message || 'Failed to delete policy')
    }
  }

  return (
    <PageContent>
      <PageHeader title={t('retentionPolicies')}>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>{t('createPolicy')}</Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>{t('createPolicy')}</DialogTitle>
                <DialogDescription>{t('createPolicyDesc')}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="targetTable">{t('targetTable')}</Label>
                  <Input
                    id="targetTable"
                    value={targetTable}
                    onChange={(e) => setTargetTable(e.target.value)}
                    placeholder="e.g. audit_logs"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="retentionDays">{t('retentionDays')}</Label>
                  <Input
                    id="retentionDays"
                    type="number"
                    min={1}
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox
                    id="enabled"
                    checked={enabled}
                    onCheckedChange={(checked) => setEnabled(Boolean(checked))}
                  />
                  <Label htmlFor="enabled" className="cursor-pointer">
                    {t('enabled')}
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={createPolicy.isPending}>
                  {t('confirm')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, i) => i).map((id) => (
                <Skeleton key={id} className="h-12 w-full" />
              ))}
            </div>
          ) : policies && policies.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('targetTable')}</TableHead>
                  <TableHead>{t('retentionDays')}</TableHead>
                  <TableHead>{t('enabled')}</TableHead>
                  <TableHead>{t('orgName')}</TableHead>
                  <TableHead>{t('created')}</TableHead>
                  <TableHead>{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((policy) => {
                  const isEditing = editingId === policy.id
                  return (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium font-mono text-xs">
                        {policy.targetTable}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            min={1}
                            value={editDays}
                            onChange={(e) =>
                              setEditDays(Number(e.target.value))
                            }
                            className="w-24"
                          />
                        ) : (
                          policy.retentionDays
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={editEnabled}
                              onCheckedChange={(checked) =>
                                setEditEnabled(Boolean(checked))
                              }
                            />
                            <span className="text-xs">
                              {editEnabled ? t('enabled') : t('disabled')}
                            </span>
                          </div>
                        ) : (
                          <Badge
                            variant={policy.enabled ? 'success' : 'secondary'}
                          >
                            {policy.enabled ? t('enabled') : t('disabled')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{policy.orgName || 'Global'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatLongDate(policy.createdAt, locale)}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(policy.id)}
                              disabled={updatePolicy.isPending}
                            >
                              {t('confirm')}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                            >
                              {t('cancel')}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStartEdit(policy)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeletingId(policy.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        )}

                        <Dialog
                          open={deletingId === policy.id}
                          onOpenChange={(open) => !open && setDeletingId(null)}
                        >
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{t('deletePolicy')}</DialogTitle>
                              <DialogDescription>
                                {t('deletePolicyDesc')}
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setDeletingId(null)}
                              >
                                {t('cancel')}
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleDelete(policy.id)}
                                disabled={deletePolicy.isPending}
                              >
                                {t('confirm')}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              {t('noData')}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContent>
  )
}
