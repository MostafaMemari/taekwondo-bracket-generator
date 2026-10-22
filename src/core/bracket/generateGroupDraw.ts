import type { TournamentRules } from '../../config/tournamentRules.ts'
import type { ByeMajorityId, DrawTypeId } from '../../lib/drawModes.ts'
import type {
  BracketStructure,
  BracketStructureNode,
  CategoryGroup,
  GroupDraw,
  Participant,
  SlotAssignments,
  StructureLeaf,
} from '../types.ts'
import { assignByes, type ByeSlotRef } from './byeStrategy.ts'
import { buildBracketTree } from './buildBracketTree.ts'
import { distributeByCoach } from './coachSeparationStrategy.ts'
import { attachBronzeMatch } from './medalRain.ts'

export interface GenerateDrawOptions {
  /** مسابقه رده بندی باران مدال — فقط روی جدول ۴ نفره اثر می گذارد */
  bronze?: boolean
  /** نوع قرعه کشی — پیش فرض جداسازی هم تیمی ها (رفتار همیشگی) */
  drawType?: DrawTypeId
  /** جایگاه استراحت ها — پیش فرض آینه ای دو طرف (رفتار همیشگی) */
  byePlacement?: 'mirror' | 'belowName'
  /** اکثریت استراحت ها — فقط در چیدمان «همیشه زیر اسم»؛ پیش فرض راست */
  byeMajority?: ByeMajorityId
}

export function generateGroupDraw(
  group: CategoryGroup,
  participantsById: Record<string, Participant>,
  rules: TournamentRules,
  options: GenerateDrawOptions = {},
): GroupDraw {
  const participants = group.participantIds
    .map((id) => participantsById[id])
    .sort((a, b) => a.sourceRow - b.sourceRow)

  const built = buildBracketTree(participants.length, {
    byePlacement: options.byePlacement,
    byeMajority: options.byeMajority,
  })
  const structure: BracketStructure = options.bronze ? attachBronzeMatch(built) : built

  // Walkover winners' slots: the athletes who skip round 1. Byes go to the
  // biggest teams first, so teammates avoid clashing as soon as possible.
  const byeSlotRefs: ByeSlotRef[] = []
  const openSlotIds: string[] = []
  const restSlotIds = new Set(structure.restSlotIds)
  function walk(node: BracketStructureNode): void {
    if (node.kind === 'leaf') return
    for (const child of [node.left, node.right]) {
      if (child.kind === 'leaf') {
        const leaf = child as StructureLeaf
        if (leaf.entryRound > 1 && !restSlotIds.has(leaf.slotId)) {
          byeSlotRefs.push({ slotId: leaf.slotId, matchId: node.matchId })
        }
        if (leaf.entryRound === 1) openSlotIds.push(leaf.slotId)
      }
    }
    walk(node.left)
    walk(node.right)
  }
  walk(structure.root)
  // a lone athlete's bracket is a single leaf root — still an open slot
  if (structure.root.kind === 'leaf') {
    openSlotIds.push((structure.root as StructureLeaf).slotId)
  }

  const placements: Record<string, string> = {}
  if (options.drawType === 'random') {
    // قرعه کشی کاملا تصادفی — فیش ها بُر می خورد و به ترتیب روی خانه های
    // استراحت گیرنده (دور یک را از دست می دهد) و خانه های آزاد می نشیند؛
    // خانه های خالی ساختاری همان استراحت های برگه می مانند
    const shuffled = [...participants]
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1))
      ;[shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]]
    }
    let cursor = 0
    for (const ref of byeSlotRefs) placements[ref.slotId] = shuffled[cursor++]!.id
    for (const slotId of openSlotIds) placements[slotId] = shuffled[cursor++]!.id
  } else {
    const byeAssignment = assignByes(participants, byeSlotRefs, rules.resolveByePriorityTie)
    const openPlacements = distributeByCoach(byeAssignment.remaining, openSlotIds)
    Object.assign(placements, byeAssignment.placements, openPlacements)
  }
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
