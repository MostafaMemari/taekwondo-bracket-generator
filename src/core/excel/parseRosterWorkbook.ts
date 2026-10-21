import { excelSchema, optionalParticipantFields } from '../../config/excelSchema.ts'
import {
  cellToText,
  guessColumnSelection,
  participantFields,
  readSheetMatrix,
  resolveSelection,
  type ColumnSelection,
  type SheetMatrix,
} from './columnMapping.ts'
import { createId } from '../id.ts'
import type { ImportIssue, ParsedRoster, Participant } from '../types.ts'

export function parseMappedSheet(matrix: SheetMatrix, selection: ColumnSelection): ParsedRoster {
  const indexes = resolveSelection(selection, matrix.headers)

  const participants: Participant[] = []
  const issues: ImportIssue[] = []

  for (let row = 0; row < matrix.dataRows.length; row += 1) {
    const cells = matrix.dataRows[row] ?? []
    if (cells.every((cell) => !cellToText(cell))) continue
    const excelRowNumber = matrix.headerRowIndex + row + 2
    const values = {} as Record<(typeof participantFields)[number], string>
    let hasAnyValue = false
    for (const field of participantFields) {
      const col = indexes[field]
      const text = col < 0 ? '' : cellToText(cells[col])
      values[field] = text
      if (text) hasAnyValue = true
    }
    if (!hasAnyValue) continue

    // ستون های اختیاری (مثل وزن kg) نبودن شان ردیف را ناقص نمی کند
    const missingFields = participantFields.filter(
      (field) => !optionalParticipantFields.includes(field) && !values[field],
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
      weightKg: values.weightKg ?? '',
      sourceRow: excelRowNumber,
    })
  }

  return { participants, issues }
}

export async function parseRosterWorkbook(data: ArrayBuffer): Promise<ParsedRoster> {
  const matrix = await readSheetMatrix(data)
  if (!matrix) {
    return {
      participants: [],
      issues: [
        {
          rowNumber: 0,
          missingFields: ['سرستون ها', ...participantFields.map((field) => excelSchema.columns[field].header)],
        },
      ],
    }
  }
  return parseMappedSheet(matrix, guessColumnSelection(matrix.headers))
}
