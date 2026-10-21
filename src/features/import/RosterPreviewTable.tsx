import { AlertTriangle } from 'lucide-react'
import type { ImportIssue, Participant } from '../../core/types.ts'
import { toFaDigits } from '../../lib/formatFa.ts'

interface RosterPreviewTableProps {
  participants: Participant[]
  issues: ImportIssue[]
}

export function RosterPreviewTable({ participants, issues }: RosterPreviewTableProps) {
  const invalidRows = new Map(issues.map((issue) => [issue.rowNumber, issue]))

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h3 className="font-bold text-ink-900">پیش نمایش اطلاعات</h3>
        <p className="text-sm text-muted">
          {toFaDigits(participants.length)} شرکت کننده معتبر
          {issues.length > 0 && (
            <span className="text-hogu-600"> • {toFaDigits(issues.length)} ردیف ناقص</span>
          )}
        </p>
      </div>
      <div className="max-h-96 overflow-auto">
        <table className="w-full text-right text-sm">
          <thead className="sticky top-0 bg-turf text-xs text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">ردیف اکسل</th>
              <th className="px-4 py-2.5 font-medium">نام و نام خانوادگی</th>
              <th className="px-4 py-2.5 font-medium">مربی</th>
              <th className="px-4 py-2.5 font-medium">رده سنی</th>
              <th className="px-4 py-2.5 font-medium">وزن</th>
              <th className="px-4 py-2.5 font-medium">وزن (kg)</th>
            </tr>
          </thead>
          <tbody>
            {[...invalidRows.keys()].map((rowNumber) => (
              <tr key={`issue-${rowNumber}`} className="bg-hogu-100">
                <td className="px-4 py-2.5 text-muted">{toFaDigits(rowNumber)}</td>
                <td className="px-4 py-2.5" colSpan={5}>
                  <span className="inline-flex items-center gap-1.5 text-hogu-700">
                    <AlertTriangle size={14} />
                    ردیف ناقص —
                    {invalidRows.get(rowNumber)!.missingFields.join('، ')} مشخص نیست
                  </span>
                </td>
              </tr>
            ))}
            {participants.map((participant) => (
              <tr key={participant.id} className="border-t border-line">
                <td className="px-4 py-2.5 text-muted">{toFaDigits(participant.sourceRow)}</td>
                <td className="px-4 py-2.5 font-medium">{participant.fullName}</td>
                <td className="px-4 py-2.5">{participant.coachName}</td>
                <td className="px-4 py-2.5">{participant.ageCategory}</td>
                <td className="px-4 py-2.5">{participant.weightCategory}</td>
                <td className="px-4 py-2.5 text-muted">{participant.weightKg ? `${toFaDigits(participant.weightKg)} کیلوگرم` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
