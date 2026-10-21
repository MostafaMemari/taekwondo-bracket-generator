import type { Participant, SlotId } from '../types.ts'

export function resolveByePriorityTie(candidates: Participant[]): Participant {
  return [...candidates].sort((a, b) => a.sourceRow - b.sourceRow)[0]
}

export interface ByeSlotRef {
  slotId: SlotId
  /** match that owns this bye slot — used to keep teammates out of one match */
  matchId: string
}

export interface ByeAssignment {
  placements: Record<SlotId, string>
  remaining: Participant[]
}

/**
 * Byes go to the athletes of the biggest teams first, but two teammates are
 * never placed into the two bye slots of the SAME match when avoidable — a
 * deferred athlete simply falls back into the open (round 1) slots instead.
 */
export function assignByes(
  participants: Participant[],
  byeSlots: ByeSlotRef[],
  resolveTie: (candidates: Participant[]) => Participant = resolveByePriorityTie,
): ByeAssignment {
  const pool = [...participants]
  const placements: Record<SlotId, string> = {}
  const freeSlots = [...byeSlots]
  const matchCoaches = new Map<string, Set<string>>()
  const deferred: Participant[] = []

  function place(participant: Participant, ref: ByeSlotRef): void {
    placements[ref.slotId] = participant.id
    pool.splice(pool.indexOf(participant), 1)
    const coaches = matchCoaches.get(ref.matchId) ?? new Set<string>()
    coaches.add(participant.coachName)
    matchCoaches.set(ref.matchId, coaches)
  }

  while (freeSlots.length > 0 && pool.length > 0) {
    const studentsPerCoach = countStudentsPerCoach(pool)
    const maxStudents = Math.max(...studentsPerCoach.values())
    const candidates = pool.filter((p) => studentsPerCoach.get(p.coachName) === maxStudents)

    let placed = false
    for (const candidate of orderCandidates(candidates, resolveTie)) {
      const slotIndex = freeSlots.findIndex(
        (ref) => !matchCoaches.get(ref.matchId)?.has(candidate.coachName),
      )
      if (slotIndex >= 0) {
        place(candidate, freeSlots.splice(slotIndex, 1)[0])
        placed = true
        break
      }
    }

    if (!placed) {
      // every highest-priority athlete would face a teammate — defer one
      const candidate = resolveTie(candidates)
      pool.splice(pool.indexOf(candidate), 1)
      deferred.push(candidate)
    }
  }

  // participants ran out: deferred athletes take the remaining byes anyway
  for (const participant of deferred.splice(0)) {
    if (freeSlots.length === 0) {
      pool.push(participant)
      continue
    }
    place(participant, freeSlots.shift()!)
  }

  return { placements, remaining: pool }
}

function orderCandidates(
  candidates: Participant[],
  resolveTie: (candidates: Participant[]) => Participant,
): Participant[] {
  const list = [...candidates]
  const ordered: Participant[] = []
  while (list.length > 0) {
    const chosen = resolveTie(list)
    ordered.push(chosen)
    list.splice(list.indexOf(chosen), 1)
  }
  return ordered
}

function countStudentsPerCoach(participants: Participant[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const participant of participants) {
    counts.set(participant.coachName, (counts.get(participant.coachName) ?? 0) + 1)
  }
  return counts
}
