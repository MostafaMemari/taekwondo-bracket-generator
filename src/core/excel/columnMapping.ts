import { excelSchema, optionalParticipantFields, type ParticipantField } from '../../config/excelSchema.ts'

export type SheetCell = string | number | boolean | null

export interface SheetMatrix {
  sheetLabel: string
  headers: string[]
  dataRows: SheetCell[][]
  headerRowIndex: number
}

export type ColumnSelection = Record<ParticipantField, string>

export const participantFields = Object.keys(excelSchema.columns) as ParticipantField[]

export function cellToText(cell: SheetCell): string {
  if (cell === null || cell === undefined) return ''
  return String(cell).trim()
}

export function matchesHeader(header: string, field: ParticipantField): boolean {
  const config = excelSchema.columns[field]
  return header === config.header || (config.aliases as readonly string[]).includes(header)
}

const storageKey = 'kyorugi-draw-board-column-mapping-v1'
const noneValue = ''

export function guessColumnSelection(headers: readonly string[]): ColumnSelection {
  const selection = {} as ColumnSelection
  for (const field of participantFields) {
    selection[field] = noneValue
  }
  for (let col = 0; col < headers.length; col += 1) {
    const header = headers[col]
    if (!header) continue
    for (const field of participantFields) {
      if (!selection[field] && matchesHeader(header, field)) {
        selection[field] = header
      }
    }
  }
  return selection
}

export function isSelectionComplete(selection: ColumnSelection): boolean {
  return participantFields.every(
    (field) =>
      optionalParticipantFields.includes(field) || selection[field] !== noneValue,
  )
}

export function resolveSelection(
  selection: ColumnSelection,
  headers: readonly string[],
): Record<ParticipantField, number> {
  const indexes = {} as Record<ParticipantField, number>
  for (const field of participantFields) {
    indexes[field] = selection[field] ? headers.indexOf(selection[field]) : -1
  }
  return indexes
}

export function buildInitialSelection(
  headers: readonly string[],
  saved: Partial<ColumnSelection> | null,
): ColumnSelection {
  const guess = guessColumnSelection(headers)
  if (!saved) return guess
  const merged = {} as ColumnSelection
  for (const field of participantFields) {
    const savedName = saved[field]
    merged[field] = savedName && headers.includes(savedName) ? savedName : guess[field]
  }
  return merged
}

export function loadSavedColumnSelection(): Partial<ColumnSelection> | null {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const record = parsed as Record<string, unknown>
    const valid = participantFields.every((field) => {
      const value = record[field]
      return value === undefined || typeof value === 'string'
    })
    return valid ? (parsed as Partial<ColumnSelection>) : null
  } catch {
    return null
  }
}

export function saveColumnSelection(selection: ColumnSelection): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(selection))
  } catch {
    return
  }
}

export async function readSheetMatrix(data: ArrayBuffer): Promise<SheetMatrix | null> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(data, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const rows = XLSX.utils.sheet_to_json<SheetCell[]>(workbook.Sheets[sheetName], {
    header: 1,
    blankrows: false,
    defval: null,
  })

  let headerRowIndex = -1
  for (let row = 0; row < Math.min(rows.length, 10); row += 1) {
    const cells = rows[row] ?? []
    if (cells.filter((cell) => cellToText(cell)).length >= 2) {
      headerRowIndex = row
      break
    }
  }
  if (headerRowIndex === -1) return null

  return {
    sheetLabel: sheetName,
    headers: (rows[headerRowIndex] ?? []).map((cell) => cellToText(cell)),
    dataRows: rows.slice(headerRowIndex + 1),
    headerRowIndex,
  }
}
