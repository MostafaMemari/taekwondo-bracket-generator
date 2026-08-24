import type { CategoryGroup, Participant } from '../types.ts'

export function groupByCategory(participants: Participant[]): CategoryGroup[] {
  const groups = new Map<string, CategoryGroup>()
  for (const participant of participants) {
    const id = `${participant.ageCategory}__${participant.weightCategory}`
    const existing = groups.get(id)
    if (existing) {
      existing.participantIds.push(participant.id)
    } else {
      groups.set(id, {
        id,
        ageCategory: participant.ageCategory,
        weightCategory: participant.weightCategory,
        participantIds: [participant.id],
      })
    }
  }
  return [...groups.values()]
}
