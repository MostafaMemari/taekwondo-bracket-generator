import { useDraggable } from '@dnd-kit/core'
import type { Participant } from '../../core/types.ts'
import type { SlotSide } from '../../core/bracket/layout.ts'
import type { BarSide } from './SlotRows.tsx'
import { AthleteRow } from './SlotRows.tsx'

interface ParticipantChipProps {
  slotId: string
  participant: Participant
  side: SlotSide
  nameFontSize?: number
  coachFontSize?: number
  showCoach?: boolean
  /** لبه نوار رنگی — نیمه چپ برگه «چپ» می گیرد */
  barSide?: BarSide
  /** جدول دستی: کلیک (بدون کشیدن) ویرایش نام/مربی را باز می کند */
  onEditStart?: () => void
}

/** draggable wrapper around the presentational athlete row */
export function ParticipantChip({
  slotId,
  participant,
  side,
  nameFontSize,
  coachFontSize,
  showCoach,
  barSide,
  onEditStart,
}: ParticipantChipProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `chip-${slotId}`,
    data: { slotId },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onEditStart}
      aria-label={`جابه جایی ${participant.fullName}`}
      title="برای جابه جایی بکش؛ برای ویرایش نام و مربی کلیک کن"
      className={`h-full w-full cursor-grab touch-none transition-opacity active:cursor-grabbing ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <AthleteRow
        participant={participant}
        side={side}
        nameFontSize={nameFontSize}
        coachFontSize={coachFontSize}
        showCoach={showCoach}
        barSide={barSide}
      />
    </div>
  )
}
