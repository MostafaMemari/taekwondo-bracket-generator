export function parseWeightForSorting(label: string): number {
  const normalized = label.replace(/[\u06f0-\u06f9\u0660-\u0669]/g, (char) => String(char.charCodeAt(0) & 0x0f))
  const match = normalized.match(/[-+]?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : Number.NaN
}

export function compareByWeightLabel(a: string, b: string): number {
  const sortKey = (label: string) => {
    const value = parseWeightForSorting(label)
    return Number.isNaN(value) ? Number.POSITIVE_INFINITY : value
  }
  const diff = sortKey(a) - sortKey(b)
  return diff !== 0 ? diff : a.localeCompare(b, 'fa')
}
