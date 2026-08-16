const tails = new Map<string, Promise<unknown>>()

/** Serialize all in-process mutations targeting one skill root. */
export function enqueueMutation<T>(root: string, operation: () => Promise<T>): Promise<T> {
  const previous = tails.get(root) ?? Promise.resolve()
  const next = previous.catch(() => {}).then(operation)
  tails.set(root, next)
  return next.finally(() => {
    if (tails.get(root) === next) tails.delete(root)
  })
}
