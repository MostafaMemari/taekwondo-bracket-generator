import { useDraggable } from '@dnd-kit/core'
import { User } from 'lucide-react'
import type { Participant } from '../../core/types.ts'

interface ParticipantChipProps {
  slotId: string
  participant: Participant
}

export function ParticipantChip({ slotId, participant }: ParticipantChipProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `chip-${slotId}`,
    data: { slotId },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-label={`جابه‌جایی ${participant.fullName}`}
      className={`flex h-full w-full cursor-grab touch-none flex-col justify-center gap-0.5 rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-right transition-shadow hover:border-mat-600 hover:shadow-sm active:cursor-grabbing ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <span className="truncate text-sm font-bold leading-5 text-ink-900">
        {participant.fullName}
      </span>
      <span className="flex items-center gap-1 truncate text-[11px] leading-4 text-muted">
        <User size={11} className="shrink-0" />
        {participant.coachName}
      </span>
    </div>
  )
}
