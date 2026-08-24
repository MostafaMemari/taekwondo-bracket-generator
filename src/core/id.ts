let counter = 0

export function createId(prefix: string): string {
  counter += 1
  const unique =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${counter}`
  return `${prefix}-${unique}`
}
