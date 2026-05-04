import { StageList } from '../components/stage-list'
import { useStages } from '../hooks'

export function StageManagementPage() {
  const { data: stages, isLoading } = useStages()

  return <StageList stages={stages ?? []} loading={isLoading} />
}
