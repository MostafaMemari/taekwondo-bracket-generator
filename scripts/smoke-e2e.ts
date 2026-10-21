import { readFile } from 'node:fs/promises'
import { generateGroupDraw } from '../src/core/bracket/generateGroupDraw.ts'
import { applySlotSwap } from '../src/core/bracket/applySlotSwap.ts'
import { parseRosterWorkbook } from '../src/core/excel/parseRosterWorkbook.ts'
import { groupByCategory } from '../src/core/grouping/groupByCategory.ts'
import { tournamentRules } from '../src/config/tournamentRules.ts'
import type { BracketStructure, GroupDraw } from '../src/core/types.ts'

let failures = 0

function check(label: string, condition: boolean): void {
  if (!condition) {
    failures += 1
    console.error(`FAIL: ${label}`)
  } else {
    console.log(`ok: ${label}`)
  }
}

interface TreeMatch {
  matchId: string
  slots: (string | undefined)[]
}

/** every match of the structure with the leaf slots that render inside it */
function allMatches(structure: BracketStructure): TreeMatch[] {
  const matches: TreeMatch[] = []
  function walk(node: typeof structure.root): void {
    if (node.kind === 'leaf') return
    matches.push({
      matchId: node.matchId,
      slots: [
        node.left.kind === 'leaf' && node.left.entryRound === 1 ? node.left.slotId : undefined,
        node.right.kind === 'leaf' && node.right.entryRound === 1 ? node.right.slotId : undefined,
      ],
    })
    walk(node.left)
    walk(node.right)
  }
  walk(structure.root)
  return matches
}

const buffer = await readFile('public/sample-registration.xlsx')
const roster = await parseRosterWorkbook(buffer)

check('sample parses 24 valid participants', roster.participants.length === 24)
check('sample reports the incomplete row', roster.issues.length === 1 && roster.issues[0].rowNumber === 26)

const groups = groupByCategory(roster.participants)
check('sample yields 6 groups', groups.length === 6)

const participantsById = new Map(roster.participants.map((p) => [p.id, p]))
const participantsRecord = Object.fromEntries(roster.participants.map((p) => [p.id, p]))
const draws = new Map<string, GroupDraw>()
for (const group of groups) {
  draws.set(group.id, generateGroupDraw(group, participantsRecord, tournamentRules))
}

for (const group of groups) {
  const groupId = group.id
  const draw = draws.get(groupId)!
  const slots = Object.values(draw.assignments)
  const placedIds = slots.filter((o) => o.kind === 'participant').map((o) => o.participantId)
  check(
    `group ${groupId}: all participants placed once`,
    placedIds.length === group.participantIds.length &&
      new Set(placedIds).size === placedIds.length,
  )

  const studentsPerCoach = new Map<string, number>()
  for (const id of group.participantIds) {
    const coach = participantsById.get(id)!.coachName
    studentsPerCoach.set(coach, (studentsPerCoach.get(coach) ?? 0) + 1)
  }
  const maxStudents = Math.max(...studentsPerCoach.values())

  // the first bye (walkover-winner) slot must go to a maximal-team athlete
  const restSet = new Set(draw.structure.restSlotIds)
  const firstByeSlot = draw.structure.leaves.find(
    (leaf) => leaf.entryRound > 1 && !restSet.has(leaf.slotId),
  )?.slotId
  if (firstByeSlot) {
    const occupant = draw.assignments[firstByeSlot]
    if (occupant.kind === 'participant') {
      const coach = participantsById.get(occupant.participantId)!.coachName
      check(
        `group ${groupId}: first bye goes to a maximal-team athlete`,
        studentsPerCoach.get(coach) === maxStudents,
      )
    }
  }

  // teammates never meet in the same match when avoidable
  const halfSlots = Math.ceil(group.participantIds.length / 2)
  for (const match of allMatches(draw.structure)) {
    const filled = match.slots.filter((slotId) => slotId !== undefined)
    if (filled.length < 2) continue
    const [a, b] = filled.map((slotId) => draw.assignments[slotId])
    if (a.kind !== 'participant' || b.kind !== 'participant') continue
    const coachA = participantsById.get(a.participantId)!.coachName
    const coachB = participantsById.get(b.participantId)!.coachName
    if (coachA === coachB && studentsPerCoach.get(coachA)! <= halfSlots) {
      failures += 1
      console.error(
        `FAIL: group ${groupId}: avoidable clash in ${match.matchId} between athletes of "${coachA}"`,
      )
    }
  }
  console.log(`ok: group ${groupId}: teammate clash rules respected`)
}

const fiveGroup = groups.find((g) => g.participantIds.length === 5)!
const fiveDraw = draws.get(fiveGroup.id)!
const participantSlotIds = Object.entries(fiveDraw.assignments)
  .filter(([, occupant]) => occupant.kind === 'participant')
  .map(([slotId]) => slotId)
const swapFrom = participantSlotIds[0]
const swapTo = participantSlotIds[2]
const swapResult = applySlotSwap(fiveDraw.assignments, swapFrom, swapTo)
check('swap changes assignments', JSON.stringify(swapResult) !== JSON.stringify(fiveDraw.assignments))
check(
  'swap twice restores original',
  JSON.stringify(applySlotSwap(swapResult!, swapFrom, swapTo)) ===
    JSON.stringify(fiveDraw.assignments),
)
check('swap onto itself rejected', applySlotSwap(fiveDraw.assignments, swapFrom, swapFrom) === null)

const restSlotId = fiveDraw.structure.restSlotIds[0]
if (restSlotId) {
  check(
    'swap onto a rest slot rejected',
    applySlotSwap(fiveDraw.assignments, swapFrom, restSlotId) === null,
  )
}

if (failures > 0) {
  console.error(`${failures} failure(s)`)
  process.exit(1)
}
console.log('All end-to-end checks passed.')
