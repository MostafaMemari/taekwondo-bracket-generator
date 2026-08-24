import { excelSchema, type ParticipantField } from '../../config/excelSchema.ts'
import { createId } from '../id.ts'
import type { ImportIssue, ParsedRoster, Participant } from '../types.ts'

type Cell = string | number | boolean | null

function cellToText(cell: Cell): string {
  if (cell === null || cell === undefined) return ''
  return String(cell).trim()
}

function matchesHeader(header: string, field: ParticipantField): boolean {
  const config = excelSchema.columns[field]
  return header === config.header || (config.aliases as readonly string[]).includes(header)
}

function findColumnIndexes(headerRow: Cell[]): Partial<Record<ParticipantField, number>> | null {
  const indexes: Partial<Record<ParticipantField, number>> = {}
  for (let col = 0; col < headerRow.length; col += 1) {
    const header = cellToText(headerRow[col])
    if (!header) continue
    for (const field of Object.keys(excelSchema.columns) as ParticipantField[]) {
      if (indexes[field] === undefined && matchesHeader(header, field)) {
        indexes[field] = col
      }
    }
  }
  const required = Object.keys(excelSchema.columns) as ParticipantField[]
  const found = required.filter((field) => indexes[field] !== undefined)
  return found.length >= 2 ? indexes : null
}

export async function parseRosterWorkbook(data: ArrayBuffer): Promise<ParsedRoster> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(data, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const rows = XLSX.utils.sheet_to_json<Cell[]>(workbook.Sheets[sheetName], {
    header: 1,
    blankrows: false,
    defval: null,
  })

  let headerIndexes: Partial<Record<ParticipantField, number>> | null = null
  let headerRowIndex: number = excelSchema.headerRowIndex
  for (let row = 0; row < Math.min(rows.length, 10); row += 1) {
    const found = findColumnIndexes(rows[row] ?? [])
    if (found) {
      headerIndexes = found
      headerRowIndex = row
      break
    }
  }

  if (!headerIndexes) {
    return {
      participants: [],
      issues: [
        {
          rowNumber: 0,
          missingFields: ['سرستون‌ها', ...Object.values(excelSchema.columns).map((c) => c.header)],
        },
      ],
    }
  }

  const participants: Participant[] = []
  const issues: ImportIssue[] = []

  for (let row = headerRowIndex + 1; row < rows.length; row += 1) {
    const cells = rows[row]
    if (!cells || cells.every((cell) => !cellToText(cell))) continue
    const excelRowNumber = row + 1
    const values = {} as Record<ParticipantField, string>
    let hasAnyValue = false
    for (const field of Object.keys(excelSchema.columns) as ParticipantField[]) {
      const col = headerIndexes[field]
      const text = col === undefined ? '' : cellToText(cells[col])
      values[field] = text
      if (text) hasAnyValue = true
    }
    if (!hasAnyValue) continue

    const missingFields = (Object.keys(values) as ParticipantField[]).filter(
      (field) => !values[field],
    )
    if (missingFields.length > 0) {
      issues.push({
        rowNumber: excelRowNumber,
        missingFields: missingFields.map((field) => excelSchema.columns[field].header),
      })
      continue
    }

    participants.push({
      id: createId('p'),
      fullName: values.fullName,
      coachName: values.coachName,
      ageCategory: values.ageCategory,
      weightCategory: values.weightCategory,
      sourceRow: excelRowNumber,
    })
  }

  return { participants, issues }
}
