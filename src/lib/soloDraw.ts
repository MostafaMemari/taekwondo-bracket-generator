import type { GroupDraw, Participant } from '../core/types.ts'

export function findSoloParticipant(
  draw: GroupDraw,
  participantsById: Map<string, Participant>,
): Participant | null {
  if (draw.structure.roundCount !== 0 || draw.structure.leaves.length !== 1) return null
  const occupant = draw.assignments[draw.structure.leaves[0].slotId]
  if (!occupant || occupant.kind !== 'participant') return null
  return participantsById.get(occupant.participantId) ?? null
}
