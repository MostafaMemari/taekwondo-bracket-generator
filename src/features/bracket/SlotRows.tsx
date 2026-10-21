import { Plus } from 'lucide-react'
import type { Participant } from '../../core/types.ts'
import type { SlotSide } from '../../core/bracket/layout.ts'
import { FitText } from '../../components/FitText.tsx'
import { toFaDigits } from '../../lib/formatFa.ts'
import { useTableTheme } from '../../lib/tableThemeContext.ts'
import type { SheetLayoutId } from '../../lib/sheetLayouts.ts'

/**
 * Presentational slot rows shared by the interactive canvas and the print
 * sheet. Deliberately frameless: no border around the name, no written corner
 * labels. The corner colour is shown with a soft tint plus one saturated
 * accent bar on the outer edge — blue on top, red at the bottom.
 * The name sits on its own full-width line and the coach on a second smaller
 * line underneath — «FitText» جانشین truncate است: نام و مربی هرچه طولانی
 * باشند با کوچک شدن فونت کامل جا می شوند و هرگز با «…» بریده نمی شوند.
 *
 * رنگ ها از تم جدول می آید: داخل برگه تم انتخابی کاربر است، بیرون برگه
 * (بوم قرعه و ادیتورها) تم کلاسیک — همان رنگ های همیشگی.
 */

/**
 * سمت نوار رنگی گوشه — برگه آینه ای است: کارت های نیمه راست برگه نوار را روی
 * لبه راست می گیرند و کارت های نیمه چپ روی لبه چپ، تا نوار همیشه سمت بیرونی
 * (سمت ورود مبارز از لبه برگه) بنشیند. پیش فرض راست = رفتار همیشگی.
 */
export type BarSide = 'right' | 'left'

/**
 * طرح ردیف — کلاسیک: نوار رنگی روی لبه بیرونی (آینه ای)؛ مدرن: فقط رنگ ملایم
 * گوشه بدون هیچ خط و نوار — برگه باز و خلوت می ماند. پیش فرض کلاسیک تا بوم
 * قرعه و همه مصرف کننده های قدیمی دست نخورده بمانند.
 */
export type RowDesign = SheetLayoutId

interface AthleteRowProps {
  participant: Participant
  side: SlotSide
  nameFontSize?: number
  /** خط مربی — پیش فرض با اندازه فونت سازگار است؛ برگه چاپ از fitPrintDims می فرستد */
  showCoach?: boolean
  coachFontSize?: number
  /** لبه نوار رنگی — نیمه چپ برگه «چپ» می گیرد (پیش فرض راست)؛ فقط طرح کلاسیک */
  barSide?: BarSide
  /** طرح ردیف — کلاسیک (پیش فرض) یا مدرن */
  design?: RowDesign
}

export function AthleteRow({
  participant,
  side,
  nameFontSize = 13.5,
  showCoach,
  coachFontSize,
  barSide = 'right',
  design = 'classic',
}: AthleteRowProps) {
  const theme = useTableTheme()
  const sideColors = theme.sides[side]
  // مربی خالی خط نمی گیرد تا نام تک خطی وسط کارت بنشیند
  const coachVisible =
    (showCoach ?? nameFontSize >= 11) && participant.coachName.trim().length > 0
  const subSize = coachFontSize ?? Math.max(8.5, nameFontSize - 4.5)

  // طرح مدرن — کارت بی حاشیه: فقط رنگ ملایم گوشه؛ نه نوار، نه خط دور تا
  // برگه خلوت بماند (نوار کناری و خطوط دور مال طرح کلاسیک است)
  if (design === 'modern') {
    return (
      <div
        dir="rtl"
        className="flex h-full w-full flex-col overflow-hidden rounded-md"
        style={{ backgroundColor: sideColors.bgSoft }}
      >
        <div className="flex min-h-0 w-full flex-1 flex-col items-stretch justify-center gap-0.5 px-1.5">
          <FitText
            text={participant.fullName}
            baseSize={nameFontSize}
            minSize={coachVisible ? 5.5 : 7}
            twoLine={!coachVisible}
            align="center"
            className="font-bold leading-tight"
            style={{ color: theme.nameText }}
          />
          {coachVisible && (
            <FitText
              text={participant.coachName}
              baseSize={subSize}
              minSize={6.5}
              twoLine={false}
              align="center"
              className="font-medium"
              style={{ lineHeight: 1.25, color: theme.coachText }}
              title={`مربی: ${participant.coachName}`}
            />
          )}
        </div>
      </div>
    )
  }

  const bar = (
    <span
      aria-hidden
      className="shrink-0"
      style={{ width: 4.5, backgroundColor: sideColors.accent }}
    />
  )
  const text = (
    <div className="flex min-w-0 flex-1 flex-col items-stretch justify-center gap-0.5 px-1.5">
      {/* نام اولویت مطلق است — وقتی خط مربی هست نام تک خطی با کف کوچک تر؛
          وقتی مربی خط ندارد نام می تواند تا دو خط بشکند تا کامل بماند.
          نام و مربی وسط چین می نشینند تا روی هر دو نیمه آینه ای برگه یکدست باشند */}
      <FitText
        text={participant.fullName}
        baseSize={nameFontSize}
        minSize={coachVisible ? 5.5 : 7}
        twoLine={!coachVisible}
        align="center"
        className="font-bold leading-tight"
        style={{ color: theme.nameText }}
      />
      {coachVisible && (
        <FitText
          text={participant.coachName}
          baseSize={subSize}
          minSize={6.5}
          twoLine={false}
          align="center"
          className="font-medium"
          style={{ lineHeight: 1.25, color: theme.coachText }}
          title={`مربی: ${participant.coachName}`}
        />
      )}
    </div>
  )
  return (
    <div
      dir="rtl"
      className="flex h-full w-full items-stretch overflow-hidden rounded-md"
      style={{ backgroundColor: sideColors.bgSoft }}
    >
      {/* در چیدمان راست به چپ، فرزند اول روی لبه راست می نشیند؛ برای نوار چپ
          ترتیب برعکس می شود تا نوار سمت چپ کارت بنشیند */}
      {barSide === 'right' ? (
        <>
          {bar}
          {text}
        </>
      ) : (
        <>
          {text}
          {bar}
        </>
      )}
    </div>
  )
}

