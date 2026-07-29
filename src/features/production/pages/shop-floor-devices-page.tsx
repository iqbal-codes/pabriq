import { Copy, KeyRound, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  useShopFloorDeviceMutations,
  useShopFloorDevices,
  useStages,
} from '../hooks'
import type { ShopFloorDevice } from '../model'

export function ShopFloorDevicesPage() {
  const { data: devices, isLoading } = useShopFloorDevices()
  const { data: stages } = useStages()
  const { registerDevice, rotateToken, revokeDevice } =
    useShopFloorDeviceMutations()

  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [selectedStages, setSelectedStages] = useState<string[]>([])

  const [generatedToken, setGeneratedToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleRegister = async () => {
    if (!name) return
    const result = await registerDevice.mutateAsync({
      name,
      code: code || undefined,
      allowedStageIds: selectedStages,
    })
    setGeneratedToken(result.plainTextToken)
    setName('')
    setCode('')
    setSelectedStages([])
    setIsRegisterOpen(false)
  }

  const handleRotate = async (id: string) => {
    const result = await rotateToken.mutateAsync({ id })
    setGeneratedToken(result.plainTextToken)
  }

  const handleCopyToken = () => {
    if (!generatedToken) return
    void navigator.clipboard.writeText(generatedToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const stageMap = new Map((stages ?? []).map((s) => [s.id, s.name]))

  return (
    <PageContent>
      <PageHeader
        title="Shop-Floor Devices"
        description="Register, rotate, revoke, and constrain shop-floor device credentials."
        primaryAction={{
          label: 'Register Device',
          onClick: () => setIsRegisterOpen(true),
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Registered Devices</CardTitle>
          <CardDescription>
            Audit and control physical shop-floor terminal devices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading devices...
            </div>
          ) : !devices || devices.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No shop-floor devices registered yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Allowed Stages</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device: ShopFloorDevice) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-mono font-medium">
                      {device.code}
                    </TableCell>
                    <TableCell>{device.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          device.status === 'active' ? 'default' : 'secondary'
                        }
                      >
                        {device.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {device.allowedStageIds &&
                      device.allowedStageIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {device.allowedStageIds.map((sid: string) => (
                            <Badge
                              key={sid}
                              variant="outline"
                              className="text-xs"
                            >
                              {stageMap.get(sid) ?? sid}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          All Stages
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {device.lastActiveAt
                        ? new Date(device.lastActiveAt).toLocaleString()
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {device.status === 'active' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRotate(device.id)}
                            isLoading={rotateToken.isPending}
                          >
                            <KeyRound className="size-3.5 mr-1" />
                            Rotate
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              revokeDevice.mutate({ id: device.id })
                            }
                            isLoading={revokeDevice.isPending}
                          >
                            <ShieldAlert className="size-3.5 mr-1" />
                            Revoke
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Register Device Modal */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register Shop-Floor Device</DialogTitle>
            <DialogDescription>
              Create credentials for an organization-owned terminal device.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="device-name">Device Name</Label>
              <Input
                id="device-name"
                placeholder="e.g. Cutting Station iPad #1"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="device-code">Device Code (Optional)</Label>
              <Input
                id="device-code"
                placeholder="e.g. DEV-001"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Constrain to Specific Stages (Optional)</Label>
              <div className="space-y-1 max-h-40 overflow-y-auto border rounded p-2">
                {(stages ?? []).map((stg) => {
                  const isChecked = selectedStages.includes(stg.id)
                  return (
                    <label
                      key={stg.id}
                      className="flex items-center gap-2 text-sm p-1 hover:bg-muted rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStages([...selectedStages, stg.id])
                          } else {
                            setSelectedStages(
                              selectedStages.filter((id) => id !== stg.id),
                            )
                          }
                        }}
                      />
                      <span>{stg.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        ({stg.board})
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegisterOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRegister}
              disabled={!name || registerDevice.isPending}
              isLoading={registerDevice.isPending}
            >
              Register Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Secret Token Display Modal */}
      <Dialog
        open={!!generatedToken}
        onOpenChange={(open) => {
          if (!open) setGeneratedToken(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Device Credentials Generated</DialogTitle>
            <DialogDescription>
              Copy this API token now. It will not be shown again.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-muted rounded font-mono text-sm break-all border flex items-center justify-between gap-2">
            <span>{generatedToken}</span>
            <Button size="sm" variant="outline" onClick={handleCopyToken}>
              <Copy className="size-3.5 mr-1" />
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>

          <DialogFooter>
            <Button onClick={() => setGeneratedToken(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContent>
  )
}
