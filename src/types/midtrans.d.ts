interface Window {
  snap: {
    pay: (
      token: string,
      callbacks?: {
        onSuccess?: (result: Record<string, unknown>) => void
        onPending?: (result: Record<string, unknown>) => void
        onError?: (result: Record<string, unknown>) => void
        onClose?: () => void
      },
    ) => void
  }
}
