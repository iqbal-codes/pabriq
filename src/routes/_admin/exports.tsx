import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { useLocale, useTranslations } from 'use-intl'
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
  useAdminExports,
  useExecuteOrganizationExport,
  useExportDownloadUrl,
} from '#/features/admin/hooks'
import { formatLongDate, formatNumber } from '#/lib/formatters'

export const Route = createFileRoute('/_admin/exports')({
  component: ExportsPage,
})

function getExportStatusBadgeVariant(
  status: string,
): 'success' | 'warning' | 'secondary' {
  switch (status) {
    case 'completed':
      return 'success'
    case 'pending':
      return 'warning'
    default:
      return 'secondary'
  }
}

export default function ExportsPage() {
  const t = useTranslations('admin')
  const locale = useLocale()
  const { data: exports, isLoading } = useAdminExports()
  const downloadMutation = useExportDownloadUrl()
  const executeMutation = useExecuteOrganizationExport()

  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [orgIdInput, setOrgIdInput] = useState('')

  const handleDownload = async (exportId: string) => {
    setDownloadingId(exportId)
    try {
      const result = await downloadMutation.mutateAsync({ exportId })
      if (result.ok) {
        window.open(result.data.url, '_blank')
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('Failed to get download URL')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleExecuteExport = async () => {
    if (!orgIdInput.trim()) return
    try {
      const result = await executeMutation.mutateAsync({
        orgId: orgIdInput.trim(),
      })
      if (result.ok) {
        toast.success(t('exportCompleted'))
        setDialogOpen(false)
        setOrgIdInput('')
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('Failed to execute export')
    }
  }
  return (
    <PageContent>
      <PageHeader title={t('exports')}>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>{t('executeExport')}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('executeExport')}</DialogTitle>
              <DialogDescription>{t('exportDataDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="export-org-id">{t('orgName')} ID</Label>
                <Input
                  id="export-org-id"
                  placeholder="org_..."
                  value={orgIdInput}
                  onChange={(e) => setOrgIdInput(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button
                onClick={handleExecuteExport}
                disabled={!orgIdInput.trim() || executeMutation.isPending}
              >
                {t('executeExport')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => i).map((id) => (
                <Skeleton key={id} className="h-12 w-full" />
              ))}
            </div>
          ) : exports && exports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('orgName')}</TableHead>
                  <TableHead>{t('exportStatus')}</TableHead>
                  <TableHead>{t('exportFormat')}</TableHead>
                  <TableHead>{t('exportSize')}</TableHead>
                  <TableHead>{t('created')}</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {exports.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell>
                      <div className="font-medium">{exp.orgName}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getExportStatusBadgeVariant(exp.status)}>
                        {exp.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="uppercase">{exp.format}</TableCell>
                    <TableCell>
                      {exp.fileSizeBytes != null
                        ? `${formatNumber(exp.fileSizeBytes, locale)} bytes`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatLongDate(exp.createdAt, locale)}
                    </TableCell>
                    <TableCell className="text-right">
                      {exp.status === 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={downloadingId === exp.id}
                          onClick={() => handleDownload(exp.id)}
                        >
                          {t('downloadExport')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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
