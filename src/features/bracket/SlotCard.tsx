import { useDroppable } from '@dnd-kit/core'
import type { Participant, SlotOccupant } from '../../core/types.ts'
import { ParticipantChip } from './ParticipantChip.tsx'

interface SlotCardProps {
  slotId: string
  occupant: SlotOccupant
  participant?: Participant
}

export function SlotCard({ slotId, occupant, participant }: SlotCardProps) {
  const { setNodeRef, isOver } = useDroppable({ id: slotId })

  if (occupant.kind === 'bye') {
    return (
      <div
        dir="rtl"
        className="flex h-full w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-line-strong bg-turf px-3 text-center"
      >
        <span className="text-xs font-bold text-muted">استراحت</span>
        <span className="text-[10px] text-muted">(بای — بازی ندارد)</span>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      dir="rtl"
      className={`h-full w-full rounded-lg transition-shadow ${
        isOver ? 'ring-2 ring-mat-600 ring-offset-1' : ''
      }`}
    >
      {participant ? (
        <ParticipantChip slotId={slotId} participant={participant} />
      ) : (
        <div className="h-full w-full rounded-lg border border-dashed border-hogu-600 bg-hogu-100" />
      )}
    </div>
  )
}
