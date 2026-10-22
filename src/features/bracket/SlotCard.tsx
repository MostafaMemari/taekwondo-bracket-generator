import { useDraggable, useDroppable } from '@dnd-kit/core'
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
  /**
   * گوشه «استراحت»: اسلات همسایه (صاحب کنونی استراحت). وقتی پر شود این خانه
   * هم قابل کشیدن است هم قابل رها کردن — کشیدن استراحت روی هر هنرجو یا رها
   * کردن هنرجو روی این گوشه، جای صاحب کنونی استراحت و مقصد را عوض می کند.
   * خود اسلات استراحت ثابت می ماند (ساختار جدول دست نمی خورد) پس شماره
   * مسابقه ها همیشه درست می ماند.
   */
  restSwapSlotId?: string | null
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
  restSwapSlotId,
}: SlotCardProps) {
  const restSwap = occupant.kind === 'bye' && restSwapSlotId ? restSwapSlotId : undefined

  // rest slots («استراحت») are structural — a plain rest corner still accepts
  // nothing, but when it has a sibling owner it accepts the drop on the
  // sibling's behalf: dropping an athlete here swaps the two of them
  const { setNodeRef, isOver } = useDroppable({
    id: restSwap ? `rest-${slotId}` : slotId,
    disabled: restSwap ? false : occupant.kind !== 'participant',
    data: { slotId: restSwap ?? slotId },
  })

  // the rest corner itself is draggable — carry the sibling owner's slot id
  // so the swap logic stays a plain participant-to-participant move
  const restDrag = useDraggable({
    id: `rest-chip-${slotId}`,
    data: { slotId: restSwap ?? slotId, isRest: true },
    disabled: !restSwap,
  })

  function renderContent() {
    if (occupant.kind === 'bye') {
      const row = <ByeRow side={side} />
      if (!restSwap) return row
      return (
        <div
          ref={restDrag.setNodeRef}
          {...restDrag.listeners}
          {...restDrag.attributes}
          title="بکش و روی هنرجوی دلخواه رها کن تا استراحت به او برسد — یا هنرجو را روی همین خانه رها کن"
          aria-label="انتقال استراحت به هنرجوی دیگر"
          className={`h-full w-full cursor-grab touch-none transition-opacity active:cursor-grabbing ${
            restDrag.isDragging ? 'opacity-30' : ''
          }`}
        >
          {row}
        </div>
      )
    }
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
