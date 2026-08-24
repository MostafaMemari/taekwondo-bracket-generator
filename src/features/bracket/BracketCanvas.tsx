import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { computeBracketLayout, interactiveLayoutDims } from '../../core/bracket/layout.ts'
import type { GroupDraw, Participant } from '../../core/types.ts'
import { useTournament } from '../../store/tournamentStore.ts'
import { roundLabel } from '../../lib/roundLabels.ts'
import { User } from 'lucide-react'
import { MatchBox } from './MatchBox.tsx'
import { SlotCard } from './SlotCard.tsx'

const dims = interactiveLayoutDims

export function BracketCanvas({ draw }: { draw: GroupDraw }) {
  const participants = useTournament((state) => state.participants)
  const moveParticipant = useTournament((state) => state.moveParticipant)
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const participantsById = useMemo(() => {
    const byId = new Map<string, Participant>()
    for (const participant of participants) byId.set(participant.id, participant)
    return byId
  }, [participants])

  const layout = useMemo(
    () => computeBracketLayout(draw.structure, dims),
    [draw.structure],
  )

  function slotIdFrom(event: DragStartEvent | DragEndEvent): string | undefined {
    const data = event.active.data.current as { slotId?: string } | undefined
    return data?.slotId
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveSlotId(null)
    const fromSlotId = slotIdFrom(event)
    const toSlotId = event.over?.id
    if (typeof fromSlotId === 'string' && typeof toSlotId === 'string' && fromSlotId !== toSlotId) {
      moveParticipant(draw.groupId, fromSlotId, toSlotId)
    }
  }

  function renderSlot(slotId: string) {
    const occupant = draw.assignments[slotId]
    return (
      <SlotCard
        slotId={slotId}
        occupant={occupant}
        participant={
          occupant.kind === 'participant'
            ? participantsById.get(occupant.participantId)
            : undefined
        }
      />
    )
  }

  const activeOccupant = activeSlotId ? draw.assignments[activeSlotId] : undefined
  const activeParticipant =
    activeOccupant?.kind === 'participant' ? participantsById.get(activeOccupant.participantId) : undefined

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(event) => setActiveSlotId(slotIdFrom(event) ?? null)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveSlotId(null)}
    >
      <div className="overflow-auto rounded-xl border border-line bg-surface">
        <div
          dir="ltr"
          className="relative"
          style={{
            width: layout.width,
            height: layout.height,
            backgroundImage: 'radial-gradient(#e6ebf3 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          <svg width={layout.width} height={layout.height} className="absolute inset-0">
            {layout.connectors.map((points, index) => (
              <polyline
                key={index}
                points={points.map((point) => `${point.x},${point.y}`).join(' ')}
                fill="none"
                stroke="#b9c5d6"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {layout.connectors.map((points, index) => {
              const start = points[0]
              return (
                <circle key={`dot-${index}`} cx={start.x} cy={start.y} r={3} fill="#b9c5d6" />
              )
            })}
          </svg>

          {layout.columns.map((column) => (
            <div
              key={column.round}
              dir="rtl"
              className="absolute -translate-x-1/2 whitespace-nowrap font-display text-sm text-ink-500"
              style={{ left: column.x, top: 24 }}
            >
              {roundLabel(column.round, draw.structure.roundCount)}
            </div>
          ))}

          {layout.matches.map((match) => (
            <div
              key={match.matchId}
              className="absolute transition-[left,top] duration-300"
              style={{ left: match.x, top: match.y, width: match.width, height: match.height }}
            >
              <MatchBox
                match={match}
                roundCount={draw.structure.roundCount}
                dims={dims}
                renderSlot={renderSlot}
              />
            </div>
          ))}

          {layout.cards.map((card) =>
            card.kind === 'bye-marker' ? (
              <div
                key={`bye-${card.slotId}`}
                dir="rtl"
                className="absolute flex items-center justify-center rounded-lg border-2 border-dashed border-line-strong bg-turf text-[11px] font-bold text-muted"
                style={{ left: card.x, top: card.y, width: dims.cardWidth, height: dims.cardHeight }}
              >
                استراحت (بای)
              </div>
            ) : (
              <div
                key={card.slotId}
                className="absolute transition-[left,top] duration-300"
                style={{ left: card.x, top: card.y, width: dims.cardWidth, height: dims.cardHeight }}
              >
                {renderSlot(card.slotId)}
              </div>
            ),
          )}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeParticipant ? (
          <div
            dir="rtl"
            className="flex w-[216px] flex-col gap-0.5 rounded-lg border border-mat-600 bg-surface px-3 py-1.5 shadow-lg"
          >
            <span className="truncate text-sm font-bold leading-5 text-ink-900">
              {activeParticipant.fullName}
            </span>
            <span className="flex items-center gap-1 truncate text-[11px] text-muted">
              <User size={11} />
              {activeParticipant.coachName}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
