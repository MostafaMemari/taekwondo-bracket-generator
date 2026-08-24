import { assignByes } from '../src/core/bracket/byeStrategy.ts'
import { buildBracketTree } from '../src/core/bracket/buildBracketTree.ts'
import { distributeByCoach } from '../src/core/bracket/coachSeparationStrategy.ts'
import { generateGroupDraw } from '../src/core/bracket/generateGroupDraw.ts'
import { computeBracketLayout } from '../src/core/bracket/layout.ts'
import { tournamentRules } from '../src/config/tournamentRules.ts'
import { groupByCategory } from '../src/core/grouping/groupByCategory.ts'
import type { Participant } from '../src/core/types.ts'

let failures = 0

function check(label: string, condition: boolean): void {
  if (!condition) {
    failures += 1
    console.error(`FAIL: ${label}`)
  } else {
    console.log(`ok: ${label}`)
  }
}

function makeParticipants(counts: Record<string, number>): Participant[] {
  const participants: Participant[] = []
  let row = 2
  for (const [coachName, n] of Object.entries(counts)) {
    for (let i = 0; i < n; i += 1) {
      participants.push({
        id: `${coachName}-${i}`,
        fullName: `ورزشکار ${coachName} ${i + 1}`,
        coachName,
        ageCategory: 'کودکان',
        weightCategory: '۲۸-',
        sourceRow: row++,
      })
    }
  }
  return participants
}

for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 12]) {
  const structure = buildBracketTree(n)
  check(`N=${n} leaves == participants`, structure.leaves.length === n)
  const matches = structure.roundCount
  check(`N=${n} roundCount >= 1`, matches >= 1)

  const collected: string[] = []
  function walk(node: typeof structure.root): void {
    if (node.kind === 'leaf') {
      collected.push(node.slotId)
      return
    }
    walk(node.left)
    walk(node.right)
  }
  walk(structure.root)
  check(`N=${n} unique slot ids`, new Set(collected).size === n)
}

const five = buildBracketTree(5)
check('N=5 has exactly one bye', five.byeSlotIds.length === 1)
check('N=5 has three rounds', five.roundCount === 3)
const fiveFirstRoundMatches: number[] = []
function collectRound(node: typeof five.root, out: number[]): void {
  if (node.kind === 'match') {
    if (node.round === 1) out.push(node.matchNumber)
    collectRound(node.left, out)
    collectRound(node.right, out)
  }
}
collectRound(five.root, fiveFirstRoundMatches)
check('N=5 first round has two matches', fiveFirstRoundMatches.length === 2)

const three = buildBracketTree(3)
check('N=3 has one bye entering round 2', three.byeSlotIds.length === 1)
const byeLeaf = three.leaves.find((l) => l.entryRound > 1)!
check('N=3 bye enters semifinal (round 2)', byeLeaf.entryRound === 2)

const rezaei = makeParticipants({ 'رضایی': 3, 'محمدی': 2 })
const structure5 = buildBracketTree(5)
const byeAssignment = assignByes(rezaei, structure5.byeSlotIds)
const byeParticipant = rezaei.find((p) => p.id === byeAssignment.placements[structure5.byeSlotIds[0]])
check('bye goes to coach with most students', byeParticipant?.coachName === 'رضایی')

const spread = distributeByCoach(rezaei, ['s1', 's2', 's3', 's4', 's5'])
const positionsOfRezaei = Object.entries(spread)
  .filter(([, id]) => id.startsWith('رضایی'))
  .map(([slot]) => Number(slot.replace('s', '')))
  .sort((a, b) => a - b)
check(
  'same-coach athletes are not adjacent',
  positionsOfRezaei.every((a, i) => i === 0 || a - positionsOfRezaei[i - 1] >= 2),
)

const group = groupByCategory(rezaei)[0]
const draw = generateGroupDraw(group, Object.fromEntries(rezaei.map((p) => [p.id, p])), tournamentRules)
const occupants = Object.values(draw.assignments)
const participantSlots = occupants.filter((o) => o.kind === 'participant')
check('every slot filled', occupants.length === 5)
check('all participants placed exactly once', participantSlots.length === 5)
check('history starts empty', draw.history.length === 0)

const layout = computeBracketLayout(draw.structure, {
  cardWidth: 200,
  cardHeight: 50,
  rowHeight: 70,
  columnPitch: 260,
  padX: 20,
  padTop: 50,
  padBottom: 20,
  matchHeaderHeight: 24,
  matchInnerGap: 8,
})
check(
  'layout has no NaN coordinates',
  [...layout.cards, ...layout.matches].every(
    (item) => Number.isFinite(item.x) && Number.isFinite(item.y),
  ),
)
check('width and height positive', layout.width > 0 && layout.height > 0)
check('columns match rounds', layout.columns.length === draw.structure.roundCount)

const single = buildBracketTree(1)
check('N=1 single leaf, zero rounds', single.leaves.length === 1 && single.roundCount === 0)
const singleLayout = computeBracketLayout(single, {
  cardWidth: 200,
  cardHeight: 50,
  rowHeight: 70,
  columnPitch: 260,
  padX: 20,
  padTop: 50,
  padBottom: 20,
  matchHeaderHeight: 24,
  matchInnerGap: 8,
})
check('N=1 layout renders one card area', singleLayout.width > 0)

if (failures > 0) {
  console.error(`${failures} failure(s)`)
  process.exit(1)
}
console.log('All core checks passed.')
