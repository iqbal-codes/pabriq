import { Edit2, Package, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  useDeleteMaterialMutation,
  useMaterials,
  useSaveMaterialMutation,
} from '#/features/materials/hooks'
import type { Material } from '#/features/materials/model'

export default function MaterialsPage(): React.JSX.Element {
  const { data: materials = [] } = useMaterials()
  const saveMutation = useSaveMaterialMutation()
  const deleteMutation = useDeleteMaterialMutation()

  const [isOpen, setIsOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)

  const [name, setName] = useState('')
  const [unit, setUnit] = useState('pcs')
  const [supplier, setSupplier] = useState('')
  const [referenceData, setReferenceData] = useState('')
  const [estimatedQuantity, setEstimatedQuantity] = useState<string>('')
  const [wasteAllowance, setWasteAllowance] = useState<string>('')

  function handleOpenCreate() {
    setEditingMaterial(null)
    setName('')
    setUnit('pcs')
    setSupplier('')
    setReferenceData('')
    setEstimatedQuantity('')
    setWasteAllowance('')
    setIsOpen(true)
  }

  function handleOpenEdit(m: Material) {
    setEditingMaterial(m)
    setName(m.name)
    setUnit(m.unit)
    setSupplier(m.supplier ?? '')
    setReferenceData(m.referenceData ?? '')
    setEstimatedQuantity(
      m.estimatedQuantity !== null && m.estimatedQuantity !== undefined
        ? String(m.estimatedQuantity)
        : '',
    )
    setWasteAllowance(
      m.wasteAllowance !== null && m.wasteAllowance !== undefined
        ? String(m.wasteAllowance)
        : '',
    )
    setIsOpen(true)
  }

  async function handleSave() {
    if (!name.trim() || !unit.trim()) return

    await saveMutation.mutateAsync({
      key: editingMaterial?.key,
      name: name.trim(),
      unit: unit.trim(),
      supplier: supplier.trim() || null,
      referenceData: referenceData.trim() || null,
      estimatedQuantity: estimatedQuantity
        ? Number.parseFloat(estimatedQuantity)
        : null,
      wasteAllowance: wasteAllowance ? Number.parseFloat(wasteAllowance) : null,
    })

    setIsOpen(false)
  }

  async function handleDelete(key: string) {
    if (confirm('Are you sure you want to delete this material?')) {
      await deleteMutation.mutateAsync(key)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Materials</h1>
          <p className="text-sm text-muted-foreground">
            Define raw materials, units, supplier references, and waste
            allowances for production.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="size-4" /> Add Material
        </Button>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Supplier / Ref</TableHead>
              <TableHead>Est. Qty</TableHead>
              <TableHead>Waste Allowance</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <Package className="size-8 text-muted-foreground/50" />
                    <span>
                      No materials defined yet. Click "Add Material" to create
                      one.
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              materials.map((m) => (
                <TableRow key={m.key}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {m.key}
                  </TableCell>
                  <TableCell>{m.unit}</TableCell>
                  <TableCell>
                    {m.supplier || m.referenceData ? (
                      <span className="text-sm">
                        {m.supplier}{' '}
                        {m.referenceData ? `(${m.referenceData})` : ''}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>{m.estimatedQuantity ?? '—'}</TableCell>
                  <TableCell>
                    {m.wasteAllowance !== null && m.wasteAllowance !== undefined
                      ? `${m.wasteAllowance * 100}%`
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(m)}
                      >
                        <Edit2 className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(m.key)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingMaterial ? 'Edit Material' : 'Add Material'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Material Name</Label>
              <Input
                id="name"
                placeholder="e.g. PVC Resin, Plastisol Ink"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unit">Unit of Measure</Label>
              <Input
                id="unit"
                placeholder="e.g. kg, sheets, meters, pcs"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="supplier">Supplier / Reference Data</Label>
              <Input
                id="supplier"
                placeholder="e.g. Supplier Name or SKU Ref"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="estimatedQuantity">
                Estimated Default Quantity
              </Label>
              <Input
                id="estimatedQuantity"
                type="number"
                step="any"
                placeholder="e.g. 1"
                value={estimatedQuantity}
                onChange={(e) => setEstimatedQuantity(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wasteAllowance">
                Waste Allowance (fraction, e.g. 0.05 = 5%)
              </Label>
              <Input
                id="wasteAllowance"
                type="number"
                step="0.01"
                placeholder="e.g. 0.05"
                value={wasteAllowance}
                onChange={(e) => setWasteAllowance(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              Save Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export { MaterialsPage }
