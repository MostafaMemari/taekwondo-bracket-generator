import type { Participant, SlotId } from '../types.ts'

export function resolveByePriorityTie(candidates: Participant[]): Participant {
  return [...candidates].sort((a, b) => a.sourceRow - b.sourceRow)[0]
}

export interface ByeAssignment {
  placements: Record<SlotId, string>
  remaining: Participant[]
}

export function assignByes(
  participants: Participant[],
  byeSlotIds: SlotId[],
  resolveTie: (candidates: Participant[]) => Participant = resolveByePriorityTie,
): ByeAssignment {
  const pool = [...participants]
  const placements: Record<SlotId, string> = {}

  for (const slotId of byeSlotIds) {
    if (pool.length === 0) break
    const studentsPerCoach = countStudentsPerCoach(pool)
    const maxStudents = Math.max(...studentsPerCoach.values())
    const candidates = pool.filter((p) => studentsPerCoach.get(p.coachName) === maxStudents)
    const chosen = resolveTie(candidates)
    placements[slotId] = chosen.id
    pool.splice(pool.indexOf(chosen), 1)
  }

  return { placements, remaining: pool }
}

function countStudentsPerCoach(participants: Participant[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const participant of participants) {
    counts.set(participant.coachName, (counts.get(participant.coachName) ?? 0) + 1)
  }
  return counts
}