/** a resting corner: the athlete of this corner has no opponent in this round */
export function ByeRow({ side }: { side: SlotSide }) {
  const theme = useTableTheme()
  const sideColors = theme.sides[side]
  return (
    <div
      dir="rtl"
      className="flex h-full w-full items-center justify-center rounded-md border border-dashed"
      style={{ borderColor: sideColors.borderSoft, backgroundColor: theme.byeBg }}
    >
      <span
        className="text-[11px] font-bold"
        style={{ color: sideColors.accent, opacity: 0.6 }}
      >
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
  const theme = useTableTheme()
  const sideColors = theme.sides[side]
  return (
    <div
      dir="rtl"
      className="flex h-full w-full items-center gap-2 rounded-md border border-dashed bg-white px-2"
      style={{ borderColor: sideColors.borderSoft }}
    >
      <Plus aria-hidden size={13} className="shrink-0" style={{ color: sideColors.accent, opacity: 0.6 }} />
      <span
        className="truncate text-right"
        style={{ fontSize: 12.5, color: sideColors.text, opacity: 0.6 }}
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
  const theme = useTableTheme()
  const sideColors = theme.sides[side]
  return (
    <div
      aria-hidden
      className="h-full w-full rounded-md"
      style={{ backgroundColor: emphasis ? sideColors.bg : sideColors.bgSoft }}
    />
  )
}

/**
 * جایگاه «برنده مسابقه N» — روی صفحه پایانیِ برگه های چند صفحه ای، جایی که
 * مسابقه های دور قبل روی صفحات نوار چیده شده اند. شماره از خود ساختار درخت
 * می آید و با رقم فارسی نشان داده می شود؛ در طرح کلاسیک نوارش مثل ردیف ها
 * آینه می شود و در طرح مدرن فقط رنگ ملایم گوشه می ماند.
 */
export function WinnerRow({
  matchNumber,
  side,
  barSide = 'right',
  design = 'classic',
}: {
  matchNumber: number
  side: SlotSide
  barSide?: BarSide
  design?: RowDesign
}) {
  const theme = useTableTheme()
  const sideColors = theme.sides[side]
  const label = (
    <FitText
      text={matchNumber > 0 ? `برنده مسابقه ${toFaDigits(matchNumber)}` : 'برنده دور قبل'}
      baseSize={10.5}
      minSize={7.5}
      align="center"
      className="font-bold"
      style={{ color: sideColors.accent }}
    />
  )
  if (design === 'modern') {
    return (
      <div
        dir="rtl"
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-md px-2"
        style={{ backgroundColor: sideColors.bgSoft }}
      >
        {label}
      </div>
    )
  }
  const bar = (
    <span aria-hidden className="shrink-0" style={{ width: 4.5, backgroundColor: sideColors.accent }} />
  )
  return (
    <div
      dir="rtl"
      className="flex h-full w-full items-center gap-2 overflow-hidden rounded-md px-2"
      style={{ backgroundColor: sideColors.bgSoft }}
    >
      {barSide === 'right' ? (
        <>
          {bar}
          {label}
        </>
      ) : (
        <>
          {label}
          {bar}
        </>
      )}
    </div>
  )
}

/**
 * جایگاه «بازنده مسابقه N» — دو گوشه مسابقه رده بندی باران مدال، جایی که
 * بازنده های دو نیمه نهایی برای مدال برنز به هم می رسند؛ مثل بقیه ردیف ها:
 * نوار آینه در کلاسیک، فقط رنگ ملایم گوشه در مدرن.
 */
export function LoserRow({
  matchNumber,
  side,
  barSide = 'right',
  design = 'classic',
}: {
  matchNumber: number
  side: SlotSide
  barSide?: BarSide
  design?: RowDesign
}) {
  const theme = useTableTheme()
  const sideColors = theme.sides[side]
  const label = (
    <FitText
      text={matchNumber > 0 ? `بازنده مسابقه ${toFaDigits(matchNumber)}` : 'بازنده دور قبل'}
      baseSize={10.5}
      minSize={7.5}
      align="center"
      className="font-bold"
      style={{ color: sideColors.accent }}
    />
  )
  if (design === 'modern') {
    return (
      <div
        dir="rtl"
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-md px-2"
        style={{ backgroundColor: sideColors.bgSoft }}
      >
        {label}
      </div>
    )
  }
  const bar = (
    <span aria-hidden className="shrink-0" style={{ width: 4.5, backgroundColor: sideColors.accent }} />
  )
  return (
    <div
      dir="rtl"
      className="flex h-full w-full items-center gap-2 overflow-hidden rounded-md px-2"
      style={{ backgroundColor: sideColors.bgSoft }}
    >
      {barSide === 'right' ? (
        <>
          {bar}
          {label}
        </>
      ) : (
        <>
          {label}
          {bar}
        </>
      )}
    </div>
  )
}
