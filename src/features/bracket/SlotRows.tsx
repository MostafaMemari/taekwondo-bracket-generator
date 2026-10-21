import { Plus } from 'lucide-react'
import type { Participant } from '../../core/types.ts'
import type { SlotSide } from '../../core/bracket/layout.ts'
import { FitText } from '../../components/FitText.tsx'
import { toFaDigits } from '../../lib/formatFa.ts'
import { sideTheme } from './sideColors.ts'

/**
 * Presentational slot rows shared by the interactive canvas and the print
 * sheet. Deliberately frameless: no border around the name, no written corner
 * labels. The corner colour is shown with a soft tint plus one saturated
 * accent bar on the outer edge — blue on top, red at the bottom.
 * The name sits on its own full-width line and the coach on a second smaller
 * line underneath — «FitText» جانشین truncate است: نام و مربی هرچه طولانی
 * باشند با کوچک شدن فونت کامل جا می شوند و هرگز با «…» بریده نمی شوند.
 */

interface AthleteRowProps {
  participant: Participant
  side: SlotSide
  nameFontSize?: number
  /** خط مربی — پیش فرض با اندازه فونت سازگار است؛ برگه چاپ از fitPrintDims می فرستد */
  showCoach?: boolean
  coachFontSize?: number
}

export function AthleteRow({
  participant,
  side,
  nameFontSize = 13.5,
  showCoach,
  coachFontSize,
}: AthleteRowProps) {
  const theme = sideTheme[side]
  // مربی خالی خط نمی گیرد تا نام تک خطی وسط کارت بنشیند
  const coachVisible =
    (showCoach ?? nameFontSize >= 11) && participant.coachName.trim().length > 0
  const subSize = coachFontSize ?? Math.max(8.5, nameFontSize - 4.5)
  return (
    <div
      dir="rtl"
      className="flex h-full w-full items-stretch overflow-hidden rounded-md"
      style={{ backgroundColor: theme.bgSoft }}
    >
      <span
        aria-hidden
        className="shrink-0"
        style={{ width: 4.5, backgroundColor: theme.accent }}
      />
      <div className="flex min-w-0 flex-1 flex-col items-stretch justify-center gap-0.5 px-1.5">
        <FitText
          text={participant.fullName}
          baseSize={nameFontSize}
          minSize={7}
          className="font-bold leading-tight text-ink-900"
        />
        {coachVisible && (
          <FitText
            text={participant.coachName}
            baseSize={subSize}
            minSize={6.5}
            className="font-medium text-ink-700"
            style={{ lineHeight: 1.25 }}
            title={`مربی: ${participant.coachName}`}
          />
        )}
      </div>
    </div>
  )
}

/** a resting corner: the athlete of this corner has no opponent in this round */
export function ByeRow({ side }: { side: SlotSide }) {
  const theme = sideTheme[side]
  return (
    <div
      dir="rtl"
      className="flex h-full w-full items-center justify-center rounded-md border border-dashed bg-white"
      style={{ borderColor: theme.borderSoft }}
    >
      <span className="text-[11px] font-bold" style={{ color: theme.accent, opacity: 0.6 }}>
        استراحت
      </span>
    </div>
  )
}

/**
 * خانه خالی جدول دستی — به جای ردیف رنگی بی نام، یک خانه خط چین با دعوت به
 * نوشتن می نشیند؛ کلیک روی آن ورودی نام و مربی را باز می کند (SlotCard).
 */
export function EmptySlotRow({ side }: { side: SlotSide }) {
  const theme = sideTheme[side]
  return (
    <div
      dir="rtl"
      className="flex h-full w-full items-center gap-2 rounded-md border border-dashed bg-white px-2"
      style={{ borderColor: theme.borderSoft }}
    >
      <Plus aria-hidden size={13} className="shrink-0" style={{ color: theme.accent, opacity: 0.6 }} />
      <span
        className="truncate text-right"
        style={{ fontSize: 12.5, color: theme.text, opacity: 0.6 }}
      >
        نام هنرجو
      </span>
    </div>
  )
}

/**
 * An undecided corner of a match box: a quiet tinted row with no text — the
 * colour (blue above / red below) already tells the story. `emphasis` gives
 * the final a stronger tint.
 */
export function PositionRow({ side, emphasis = false }: { side: SlotSide; emphasis?: boolean }) {
  const theme = sideTheme[side]
  return (
    <div
      aria-hidden
      className="h-full w-full rounded-md"
      style={{ backgroundColor: emphasis ? theme.bg : theme.bgSoft }}
    />
  )
}

/**
 * جایگاه «برنده مسابقه N» — روی صفحه پایانیِ برگه های چند صفحه ای، جایی که
 * مسابقه های دور قبل روی صفحات نوار چیده شده اند. شماره از خود ساختار درخت
 * می آید و با رقم فارسی نشان داده می شود.
 */
export function WinnerRow({ matchNumber, side }: { matchNumber: number; side: SlotSide }) {
  const theme = sideTheme[side]
  return (
    <div
      dir="rtl"
      className="flex h-full w-full items-center gap-2 overflow-hidden rounded-md px-2"
      style={{ backgroundColor: theme.bgSoft }}
    >
      <span aria-hidden className="shrink-0" style={{ width: 4.5, backgroundColor: theme.accent }} />
      <FitText
        text={matchNumber > 0 ? `برنده مسابقه ${toFaDigits(matchNumber)}` : 'برنده دور قبل'}
        baseSize={10.5}
        minSize={7.5}
        className="font-bold"
        style={{ color: theme.accent }}
      />
    </div>
  )
}

/**
 * جایگاه «بازنده مسابقه N» — دو گوشه مسابقه رده بندی باران مدال، جایی که
 * بازنده های دو نیمه نهایی برای مدال برنز به هم می رسند.
 */
export function LoserRow({ matchNumber, side }: { matchNumber: number; side: SlotSide }) {
  const theme = sideTheme[side]
  return (
    <div
      dir="rtl"
      className="flex h-full w-full items-center gap-2 overflow-hidden rounded-md px-2"
      style={{ backgroundColor: theme.bgSoft }}
    >
      <span aria-hidden className="shrink-0" style={{ width: 4.5, backgroundColor: theme.accent }} />
      <FitText
        text={matchNumber > 0 ? `بازنده مسابقه ${toFaDigits(matchNumber)}` : 'بازنده دور قبل'}
        baseSize={10.5}
        minSize={7.5}
        className="font-bold"
        style={{ color: theme.accent }}
      />
    </div>
  )
}
