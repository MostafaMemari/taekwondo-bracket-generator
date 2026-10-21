import type { GroupDraw, Participant } from '../core/types.ts'

export interface CoachRow {
  coach: string
  athletes: Participant[]
  /** هنرجوهایی که دور اول استراحت اند (بای) */
  byeAthleteIds: Set<string>
}

/**
 * فهرست مربی های یک وزن با هنرجوهایشان — مرتب از بیشترین تعداد هنرجو به
 * کمترین؛ همان قانون استراحت مربی: مربیِ هنرجوهای بیشتر اولویت استراحت دارد.
 * هم پنل شناور بوم قرعه و هم نوار مربی های «حالت جدولی» از همین می آیند.
 */
export function coachRowsOf(
  draw: GroupDraw,
  participantsById: Map<string, Participant>,
): CoachRow[] {
  const byCoach = new Map<string, Participant[]>()
  const groupAthletes = draw.group.participantIds
    .map((id) => participantsById.get(id))
    .filter((participant): participant is Participant => Boolean(participant))
    .sort((a, b) => a.sourceRow - b.sourceRow)
  for (const participant of groupAthletes) {
    const key = participant.coachName.trim() || 'بدون مربی'
    const list = byCoach.get(key) ?? []
    list.push(participant)
    byCoach.set(key, list)
  }
  const byes = byeAthleteIdsOf(draw)
  return [...byCoach.entries()]
    .map(([coach, athletes]) => ({ coach, athletes, byeAthleteIds: byes }))
    .sort(
      (a, b) =>
        b.athletes.length - a.athletes.length || a.coach.localeCompare(b.coach, 'fa'),
    )
}

/** شناسه هنرجوهایی که با بای وارد می شوند (دور اول استراحت اند) */
export function byeAthleteIdsOf(draw: GroupDraw): Set<string> {
  const restSlots = new Set(draw.structure.restSlotIds)
  const ids = new Set<string>()
  for (const leaf of draw.structure.leaves) {
    if (leaf.entryRound <= 1 || restSlots.has(leaf.slotId)) continue
    const occupant = draw.assignments[leaf.slotId]
    if (occupant.kind === 'participant') ids.add(occupant.participantId)
  }
  return ids
}

/**
 * خانه (اسلات) یک هنرجو در درخت قرعه — برای تعویض جایگاه دو نفر: انتقال
 * استراحت از یک هنرجو به هنرجوی دیگر همان است که جای دو اسلات عوض شود.
 */
export function slotIdOfParticipant(draw: GroupDraw, participantId: string): string | null {
  for (const leaf of draw.structure.leaves) {
    const occupant = draw.assignments[leaf.slotId]
    if (occupant.kind === 'participant' && occupant.participantId === participantId) {
      return leaf.slotId
    }
  }
  return null
}
