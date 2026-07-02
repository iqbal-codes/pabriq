export function normalizeDesignName(
  designName: string | null | undefined,
): string | null {
  const trimmed = designName?.trim()
  return trimmed ? trimmed : null
}

export function getVisibleDesignName(
  designName: string | null | undefined,
  productName: string,
): string | null {
  const normalizedDesignName = normalizeDesignName(designName)
  if (!normalizedDesignName || normalizedDesignName === productName) return null
  return normalizedDesignName
}

export function formatProductDesignLabel(
  productName: string,
  designName: string | null | undefined,
): string {
  const visibleDesignName = getVisibleDesignName(designName, productName)
  return visibleDesignName
    ? `${productName} — ${visibleDesignName}`
    : productName
}
