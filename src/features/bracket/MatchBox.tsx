import type { ReactNode } from 'react'
import type { LayoutMatch, LayoutDims, PlanLeaf, SlotSide } from '../../core/bracket/layout.ts'
import { BRONZE_HEADER_HEIGHT } from '../../core/bracket/layout.ts'
import { LoserRow, PositionRow } from './SlotRows.tsx'
import { useTableTheme } from '../../lib/tableThemeContext.ts'
import type { SheetLayoutId } from '../../lib/sheetLayouts.ts'

interface MatchBoxProps {
  match: LayoutMatch
  roundCount: number
  dims: LayoutDims
  /** یک برگ درون جعبه — اسلات واقعی یا جایگاه «برنده مسابقه N» (null = ردیف بی نام)؛ مسابقه هم پاس می آید تا برگه تعاملی همسایه اسلات را بشناسد */
  renderLeaf: (leaf: PlanLeaf | null, side: SlotSide, match?: LayoutMatch) => ReactNode
  /** طرح جعبه — کلاسیک (پیش فرض)، مدرن: گوشه گردتر و سایه لطیف، تشریفاتی: گوشه crisp و سایه عمیق تر */
  design?: SheetLayoutId
}

/**
 * Shared match box view for the interactive canvas and the print sheet:
 * two corner rows — blue on top, red at the bottom — with no written labels.
 * The final's undecided corners show stronger tints. Walkover boxes (a corner
 * is «استراحت») keep a dashed border and carry no number badge. Match numbers
 * are solid badges anchored to the box edges by the layout, not drawn here.
 * خط و پس زمینه از تم جدول می آید — برگه تم انتخابی، بوم قرعه رنگ کلاسیک.
 */
export function MatchBox({ match, roundCount, dims, renderLeaf, design = 'classic' }: MatchBoxProps) {
  const theme = useTableTheme()
  // مدرن: گوشه های گردتر + سایه خیلی لطیف — جعبه ها از کاغذ جدا دیده می شوند؛
  // تشریفاتی: گوشه های جمع و سایه عمیق تر — حال و هوای سند قهرمانی
  const modern = design === 'modern'
  const royal = design === 'royal'
  const boxRadius = royal ? 6 : modern ? 12 : 8
  const modernShadow = modern
    ? '0 1px 3px rgba(15, 31, 56, 0.1)'
    : royal
      ? '0 2px 5px rgba(15, 31, 56, 0.14)'
      : undefined

  // مسابقه رده بندی باران مدال — سرتیتر «رده بندی» و دو ردیف «بازنده مسابقه N»
  if (match.bronze) {
    return (
      <div
        dir="ltr"
        className="relative h-full w-full"
        style={{
          borderRadius: boxRadius,
          border: `1.5px solid ${theme.bronzeBorder}`,
          backgroundColor: theme.boxBg,
          boxShadow: modernShadow,
        }}
      >
        <div
          dir="rtl"
          className="absolute flex items-center justify-center"
          style={{
            left: dims.boxPad,
            right: dims.boxPad,
            top: dims.boxPad,
            height: BRONZE_HEADER_HEIGHT,
          }}
        >
          <span
            className="font-bold"
            style={{ fontSize: 10, color: theme.bronzeLabel, letterSpacing: 1.5 }}
          >
            رده بندی
          </span>
        </div>
        {(
          [
            { side: 'chong', offset: match.topRowOffset, loser: match.topLoser },
            { side: 'hong', offset: match.bottomRowOffset, loser: match.bottomLoser },
          ] as const
        ).map((row) => (
          <div
            key={row.side}
            className="absolute"
            style={{
              left: dims.boxPad,
              right: dims.boxPad,
              top: row.offset - dims.cardHeight / 2,
              height: dims.cardHeight,
            }}
          >
            {row.loser != null && <LoserRow matchNumber={row.loser} side={row.side} design={design} />}
          </div>
        ))}
      </div>
    )
  }

  const isFinal = match.round === roundCount
  const border = isFinal
    ? `2px solid ${theme.finalAccent}`
    : match.contested
      ? `1.5px solid ${theme.boxBorder}`
      : `1.5px dashed ${theme.boxRestBorder}`

  const topLeaf: PlanLeaf | null = match.topSlotId
    ? { kind: 'slot', slotId: match.topSlotId }
    : match.topWinner
      ? { kind: 'winner', matchId: match.matchId, matchNumber: match.topWinner }
      : null
  const bottomLeaf: PlanLeaf | null = match.bottomSlotId
    ? { kind: 'slot', slotId: match.bottomSlotId }
    : match.bottomWinner
      ? { kind: 'winner', matchId: match.matchId, matchNumber: match.bottomWinner }
      : null

  const rows: { side: SlotSide; leaf: PlanLeaf | null; offset: number }[] = [
    { side: 'chong', leaf: topLeaf, offset: match.topRowOffset },
    { side: 'hong', leaf: bottomLeaf, offset: match.bottomRowOffset },
  ]

  return (
    <div
      dir="ltr"
      className="relative h-full w-full"
      style={{
        borderRadius: boxRadius,
        border,
        backgroundColor: theme.boxBg,
        boxShadow: modernShadow,
      }}
    >
      {rows.map((row) => (
        <div
          key={row.side}
          className="absolute"
          style={{
            left: dims.boxPad,
            right: dims.boxPad,
            top: row.offset - dims.cardHeight / 2,
            height: dims.cardHeight,
          }}
        >
          {/* گوشه های بی نام جعبه های میانی — ردیف ساکت رنگی، فینال پررنگ تر */}
          {row.leaf ? renderLeaf(row.leaf, row.side, match) : <PositionRow side={row.side} emphasis={isFinal} />}
        </div>
      ))}
    </div>
  )
}
