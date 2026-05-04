import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { useStageMutations } from '../hooks'
import type { Stage } from '../model'
import { StageForm } from './stage-form'

type Props = {
  stages: Stage[]
  loading: boolean
}

export function StageList({ stages, loading }: Props) {
  const t = useTranslations('production')
  const ct = useTranslations('common')
  const { deleteStage, reorderStages } = useStageMutations()
  const [editStage, setEditStage] = useState<Stage | undefined>()
  const [showCreate, setShowCreate] = useState(false)

  async function handleMoveUp(index: number) {
    if (index === 0) return
    const ids = stages.map((s) => s.id)
    ;[ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]
    await reorderStages.mutateAsync({ stageIds: ids })
  }

  async function handleMoveDown(index: number) {
    if (index === stages.length - 1) return
    const ids = stages.map((s) => s.id)
    ;[ids[index], ids[index + 1]] = [ids[index + 1], ids[index]]
    await reorderStages.mutateAsync({ stageIds: ids })
  }

  async function handleDelete(stageId: string) {
    await deleteStage.mutateAsync({ id: stageId })
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">{ct('loading')}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}>{t('addStage')}</Button>
      </div>

      {stages.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {t('noTasks')}
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">{t('reorder')}</TableHead>
              <TableHead>{t('stageName')}</TableHead>
              <TableHead>{t('stageDescription')}</TableHead>
              <TableHead>{t('needApproval')}</TableHead>
              <TableHead>{t('requirements')}</TableHead>
              <TableHead>{t('active')}</TableHead>
              <TableHead className="w-32">{ct('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stages.map((stage, i) => (
              <TableRow key={stage.id}>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveUp(i)}
                      disabled={i === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveDown(i)}
                      disabled={i === stages.length - 1}
                    >
                      ↓
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{stage.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {stage.description}
                </TableCell>
                <TableCell>
                  {stage.needApproval ? '✓ ' : ''}
                  {stage.needApproval ? t('required') : t('optional')}
                </TableCell>
                <TableCell>
                  {(stage.requirements as Array<unknown>)?.length ?? 0}
                </TableCell>
                <TableCell>
                  {stage.active ? t('active') : t('inactive')}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditStage(stage)}
                    >
                      {t('editStage')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(stage.id)}
                    >
                      {t('deleteStage')}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <StageForm open={showCreate} onOpenChange={setShowCreate} />

      {editStage && (
        <StageForm
          stage={editStage}
          open={true}
          onOpenChange={() => setEditStage(undefined)}
        />
      )}
    </div>
  )
}
