import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/ui/native-select'
import { Switch } from '#/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  createPaymentMethodFn,
  deletePaymentMethodFn,
  listPaymentMethodsFn,
  updatePaymentMethodFn,
} from '#/features/invoices/server'
import { queryKeys } from '#/lib/query-keys'

export function PaymentMethodsPage() {
  const t = useTranslations('invoices')
  const st = useTranslations('settings')
  const ct = useTranslations('common')
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    type: 'bank_transfer',
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    instructions: '',
    isDefault: false,
    active: true,
  })

  const { data: methods } = useSuspenseQuery({
    queryKey: queryKeys.invoices.paymentMethods(),
    queryFn: () => listPaymentMethodsFn({ data: {} }),
  })

  const createMutation = useMutation({
    mutationFn: (input: typeof form) =>
      createPaymentMethodFn({
        data: {
          orgId: '',
          ...input,
          bankName: input.bankName || null,
          accountNumber: input.accountNumber || null,
          accountHolder: input.accountHolder || null,
          instructions: input.instructions || null,
        },
      }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(st('saved'))
        queryClient.invalidateQueries({
          queryKey: queryKeys.invoices.paymentMethods(),
        })
        setDialogOpen(false)
        resetForm()
      } else {
        toast.error(res.error ?? 'Failed')
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: { id: string } & typeof form) =>
      updatePaymentMethodFn({
        data: {
          id: input.id,
          name: input.name,
          type: input.type,
          bankName: input.bankName || null,
          accountNumber: input.accountNumber || null,
          accountHolder: input.accountHolder || null,
          instructions: input.instructions || null,
          isDefault: input.isDefault,
          active: input.active,
        },
      }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(st('saved'))
        queryClient.invalidateQueries({
          queryKey: queryKeys.invoices.paymentMethods(),
        })
        setDialogOpen(false)
        resetForm()
      } else {
        toast.error(res.error ?? 'Failed')
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePaymentMethodFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.paymentMethods(),
      })
      toast.success(st('saved'))
    },
  })

  function resetForm() {
    setForm({
      name: '',
      type: 'bank_transfer',
      bankName: '',
      accountNumber: '',
      accountHolder: '',
      instructions: '',
      isDefault: false,
      active: true,
    })
    setEditingId(null)
  }

  function openEdit(method: (typeof methods)[0]) {
    setEditingId(method.id)
    setForm({
      name: method.name,
      type: method.type,
      bankName: method.bankName ?? '',
      accountNumber: method.accountNumber ?? '',
      accountHolder: method.accountHolder ?? '',
      instructions: method.instructions ?? '',
      isDefault: method.isDefault,
      active: method.active,
    })
    setDialogOpen(true)
  }

  function handleSubmit() {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form })
    } else {
      createMutation.mutate(form)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{st('paymentMethods')}</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              {t('createInvoice')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Edit' : 'Add'} {st('paymentMethods')}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div>
                <Label>{t('paymentMethod')}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. BCA Transfer"
                />
              </div>
              <div>
                <Label>Type</Label>
                <NativeSelect
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="payment_gateway">Payment Gateway</option>
                </NativeSelect>
              </div>
              <div>
                <Label>Bank Name</Label>
                <Input
                  value={form.bankName}
                  onChange={(e) =>
                    setForm({ ...form, bankName: e.target.value })
                  }
                  placeholder="e.g. BCA"
                />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input
                  value={form.accountNumber}
                  onChange={(e) =>
                    setForm({ ...form, accountNumber: e.target.value })
                  }
                  placeholder="e.g. 1234567890"
                />
              </div>
              <div>
                <Label>Account Holder</Label>
                <Input
                  value={form.accountHolder}
                  onChange={(e) =>
                    setForm({ ...form, accountHolder: e.target.value })
                  }
                  placeholder="e.g. PT Pabriq"
                />
              </div>
              <div>
                <Label>Instructions</Label>
                <Input
                  value={form.instructions}
                  onChange={(e) =>
                    setForm({ ...form, instructions: e.target.value })
                  }
                  placeholder="Additional payment instructions"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isDefault}
                  onCheckedChange={(v) => setForm({ ...form, isDefault: v })}
                />
                <Label>Default</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm({ ...form, active: v })}
                />
                <Label>{st('general')}</Label>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {ct('confirm')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('paymentMethod')}</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{ct('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {methods.map((method) => (
                <TableRow key={method.id}>
                  <TableCell className="font-medium">{method.name}</TableCell>
                  <TableCell>{method.type}</TableCell>
                  <TableCell>{method.bankName ?? '—'}</TableCell>
                  <TableCell>
                    {method.accountNumber
                      ? `${method.accountNumber} (${method.accountHolder ?? ''})`
                      : '—'}
                  </TableCell>
                  <TableCell>{method.isDefault ? 'Yes' : '—'}</TableCell>
                  <TableCell>{method.active ? 'Active' : 'Inactive'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(method)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => deleteMutation.mutate(method.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
