import { useMemo, useState } from 'react'
import {
  buildInitialSelection,
  cellToText,
  loadSavedColumnSelection,
  participantFields,
  resolveSelection,
  saveColumnSelection,
  type ColumnSelection,
  type SheetCell,
  type SheetMatrix,
} from '../../core/excel/columnMapping.ts'
import { excelSchema } from '../../config/excelSchema.ts'
import { Button } from '../../components/Button.tsx'
import { toFaDigits } from '../../lib/formatFa.ts'

const previewRowCount = 5

interface ColumnMappingStepProps {
  matrix: SheetMatrix
  fileName: string
  onCancel: () => void
  onConfirm: (selection: ColumnSelection) => void
}

function sampleValue(dataRows: SheetCell[][], col: number): string {
  for (const cells of dataRows.slice(0, 8)) {
    const text = cellToText(cells[col])
    if (text) return text
  }
  return ''
}

export function ColumnMappingStep({ matrix, fileName, onCancel, onConfirm }: ColumnMappingStepProps) {
  const [selection, setSelection] = useState<ColumnSelection>(() =>
    buildInitialSelection(matrix.headers, loadSavedColumnSelection()),
  )

  const namedColumns = matrix.headers
    .map((header, col) => ({ header, col }))
    .filter((column) => column.header !== '')

  const indexes = useMemo(
    () => resolveSelection(selection, matrix.headers),
    [selection, matrix.headers],
  )

  const complete = participantFields.every((field) => indexes[field] >= 0)

  function updateField(field: keyof ColumnSelection, header: string) {
    setSelection((current) => ({ ...current, [field]: header }))
  }

  function confirm() {
    if (!complete) return
    saveColumnSelection(selection)
    onConfirm(selection)
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="truncate text-xs text-muted" title={fileName}>{fileName}</p>
        <h1 className="mt-1 font-display text-3xl text-ink-900">تطبیق ستون‌های اکسل</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          برای هر فیلد، ستون متناظر در فایل را انتخاب کنید. پیش‌نمایش پایین صفحه بلافاصله به‌روز
          می‌شود تا درستی انتخاب‌ها را بررسی کنید.
        </p>
      </header>

      <section className="rounded-xl border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-bold text-ink-900">ستون‌های شناسایی‌شده</h3>
          <p className="text-xs text-muted">
            برگه «{matrix.sheetLabel}» • {toFaDigits(namedColumns.length)} ستون
          </p>
        </div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {namedColumns.map(({ header, col }) => (
            <li
              key={col}
              className="flex max-w-[240px] items-center gap-1.5 rounded-full border border-line bg-turf px-3 py-1 text-xs"
              title={`نمونه: ${sampleValue(matrix.dataRows, col)}`}
            >
              <span className="font-medium text-ink-900">{header}</span>
              <span className="truncate text-muted">{sampleValue(matrix.dataRows, col)}</span>
            </li>
          ))}
          {namedColumns.length === 0 && (
            <li className="text-sm text-muted">هیچ سرستونی خوانده نشد.</li>
          )}
        </ul>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {participantFields.map((field) => (
          <label key={field} className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-800">
              {excelSchema.columns[field].header}
            </span>
            <select
              value={selection[field]}
              onChange={(event) => updateField(field, event.target.value)}
              className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink-900"
            >
              <option value="">— انتخاب نشده —</option>
              {namedColumns.map(({ header }) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </label>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 className="font-bold text-ink-900">پیش‌نمایش نگاشت</h3>
          <p className="text-sm text-muted">{toFaDigits(previewRowCount)} ردیف نخست</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-turf text-xs text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">ردیف اکسل</th>
                {participantFields.map((field) => (
                  <th key={field} className="px-4 py-2.5 font-medium">
                    {excelSchema.columns[field].header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.dataRows.slice(0, previewRowCount).map((cells, rowIndex) => (
                <tr key={rowIndex} className="border-t border-line">
                  <td className="px-4 py-2.5 text-muted">{toFaDigits(matrix.headerRowIndex + rowIndex + 2)}</td>
                  {participantFields.map((field) => {
                    const text = indexes[field] < 0 ? '' : cellToText(cells[indexes[field]])
                    return (
                      <td key={field} className={`px-4 py-2.5 ${text ? '' : 'text-hogu-600'}`}>
                        {text || '—'}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {matrix.dataRows.length === 0 && (
                <tr>
                  <td colSpan={participantFields.length + 1} className="px-4 py-6 text-center text-muted">
                    هیچ ردیف داده‌ای زیر سرستون‌ها پیدا نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {!complete && (
        <p role="alert" className="rounded-lg border border-hogu-100 bg-hogu-100 px-4 py-3 text-sm text-hogu-700">
          برای تأیید نگاشت، باید برای هر چهار فیلد یک ستون انتخاب شود.
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={confirm} disabled={!complete}>
          تأیید و پردازش فایل
        </Button>
        <Button variant="subtle" onClick={onCancel}>
          انصراف
        </Button>
      </div>
    </div>
  )
}
