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

function firstRoundMatches(structure: BracketStructure) {
  const matches: { left?: string; right?: string }[] = []
  function walk(node: typeof structure.root): void {
    if (node.kind === 'leaf') return
    if (node.round === 1) {
      matches.push({
        left: node.left.kind === 'leaf' ? node.left.slotId : undefined,
        right: node.right.kind === 'leaf' ? node.right.slotId : undefined,
      })
    }
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

  const byeCount = draw.structure.byeSlotIds.length
  const byeCoachNames = draw.structure.byeSlotIds
    .map((slotId) => draw.assignments[slotId])
    .filter((o) => o.kind === 'participant')
    .map((o) => participantsById.get(o.participantId)!.coachName)
  check(`group ${groupId}: bye count is ${byeCount}`, byeCoachNames.length === byeCount)

  const studentsPerCoach = new Map<string, number>()
  for (const id of group.participantIds) {
    const coach = participantsById.get(id)!.coachName
    studentsPerCoach.set(coach, (studentsPerCoach.get(coach) ?? 0) + 1)
  }
  for (const coachName of byeCoachNames) {
    const maxStudents = Math.max(...studentsPerCoach.values())
    check(
      `group ${groupId}: bye coach "${coachName}" has maximal students`,
      studentsPerCoach.get(coachName) === maxStudents,
    )
  }

  let unavoidableClash = false
  for (const match of firstRoundMatches(draw.structure)) {
    if (!match.left || !match.right) continue
    const leftOccupant = draw.assignments[match.left]
    const rightOccupant = draw.assignments[match.right]
    if (leftOccupant.kind !== 'participant' || rightOccupant.kind !== 'participant') continue
    const leftCoach = participantsById.get(leftOccupant.participantId)!.coachName
    const rightCoach = participantsById.get(rightOccupant.participantId)!.coachName
    if (leftCoach !== rightCoach) continue
    const coachStudents = studentsPerCoach.get(leftCoach)!
    const halfSlots = Math.ceil(group.participantIds.length / 2)
    if (coachStudents > halfSlots) {
      unavoidableClash = true
      continue
    }
    failures += 1
    console.error(
      `FAIL: group ${groupId}: avoidable round-1 clash between athletes of "${leftCoach}"`,
    )
  }
  void unavoidableClash
}

const fiveGroup = groups.find((g) => g.participantIds.length === 5)!
const fiveDraw = draws.get(fiveGroup.id)!
const slotIds = Object.keys(fiveDraw.assignments)
const swapResult = applySlotSwap(fiveDraw.assignments, slotIds[0], slotIds[2])
check('swap changes assignments', JSON.stringify(swapResult) !== JSON.stringify(fiveDraw.assignments))
check(
  'swap twice restores original',
  JSON.stringify(applySlotSwap(swapResult!, slotIds[0], slotIds[2])) ===
    JSON.stringify(fiveDraw.assignments),
)
check('swap onto itself rejected', applySlotSwap(fiveDraw.assignments, slotIds[0], slotIds[0]) === null)

if (failures > 0) {
  console.error(`${failures} failure(s)`)
  process.exit(1)
}
console.log('All end-to-end checks passed.')
