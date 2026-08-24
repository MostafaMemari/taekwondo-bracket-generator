import type { CategoryGroup, Participant, ParticipantId } from '../domain.ts';

const slug = (label: string): string =>
  label
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'na';

/**
 * Final grouping = (age category, weight category). Values are used as
 * opaque labels — never compared numerically. Insertion (Excel) order is
 * preserved so the categories page mirrors the source file.
 */
export function groupParticipants(roster: readonly Participant[]): CategoryGroup[] {
  const byKey = new Map<string, CategoryGroup>();
  for (const participant of roster) {
    const key = `${participant.ageCategory}||${participant.weightCategory}`;
    const existing = byKey.get(key);
    if (existing) {
      byKey.set(key, {
        ...existing,
        memberIds: [...existing.memberIds, participant.id],
      });
    } else {
      byKey.set(key, {
        groupId: `${slug(participant.ageCategory)}--${slug(participant.weightCategory)}`,
        ageCategory: participant.ageCategory,
        weightCategory: participant.weightCategory,
        memberIds: [participant.id],
      });
    }
  }
  return [...byKey.values()];
}

export function indexParticipantsById(roster: readonly Participant[]): Map<ParticipantId, Participant> {
  return new Map(roster.map((participant) => [participant.id, participant]));
}
