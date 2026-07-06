export function getReadyForProductionLabel({
  firstProductionStageName,
  readyForProduction,
  readyForProductionWithStage,
}: {
  firstProductionStageName: string | undefined
  readyForProduction: string
  readyForProductionWithStage: (values: { stage: string }) => string
}): string {
  if (!firstProductionStageName) {
    return readyForProduction
  }

  return readyForProductionWithStage({ stage: firstProductionStageName })
}
