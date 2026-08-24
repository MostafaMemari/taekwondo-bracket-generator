import type { TournamentRules } from '../../config/tournamentRules.ts'
import type {
  BracketStructure,
  CategoryGroup,
  GroupDraw,
  Participant,
  SlotAssignments,
} from '../types.ts'
import { assignByes } from './byeStrategy.ts'
import { buildBracketTree } from './buildBracketTree.ts'
import { distributeByCoach } from './coachSeparationStrategy.ts'

export function generateGroupDraw(
  group: CategoryGroup,
  participantsById: Record<string, Participant>,
  rules: TournamentRules,
): GroupDraw {
  const participants = group.participantIds
    .map((id) => participantsById[id])
    .sort((a, b) => a.sourceRow - b.sourceRow)

  const structure: BracketStructure = buildBracketTree(participants.length)
  const byeSlotIds = structure.leaves
    .filter((leaf) => leaf.entryRound > 1)
    .map((leaf) => leaf.slotId)
  const openSlotIds = structure.leaves
    .filter((leaf) => leaf.entryRound === 1)
    .map((leaf) => leaf.slotId)

  const byeAssignment = assignByes(participants, byeSlotIds, rules.resolveByePriorityTie)
  const openPlacements = distributeByCoach(byeAssignment.remaining, openSlotIds)

  const placements = { ...byeAssignment.placements, ...openPlacements }
  const assignments: SlotAssignments = {}
  for (const leaf of structure.leaves) {
    const participantId = placements[leaf.slotId]
    assignments[leaf.slotId] = participantId
      ? { kind: 'participant', participantId }
      : { kind: 'bye' }
  }

  return {
    groupId: group.id,
    group,
    structure,
    assignments,
    initialAssignments: { ...assignments },
    history: [],
  }
}
