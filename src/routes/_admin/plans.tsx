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
import { Textarea } from '#/components/ui/textarea'
import {
  useAdminSubscriptions,
  useCreatePlan,
  usePlans,
} from '#/features/admin/hooks'
import { formatLongDate, formatNumber } from '#/lib/formatters'

export const Route = createFileRoute('/_admin/plans')({
  component: PlansPage,
})

function PlansPage() {
  const t = useTranslations('admin')
  const locale = useLocale()
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const { data: plans, isLoading } = usePlans()
  const { data: subscriptions } = useAdminSubscriptions()

  return (
    <PageContent>
      <PageHeader title={t('plans')}>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>{t('createPlan')}</Button>
          </DialogTrigger>
          <CreatePlanDialog onClose={() => setShowCreateDialog(false)} />
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
          ) : plans && plans.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('planName')}</TableHead>
                  <TableHead>{t('version')}</TableHead>
                  <TableHead>{t('subscribers')}</TableHead>
                  <TableHead>{t('monthlyPrice')}</TableHead>
                  <TableHead>{t('annualPrice')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('created')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{plan.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {plan.slug}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>v{plan.version}</TableCell>
                    <TableCell>{plan.subscriberCount}</TableCell>
                    <TableCell>
                      Rp {formatNumber(plan.monthlyPriceCents, locale)}
                    </TableCell>
                    <TableCell>
                      Rp {formatNumber(plan.annualPriceCents, locale)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={plan.active ? 'success' : 'secondary'}>
                        {plan.active ? t('active') : t('inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatLongDate(plan.createdAt.toISOString(), locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              {t('noPlans')}
            </div>
          )}
        </CardContent>
      </Card>

      <PageHeader title={t('subscriptions')} className="mt-8" />
      <Card>
        <CardContent className="pt-6">
          {subscriptions && subscriptions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('orgName')}</TableHead>
                  <TableHead>{t('plan')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('billingCadence')}</TableHead>
                  <TableHead>{t('trialEnds')}</TableHead>
                  <TableHead>{t('periodEnds')}</TableHead>
                  <TableHead>{t('created')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{sub.orgName}</div>
                        <div className="text-xs text-muted-foreground">
                          {sub.orgSlug}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {sub.planName} v{sub.planVersion}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sub.status === 'active' || sub.status === 'trialing'
                            ? 'success'
                            : sub.status === 'suspended' ||
                                sub.status === 'canceled'
                              ? 'destructive'
                              : 'warning'
                        }
                      >
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{sub.billingCadence}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sub.trialEndsAt
                        ? formatLongDate(sub.trialEndsAt, locale)
                        : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sub.currentPeriodEndsAt
                        ? formatLongDate(sub.currentPeriodEndsAt, locale)
                        : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatLongDate(sub.createdAt, locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              {t('noSubscriptions')}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContent>
  )
}

function CreatePlanDialog({ onClose }: { onClose: () => void }) {
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
