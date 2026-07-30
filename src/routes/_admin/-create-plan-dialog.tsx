import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { useCreatePlan } from '#/features/admin/hooks'

export function CreatePlanDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations('admin')
  const createPlanMutation = useCreatePlan()

  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [monthlyPrice, setMonthlyPrice] = useState(0)
  const [annualPrice, setAnnualPrice] = useState(0)

  const handleSubmit = async () => {
    const result = await createPlanMutation.mutateAsync({
      slug,
      name,
      version: 1,
      description: description || undefined,
      entitlements: {
        maxOrders: null,
        maxProducts: null,
        maxCustomers: null,
        maxMembers: null,
        maxStorageBytes: null,
        features: [],
        warningThresholds: {},
      },
      monthlyPriceCents: monthlyPrice,
      annualPriceCents: annualPrice,
    })
    if (result.ok) {
      toast.success(t('planCreated'))
      onClose()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t('createPlan')}</DialogTitle>
        <DialogDescription>{t('createPlanDesc')}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>{t('planSlug')}</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
        </div>
        <div>
          <Label>{t('planName')}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>{t('description')}</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t('monthlyPriceCents')}</Label>
            <Input
              type="number"
              value={monthlyPrice}
              onChange={(e) => setMonthlyPrice(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>{t('annualPriceCents')}</Label>
            <Input
              type="number"
              value={annualPrice}
              onChange={(e) => setAnnualPrice(Number(e.target.value))}
            />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            !slug.trim() || !name.trim() || createPlanMutation.isPending
          }
        >
          {t('create')}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
