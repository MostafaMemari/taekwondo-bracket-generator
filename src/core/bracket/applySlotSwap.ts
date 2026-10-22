import type { SlotAssignments } from '../types.ts'

/**
 * Swap two slot occupants — participant with participant, or participant
 * with rest («استراحت»). The structure (matchId / matchNumber) never moves;
 * only the two occupants trade places, so the numbering always stays right.
 * A rest-to-rest swap is a no-op and is rejected.
 */
export function applySlotSwap(
  assignments: SlotAssignments,
  fromSlotId: string,
  toSlotId: string,
): SlotAssignments | null {
  const fromOccupant = assignments[fromSlotId]
  const toOccupant = assignments[toSlotId]
  if (!fromOccupant || !toOccupant || fromSlotId === toSlotId) return null
  // حداقل یک طرف باید هنرجو باشد — جابه‌جایی استراحت با استراحت بی معنی است
  if (fromOccupant.kind !== 'participant' && toOccupant.kind !== 'participant') return null

  return {
    ...assignments,
    [fromSlotId]: toOccupant,
    [toSlotId]: fromOccupant,
  }
}
