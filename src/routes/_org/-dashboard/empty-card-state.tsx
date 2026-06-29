export function EmptyCardState({ label }: { label: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
      {label}
    </div>
  )
}
