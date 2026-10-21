import type { Participant, SlotId } from '../types.ts'

export function distributeByCoach(
  participants: Participant[],
  openSlotIds: SlotId[],
): Record<SlotId, string> {
  const slots = [...openSlotIds]
  const placements: Record<SlotId, string> = {}
  const occupied = new Array<boolean>(slots.length).fill(false)

  for (const athletes of athletesGroupedByCoach(participants).values()) {
    const placedIndexes: number[] = []
    for (const athlete of athletes) {
      const index =
        placedIndexes.length === 0
          ? firstFreeIndex(occupied)
          : furthestFreeIndex(occupied, placedIndexes)
      occupied[index] = true
      placedIndexes.push(index)
      placements[slots[index]] = athlete.id
    }
  }

  return placements
}

function athletesGroupedByCoach(participants: Participant[]): Map<string, Participant[]> {
  const byCoach = new Map<string, Participant[]>()
  for (const participant of participants) {
    const list = byCoach.get(participant.coachName) ?? []
    list.push(participant)
    byCoach.set(participant.coachName, list)
  }
  const sorted = [...byCoach.entries()].sort((a, b) => b[1].length - a[1].length)
  return new Map(sorted)
}

function firstFreeIndex(occupied: boolean[]): number {
  return occupied.indexOf(false)
}

function furthestFreeIndex(occupied: boolean[], anchors: number[]): number {
  let bestIndex = -1
  let bestDistance = -1
  for (let index = 0; index < occupied.length; index += 1) {
    if (occupied[index]) continue
    const distance = Math.min(...anchors.map((anchor) => Math.abs(index - anchor)))
    if (distance > bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  }
  return bestIndex
}
