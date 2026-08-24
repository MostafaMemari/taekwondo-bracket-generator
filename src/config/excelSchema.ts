/**
 * Single source of truth for how Excel columns map onto domain fields.
 * If the sheet layout ever changes, edit THIS file only.
 */
export interface ExcelFieldSpec {
  /** Canonical header name (first entry wins for display). */
  readonly names: readonly string[];
  readonly required: boolean;
}

export type RosterField = 'fullName' | 'coachName' | 'ageCategory' | 'weightCategory';

export const excelSchema = {
  /** Read the first sheet of the workbook. */
  sheet: { mode: 'first' },
  /**
   * The header row is auto-detected as the first row that contains
   * every required field below (case/whitespace-insensitive).
   */
  headerRow: { mode: 'auto' },
  columns: {
    fullName: { names: ['Full name', 'Name', 'Athlete'], required: true },
    coachName: { names: ['Coach name', 'Coach'], required: true },
    ageCategory: { names: ['Age category'], required: true },
    weightCategory: { names: ['Weight category'], required: true },
  } satisfies Record<RosterField, ExcelFieldSpec>,
} as const;

/** Column labels to advertise in the import UI (config-driven). */
export const expectedColumnLabels = (
  Object.keys(excelSchema.columns) as RosterField[]
).map((field) => excelSchema.columns[field].names[0]);
