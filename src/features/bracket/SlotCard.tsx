import { useDroppable } from '@dnd-kit/core'
import type { Participant, SlotOccupant } from '../../core/types.ts'
import type { SlotSide } from '../../core/bracket/layout.ts'
import type { BarSide } from './SlotRows.tsx'
import { ParticipantChip } from './ParticipantChip.tsx'
import { EmptySlotRow, ByeRow, PositionRow } from './SlotRows.tsx'
import { ManualSlotEditor } from './ManualSlotEditor.tsx'

/** کلیدهای ویرایش درون خانه — فقط جدول های دستی */
export interface ManualEditProps {
  editing: boolean
  onStart: () => void
  onSave: (patch: { fullName: string; coachName: string }) => void
  onEnd: () => void
}

interface SlotCardProps {
  slotId: string
  occupant: SlotOccupant
  participant?: Participant
  side: SlotSide
  nameFontSize?: number
  coachFontSize?: number
  showCoach?: boolean
  /** لبه نوار رنگی — نیمه چپ برگه «چپ» می گیرد */
  barSide?: BarSide
  /** جدول دستی: کلیک روی خانه، ورودی نام/مربی را باز می کند */
  manualEdit?: ManualEditProps
}

export function SlotCard({
  slotId,
  occupant,
  participant,
  side,
  nameFontSize,
  coachFontSize,
  showCoach,
  barSide,
  manualEdit,
}: SlotCardProps) {
  // rest slots («استراحت») are structural — nothing can be dropped on them
  const { setNodeRef, isOver } = useDroppable({
    id: slotId,
    disabled: occupant.kind !== 'participant',
  })

  function renderContent() {
    if (occupant.kind === 'bye') return <ByeRow side={side} />
    if (manualEdit && participant && manualEdit.editing) {
      return (
        <ManualSlotEditor
          participant={participant}
          side={side}
          onSave={manualEdit.onSave}
          onCancel={manualEdit.onEnd}
        />
      )
    }
    if (participant) {
      // خانه بی نام جدول دستی: دعوت به نوشتن به جای ردیف رنگی خالی
      if (manualEdit && participant.fullName.trim() === '') {
        return (
          <button
            type="button"
            onClick={manualEdit.onStart}
            title="نوشتن نام و مربی"
            className="h-full w-full cursor-text"
          >
            <EmptySlotRow side={side} />
          </button>
        )
      }
      return (
        <ParticipantChip
          slotId={slotId}
          participant={participant}
          side={side}
          nameFontSize={nameFontSize}
          coachFontSize={coachFontSize}
          showCoach={showCoach}
          barSide={barSide}
          onEditStart={manualEdit?.onStart}
        />
      )
    }
    return <PositionRow side={side} />
  }

  return (
    <div
      ref={setNodeRef}
      className={`h-full w-full rounded-md transition-shadow ${
        isOver ? 'ring-2 ring-mat-600 ring-offset-1' : ''
      }`}
    >
      {renderContent()}
    </div>
  )
}
