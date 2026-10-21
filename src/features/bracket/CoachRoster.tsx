import { toFaDigits } from '../../lib/formatFa.ts'
import type { CoachRow } from '../../lib/coachRows.ts'
import { FitText } from '../../components/FitText.tsx'
import { ByeTag } from '../../components/ByeTag.tsx'

interface CoachRosterProps {
  rows: CoachRow[]
  /** «drawer» = پنل شناور بوم قرعه؛ «strip» = نوار داخل حالت جدولی */
  layout: 'drawer' | 'strip'
  emptyText: string
}

/**
 * فهرست «مربی ها و هنرجوها» — یک پیاده سازی برای دو جای برنامه: پنل شناور روی
 * بوم قرعه و نوار بازشوی حالت جدولی. هر مربی با تعداد هنرجوهایش، وزن هر
 * هنرجو و برچسب استراحت؛ چیدمان دو حالت فقط در اندازه ها فرق دارد.
 */
export function CoachRoster({ rows, layout, emptyText }: CoachRosterProps) {
  if (rows.length === 0) {
    return <p className="px-1 py-1 text-[11px] text-muted">{emptyText}</p>
  }

  const drawer = layout === 'drawer'
  const listClass = drawer ? 'mt-2 space-y-1' : 'mt-1 space-y-0.5'
  const itemClass = drawer
    ? 'flex items-center justify-between gap-2 rounded-lg bg-turf px-2.5 py-1.5'
    : 'flex items-center justify-between gap-2 rounded-md bg-surface px-2 py-1'
  const nameClass = drawer ? 'text-xs text-ink-800' : 'text-[11px] text-ink-800'
  const weightClass = drawer
    ? 'rounded-full bg-white px-1.5 py-0.5 text-[9.5px] font-bold text-mat-700'
    : 'rounded-full bg-mat-50 px-1.5 py-0.5 text-[9.5px] font-bold text-mat-700'

  const body = (row: CoachRow) => (
    <>
      <div className="flex items-center justify-between gap-2">
        <FitText
          text={row.coach}
          baseSize={drawer ? 13 : 12}
          minSize={8.5}
          className="font-bold text-ink-900"
        />
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 font-bold text-mat-700 ${
            drawer ? 'border border-mat-100 bg-mat-50 text-[10.5px]' : 'bg-white text-[10px] shadow-sm'
          }`}
        >
          {toFaDigits(row.athletes.length)} هنرجو
        </span>
      </div>
      <ul className={listClass}>
        {row.athletes.map((athlete) => (
          <li key={athlete.id} className={itemClass}>
            <FitText text={athlete.fullName} baseSize={drawer ? 12 : 11} minSize={8} className={nameClass} />
            <span className="flex shrink-0 items-center gap-1">
              {athlete.weightKg && (
                <span className={weightClass}>{toFaDigits(athlete.weightKg)} کیلوگرم</span>
              )}
              {row.byeAthleteIds.has(athlete.id) && <ByeTag />}
            </span>
          </li>
        ))}
      </ul>
    </>
  )

  if (drawer) {
    return (
      <div className="divide-y divide-line">
        {rows.map((row) => (
          <section key={row.coach} className="px-3.5 py-3">
            {body(row)}
          </section>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.coach}>{body(row)}</div>
      ))}
    </div>
  )
}
