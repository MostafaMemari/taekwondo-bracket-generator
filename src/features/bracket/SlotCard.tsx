import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { Participant, SlotOccupant } from '../../core/types.ts'
import type { SlotSide } from '../../core/bracket/layout.ts'
import type { BarSide } from './SlotRows.tsx'
import { ParticipantChip } from './ParticipantChip.tsx'
import { EmptySlotRow, ByeRow, PositionRow } from './SlotRows.tsx'
import { ManualSlotEditor } from './ManualSlotEditor.tsx'

/** کلیدهای ویرایش درون خانه — همه جدول ها: دستی، باران مدال و واقعی */
export interface SlotEditProps {
  editing: boolean
  onStart: () => void
  onSave: (patch: { fullName: string; coachName: string }) => void
  onEnd: () => void
  /** حذف هنرجو از این خانه — دکمه سطل زباله داخل ویرایشگر */
  onDelete?: () => void
  /** جمله تایید حذف — جدول دستی و جدول واقعی جمله خودشان را دارند */
  deleteConfirmText?: string
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
  /** کلیک روی هنرجو، ورودی نام/مربی را باز می کند */
  slotEdit?: SlotEditProps
  /** کلیک روی خانه استراحت — گفت وگوی «افزودن هنرجو» را باز می کند */
  onRestClick?: (slotId: string) => void
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
  slotEdit,
  onRestClick,
}: SlotCardProps) {
  const isBye = occupant.kind === 'bye'

  // هر خانه پذیرنده رها کردن است — خانه استراحت هم شناسه خودش را می فرستد تا
  // رها کردن هنرجو روی آن، دو خانه را کامل عوض کند
  const { setNodeRef, isOver } = useDroppable({
    id: isBye ? `rest-${slotId}` : slotId,
    disabled: !isBye && occupant.kind !== 'participant',
    data: { slotId },
  })

  // گوشه «استراحت» خودش قابل کشیدن است — شناسه اسلات خودش را حمل می کند تا
  // روی هر هنرجویی که رها شود، استراحت همان جا بنشیند
  const restDrag = useDraggable({
    id: `rest-chip-${slotId}`,
    data: { slotId, isRest: true },
    disabled: !isBye,
  })

  function renderContent() {
    if (occupant.kind === 'bye') {
      return (
        <div
          ref={restDrag.setNodeRef}
          {...restDrag.listeners}
          {...restDrag.attributes}
          onClick={onRestClick ? () => onRestClick(slotId) : undefined}
          title="برای افزودن هنرجو کلیک کن، یا بکش و روی هر خانه ای رها کن تا استراحت همان جا بنشیند"
          aria-label="انتقال استراحت یا افزودن هنرجو"
          className={`h-full w-full cursor-grab touch-none transition-opacity active:cursor-grabbing ${
            restDrag.isDragging ? 'opacity-30' : ''
          }`}
        >
          <ByeRow side={side} />
        </div>
      )
    }
    if (slotEdit && participant && slotEdit.editing) {
      return (
        <ManualSlotEditor
          participant={participant}
          side={side}
          onSave={slotEdit.onSave}
          onCancel={slotEdit.onEnd}
          onDelete={slotEdit.onDelete}
          deleteConfirmText={slotEdit.deleteConfirmText}
        />
      )
    }
    if (participant) {
      // خانه بی نام جدول دستی: دعوت به نوشتن به جای ردیف رنگی خالی
      if (slotEdit && participant.fullName.trim() === '') {
        return (
          <button
            type="button"
            onClick={slotEdit.onStart}
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
          onEditStart={slotEdit?.onStart}
        />
      )
    }
    return <PositionRow side={side} />
  }

  return (
    <div
      ref={setNodeRef}
      data-slot-id={slotId}
      data-rest={isBye ? 'true' : undefined}
      className={`h-full w-full rounded-md transition-shadow ${
        isOver ? 'ring-2 ring-mat-600 ring-offset-1' : ''
      }`}
    >
      {renderContent()}
    </div>
  )
}
