import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
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
  useAcceptUpgradeProposal,
  useCreateUpgradeProposal,
  useImportCapability,
  useOrganizationConfiguration,
  usePublishedTemplates,
  useRejectUpgradeProposal,
} from '#/features/business-templates/hooks'
import { listUpgradeProposalsFn } from '#/features/business-templates/server'
import { queryKeys } from '#/lib/query-keys'

export const Route = createFileRoute('/_org/settings/business-templates')({
  component: BusinessTemplatesSettingsPage,
})

function BusinessTemplatesSettingsPage() {
  const { data: config } = useOrganizationConfiguration()
  const { data: templates } = usePublishedTemplates()
  const { data: proposals } = useSuspenseQuery({
    queryKey: queryKeys.upgrades.all,
    queryFn: () => listUpgradeProposalsFn(),
  })
  const createUpgrade = useCreateUpgradeProposal()
  const acceptUpgrade = useAcceptUpgradeProposal()
  const rejectUpgrade = useRejectUpgradeProposal()
  const importCapability = useImportCapability()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Business Template</h1>
        <p className="text-muted-foreground">
          Manage your organization&apos;s business template configuration
        </p>
      </div>

      {/* Current Configuration */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle>Current Configuration</CardTitle>
            <CardDescription>
              Your organization is configured from a business template
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Source Template:</span>{' '}
                {templates?.find((tmpl) => tmpl.id === config.sourceTemplateId)
                  ?.name ?? config.sourceTemplateId}
              </p>
              <p>
                <span className="font-medium">Version:</span>{' '}
                {config.sourceTemplateVersion}
              </p>
              <p>
                <span className="font-medium">Lineage Entries:</span>{' '}
                {config.lineage.length}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Available Templates</CardTitle>
          <CardDescription>
            Published business templates available for upgrade or capability
            import
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {templates?.map((tmpl) => (
              <div
                key={tmpl.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{tmpl.name}</p>
                  <p className="text-xs text-muted-foreground">
                    v{tmpl.version}
                    {tmpl.description && ` · ${tmpl.description}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => createUpgrade.mutate(tmpl.id)}
                    disabled={createUpgrade.isPending}
                  >
                    Preview Upgrade
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Capability Import */}
      <Card>
        <CardHeader>
          <CardTitle>Import Capability</CardTitle>
          <CardDescription>
            Import a specific capability (product, stage, material, or document)
            from another published template.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Capability key (e.g. tshirt_dtf)"
              className="flex-1 px-3 py-2 border rounded-md text-sm"
              id="capability-key-input"
            />
            <select
              className="px-3 py-2 border rounded-md text-sm"
              id="capability-template-select"
            >
              {templates?.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const keyInput = document.getElementById(
                  'capability-key-input',
                ) as HTMLInputElement | null
                const templateSelect = document.getElementById(
                  'capability-template-select',
                ) as HTMLSelectElement | null
                if (keyInput?.value && templateSelect?.value) {
                  importCapability.mutate({
                    sourceTemplateId: templateSelect.value,
                    elementKey: keyInput.value,
                  })
                }
              }}
              disabled={importCapability.isPending}
            >
              Import
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Proposals */}
      {proposals && proposals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade Proposals</CardTitle>
            <CardDescription>
              Review and manage template upgrade proposals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {proposals.map((proposal) => {
                const addCount = (
                  proposal.additions as Array<Record<string, unknown>>
                ).length
                const conflictCount = (
                  proposal.conflicts as Array<Record<string, unknown>>
                ).length
                const changeCount = (
                  proposal.semanticChanges as Array<Record<string, unknown>>
                ).length

                return (
                  <div
                    key={proposal.id}
                    className="p-3 border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">
                        Upgrade to v{proposal.targetTemplateVersion}
                      </p>
                      <Badge>{proposal.status}</Badge>
                    </div>

                    {proposal.status === 'pending_review' && (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {addCount > 0 && <p>{addCount} additions</p>}
                        {conflictCount > 0 && (
                          <p className="text-amber-600">
                            {conflictCount} conflicts
                          </p>
                        )}
                        {changeCount > 0 && <p>{changeCount} changes</p>}
                      </div>
                    )}

                    {proposal.status === 'pending_review' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => acceptUpgrade.mutate(proposal.id)}
                          disabled={acceptUpgrade.isPending}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectUpgrade.mutate(proposal.id)}
                          disabled={rejectUpgrade.isPending}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
