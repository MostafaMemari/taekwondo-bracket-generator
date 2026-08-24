import type { SlotAssignments } from '../types.ts'

export function applySlotSwap(
  assignments: SlotAssignments,
  fromSlotId: string,
  toSlotId: string,
): SlotAssignments | null {
  const fromOccupant = assignments[fromSlotId]
  const toOccupant = assignments[toSlotId]
  if (!fromOccupant || !toOccupant || fromSlotId === toSlotId) return null
  if (fromOccupant.kind !== 'participant') return null

  return {
    ...assignments,
    [fromSlotId]: toOccupant,
    [toSlotId]: fromOccupant,
  }
}
