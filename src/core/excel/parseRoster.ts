import * as XLSX from 'xlsx';
import type { Participant } from '../domain.ts';
import { excelSchema, type RosterField } from '../../config/excelSchema.ts';

export type IssueSeverity = 'error' | 'warning';

export interface RowIssue {
  readonly row: number;
  readonly field?: RosterField;
  readonly message: string;
  readonly severity: IssueSeverity;
}

export interface ParsedRow {
  readonly row: number;
  readonly fullName: string;
  readonly coachName: string;
  readonly ageCategory: string;
  readonly weightCategory: string;
  readonly ok: boolean;
}

export interface ParseOutcome {
  readonly sourceLabel: string;
  readonly rows: readonly ParsedRow[];
  readonly issues: readonly RowIssue[];
  readonly validParticipants: readonly Participant[];
  readonly headerFound: boolean;
}

const normalizeHeader = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const cellToString = (value: unknown): string => String(value ?? '').trim();

function findHeaderRow(matrix: readonly unknown[]): {
  rowIndex: number;
  columnByField: ReadonlyMap<RosterField, number>;
} {
  const fields = Object.keys(excelSchema.columns) as RosterField[];
  for (let r = 0; r < matrix.length; r++) {
    const cells = (matrix[r] as unknown[] | undefined) ?? [];
    const normalized = cells.map(normalizeHeader);
    const columnByField = new Map<RosterField, number>();
    for (const field of fields) {
      const candidates = excelSchema.columns[field].names.map(normalizeHeader);
      const index = normalized.findIndex((cell) => cell !== '' && candidates.includes(cell));
      if (index >= 0) columnByField.set(field, index);
    }
    if (fields.every((field) => columnByField.has(field))) {
      return { rowIndex: r, columnByField };
    }
  }
  return { rowIndex: -1, columnByField: new Map() };
}

/**
 * Parse a raw cell matrix into validated participants.
 * Pure aside from the xlsx data structures passed in.
 */
export function parseMatrix(matrix: readonly unknown[], sourceLabel = 'roster'): ParseOutcome {
  const { rowIndex, columnByField } = findHeaderRow(matrix);
  if (rowIndex < 0) {
    return {
      sourceLabel,
      rows: [],
      issues: [
        {
          row: 0,
          message:
            'No header row found. Expected columns: ' +
            (Object.keys(excelSchema.columns) as RosterField[])
              .map((f) => excelSchema.columns[f].names[0])
              .join(' · '),
          severity: 'error',
        },
      ],
      validParticipants: [],
      headerFound: false,
    };
  }

  const rows: ParsedRow[] = [];
  const issues: RowIssue[] = [];
  const participants: Participant[] = [];

  for (let r = rowIndex + 1; r < matrix.length; r++) {
    const cells = (matrix[r] as unknown[] | undefined) ?? [];
    // Skip fully blank separator rows.
    if (cells.every((c) => cellToString(c) === '')) continue;

    const excelRowNumber = r + 1; // human-friendly, matches spreadsheet UI
    const values = {} as Record<RosterField, string>;
    let missingRequired = false;
    for (const field of Object.keys(excelSchema.columns) as RosterField[]) {
      const col = columnByField.get(field);
      const text = col === undefined ? '' : cellToString(cells[col]);
      values[field] = text;
      if (text === '') {
        missingRequired = true;
        issues.push({
          row: excelRowNumber,
          field,
          message: `Missing “${excelSchema.columns[field].names[0]}”`,
          severity: 'error',
        });
      }
    }

    rows.push({
      row: excelRowNumber,
      fullName: values.fullName,
      coachName: values.coachName,
      ageCategory: values.ageCategory,
      weightCategory: values.weightCategory,
      ok: !missingRequired,
    });

    if (!missingRequired) {
      participants.push({
        id: `p${excelRowNumber}`,
        fullName: values.fullName,
        coach: values.coachName,
        ageCategory: values.ageCategory,
        weightCategory: values.weightCategory,
        sourceRow: excelRowNumber,
      });
    }
  }

  // Duplicate warning: same name inside the same category combination.
  const seen = new Map<string, number>();
  for (const participant of participants) {
    const key = `${participant.fullName}::${participant.ageCategory}::${participant.weightCategory}`;
    const firstRow = seen.get(key);
    if (firstRow !== undefined) {
      issues.push({
        row: participant.sourceRow,
        message: `Duplicate of row ${firstRow} (same name in the same category)`,
        severity: 'warning',
      });
    } else {
      seen.set(key, participant.sourceRow);
    }
  }

  return { sourceLabel, rows, issues, validParticipants: participants, headerFound: true };
}

/** Read an uploaded workbook buffer and parse its first sheet. */
export async function parseWorkbook(
  buffer: ArrayBuffer,
  sourceLabel: string,
): Promise<ParseOutcome> {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      sourceLabel,
      rows: [],
      issues: [{ row: 0, message: 'The workbook contains no sheets.', severity: 'error' }],
      validParticipants: [],
      headerFound: false,
    };
  }
  const sheet = workbook.Sheets[sheetName];
  const matrix: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: true,
    defval: '',
  });
  return parseMatrix(matrix, `${sourceLabel} · ${sheetName}`);
}
