import { useState } from 'react'
import { ArrowLeftRight, X } from 'lucide-react'
import { toFaDigits } from '../../lib/formatFa.ts'
import type { CoachRow } from '../../lib/coachRows.ts'
import { FitText } from '../../components/FitText.tsx'
import { ByeTag } from '../../components/ByeTag.tsx'

interface CoachRosterProps {
  rows: CoachRow[]
  /** «drawer» = پنل شناور بوم قرعه؛ «strip» = نوار داخل حالت جدولی */
  layout: 'drawer' | 'strip'
  emptyText: string
  /**
   * تعویض جایگاه دو هنرجو — راه انتقال دستی استراحت: هنرجویی که استراحت دارد
   * را انتخاب کن، بعد هنرجوی مقصد را؛ جای دو نفر در جدول عوض می شود.
   */
  onSwap?: (participantAId: string, participantBId: string) => void
}

/**
 * فهرست «مربی ها و هنرجوها» — یک پیاده سازی برای دو جای برنامه: پنل شناور روی
 * بوم قرعه و نوار بازشوی حالت جدولی. هر مربی با تعداد هنرجوهایش، وزن هر
 * هنرجو و برچسب استراحت؛ چیدمان دو حالت فقط در اندازه ها فرق دارد.
 * هر ردیف یک دکمه تعویض دارد: با انتخاب دو هنرجو، جایگاهشان در جدول عوض می شود
 * — همین راه انتقال استراحت از یک هنرجو به هنرجوی دیگر است.
 */
export function CoachRoster({ rows, layout, emptyText, onSwap }: CoachRosterProps) {
  // هنرجوی اول انتخاب شده برای تعویض — هنرجوی دوم با کلیک روی ردیفش
  const [pickedId, setPickedId] = useState<string | null>(null)

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

  const pickedAthlete = pickedId
    ? rows.map((row) => row.athletes.find((athlete) => athlete.id === pickedId)).find(Boolean)
    : undefined

  /**
   * انتخاب هنرجو برای تعویض: بار اول هنرجو انتخاب می شود؛ کلیک روی دکمه یا
   * ردیف هنرجوی دیگر، تعویض را انجام می دهد؛ کلیک دوباره روی همان، لغو است.
   */
  function togglePick(participantId: string) {
    if (pickedId && pickedId !== participantId) {
      onSwap?.(pickedId, participantId)
      setPickedId(null)
      return
    }
    setPickedId((current) => (current === participantId ? null : participantId))
  }

  /** کلیک روی ردیف دوم در حال انتخاب — تعویض جایگاه انجام می شود */
  function pickSecond(participantId: string) {
    if (!pickedId || participantId === pickedId) return
    onSwap?.(pickedId, participantId)
    setPickedId(null)
  }

  const body = (row: CoachRow) => (
    <>
      <div className="flex items-center justify-between gap-2">
        <FitText
          text={row.coach}
          baseSize={drawer ? 13 : 12}
          minSize={8.5}
          twoLine={false}
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
        {row.athletes.map((athlete) => {
          const hasBye = row.byeAthleteIds.has(athlete.id)
          const isPicked = pickedId === athlete.id
          const pickTarget = Boolean(pickedId) && !isPicked
          return (
            <li
              key={athlete.id}
              onClick={pickTarget ? () => pickSecond(athlete.id) : undefined}
              className={`${itemClass} transition-shadow ${
                isPicked ? 'ring-2 ring-amber-400' : pickTarget ? 'cursor-pointer hover:ring-2 hover:ring-mat-600' : ''
              }`}
            >
              <FitText text={athlete.fullName} baseSize={drawer ? 12 : 11} minSize={7.5} className={nameClass} />
              <span className="flex shrink-0 items-center gap-1">
                {athlete.weightKg && (
                  <span className={weightClass}>{toFaDigits(athlete.weightKg)} کیلوگرم</span>
                )}
                {hasBye && <ByeTag />}
                {onSwap && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      togglePick(athlete.id)
                    }}
                    aria-pressed={isPicked}
                    title={
                      hasBye
                        ? 'این هنرجو استراحت دارد — کلیک کن و بعد هنرجوی مقصد را انتخاب کن تا استراحت به او برسد'
                        : 'تعویض جایگاه این هنرجو با هنرجوی دیگر — کلیک کن و بعد هنرجوی دوم را انتخاب کن'
                    }
                    className={`flex size-[19px] shrink-0 items-center justify-center rounded-md transition-colors ${
                      isPicked
                        ? 'bg-amber-400 text-white'
                        : 'text-muted opacity-60 hover:bg-turf hover:text-mat-700 hover:opacity-100'
                    }`}
                  >
                    <ArrowLeftRight size={11} />
                  </button>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </>
  )

  const banner = onSwap && pickedAthlete && (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10.5px] font-medium leading-4 text-amber-800">
      <span>
        <b>{pickedAthlete.fullName}</b> انتخاب شد — حالا روی هنرجوی دوم کلیک کن تا جایگاه هایشان
        عوض شود{rows.some((row) => row.byeAthleteIds.has(pickedAthlete.id)) ? ' (استراحت به او می رسد)' : ''}
      </span>
      <button
        type="button"
        onClick={() => setPickedId(null)}
        aria-label="لغو انتخاب"
        className="shrink-0 rounded-md p-0.5 transition-colors hover:bg-amber-100"
      >
        <X size={12} />
      </button>
    </div>
  )

  if (drawer) {
    return (
      <div className="divide-y divide-line">
        {banner && <div className="px-3.5 pt-3">{banner}</div>}
        {rows.map((row) => (
          <section key={row.coach} className="px-3.5 py-3">
            {body(row)}
          </section>
        ))}
      </div>
    )
  }

  return (
    <div>
      {banner && <div className="mb-2">{banner}</div>}
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.coach}>{body(row)}</div>
        ))}
      </div>
    </div>
  )
}
