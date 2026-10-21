import { assignByes } from '../src/core/bracket/byeStrategy.ts'
import { buildBracketTree } from '../src/core/bracket/buildBracketTree.ts'
import { distributeByCoach } from '../src/core/bracket/coachSeparationStrategy.ts'
import { generateGroupDraw } from '../src/core/bracket/generateGroupDraw.ts'
import {
  attachBronzeMatch,
  medalRainPoolSizes,
  splitMedalRainPools,
} from '../src/core/bracket/medalRain.ts'
import {
  BAND_ROWS,
  buildStagedPrintPlans,
  computeBracketLayout,
  computePlanLayout,
  fitPrintDims,
} from '../src/core/bracket/layout.ts'
import { tournamentRules } from '../src/config/tournamentRules.ts'
import { groupByCategory } from '../src/core/grouping/groupByCategory.ts'
import { buildSchedule, flattenGroupMatches } from '../src/core/schedule/schedule.ts'
import type { BracketStructureNode, Participant } from '../src/core/types.ts'
import { realMatchCount } from '../src/lib/drawStats.ts'
import { beltPresets, resolveBeltLabel } from '../src/lib/belts.ts'
import {
  classicTheme,
  tableThemeById,
  tableThemes,
} from '../src/lib/tableThemes.ts'
import {
  defaultMatchChipStyle,
  matchChipFactor,
  matchChipModes,
  matchChipPalette,
  matchChipRadius,
  matchChipSizeOptions,
  normalizeMatchChipSize,
  normalizeMatchChipStyle,
  type MatchChipSize,
  type MatchChipStyle,
} from '../src/lib/matchChipStyles.ts'

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
        weightKg: '',
        sourceRow: row++,
      })
    }
  }
  return participants
}

/** power-of-two sheet sizes for every participant count */
const expectedSize = (n: number): number => 2 ** Math.ceil(Math.log2(Math.max(n, 2)))

for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 16, 17, 33]) {
  const structure = buildBracketTree(n)
  const size = n === 1 ? 1 : expectedSize(n)
  check(`N=${n} bracketSize is ${size}`, structure.bracketSize === size)
  check(`N=${n} leaves == bracketSize`, structure.leaves.length === size)
  check(`N=${n} rest slots == size - n`, structure.restSlotIds.length === size - n)

  const collected: string[] = []
  function walk(node: BracketStructureNode): void {
    if (node.kind === 'leaf') {
      collected.push(node.slotId)
      return
    }
    check(`N=${n} match ${node.matchId} round sane`, node.round >= 1 && node.round <= structure.roundCount)
    walk(node.left)
    walk(node.right)
  }
  walk(structure.root)
  check(`N=${n} unique slot ids`, new Set(collected).size === size)

  // contested matches eliminate exactly one athlete each
  let contested = 0
  let walkovers = 0
  function countMatches(node: BracketStructureNode): void {
    if (node.kind === 'leaf') return
    if (node.matchNumber > 0) contested += 1
    else walkovers += 1
    countMatches(node.left)
    countMatches(node.right)
  }
  countMatches(structure.root)
  check(`N=${n} contested == n-1`, contested === n - 1)
  check(`N=${n} numbering has no gaps`, contested + walkovers === size - 1)
}

const five = buildBracketTree(5)
check('N=5 sheet of 8, three rounds', five.bracketSize === 8 && five.roundCount === 3)
check('N=5 three rest slots', five.restSlotIds.length === 3)

const roundStats = new Map<number, { total: number; contested: number }>()
function stats(node: typeof five.root): void {
  if (node.kind === 'leaf') return
  const entry = roundStats.get(node.round) ?? { total: 0, contested: 0 }
  entry.total += 1
  if (node.matchNumber > 0) entry.contested += 1
  roundStats.set(node.round, entry)
  stats(node.left)
  stats(node.right)
}
stats(five.root)
check('N=5 round 1 has four matches, one contested', roundStats.get(1)?.total === 4 && roundStats.get(1)?.contested === 1)
check('N=5 round 2 has two contested semis', roundStats.get(2)?.total === 2 && roundStats.get(2)?.contested === 2)
check('N=5 round 3 is only the final', roundStats.get(3)?.total === 1 && roundStats.get(3)?.contested === 1)

// user rule: 5 athletes → 3 on the first side (2 fight, the lone one waits
// below with a bye), 2 on the other side (both wait for the semifinal)
function halfParticipants(node: typeof five.root, side: 'left' | 'right'): number {
  const sub = node[side]
  let count = 0
  function walk(current: typeof five.root): void {
    if (current.kind === 'leaf') {
      count += current.entryRound > 0 && !five.restSlotIds.includes(current.slotId) ? 1 : 0
      return
    }
    walk(current.left)
    walk(current.right)
  }
  walk(sub)
  return count
}
check('N=5 first side holds 3 athletes', halfParticipants(five.root, 'left') === 3)
check('N=5 second side holds 2 athletes', halfParticipants(five.root, 'right') === 2)

const three = buildBracketTree(3)
check('N=3 sheet of 4 with one rest slot', three.bracketSize === 4 && three.restSlotIds.length === 1)
const waitingLeaf = three.leaves.find((l) => l.entryRound === 2)!
check('N=3 waiting athlete enters the final round', waitingLeaf.entryRound === 2)

const two = buildBracketTree(2)
check('N=2 is a single final', two.roundCount === 1 && two.bracketSize === 2)

const rezaei = makeParticipants({ 'رضایی': 3, 'محمدی': 2 })
const structure5 = buildBracketTree(5)
const restSet = new Set(structure5.restSlotIds)
const waitSlots = structure5.leaves
  .filter((leaf) => leaf.entryRound > 1 && !restSet.has(leaf.slotId))
  .map((leaf) => ({ slotId: leaf.slotId, matchId: 'm' }))
check('N=5 has three bye slots for the biggest teams', waitSlots.length === 3)
const byeAssignment = assignByes(rezaei, waitSlots)
const byeParticipant = rezaei.find((p) => p.id === byeAssignment.placements[waitSlots[0].slotId])
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
check('every athlete slot filled, rest slots empty', participantSlots.length === 5 && occupants.length === 8)
check('all participants placed exactly once', new Set(participantSlots.map((o) => o.participantId)).size === 5)
check('history starts empty', draw.history.length === 0)

// every non-rest slot is filled exactly once, for every size
for (let n = 2; n <= 12; n += 1) {
  const squad = makeParticipants({ 'الف': n })
  const g = groupByCategory(squad)[0]
  const d = generateGroupDraw(g, Object.fromEntries(squad.map((p) => [p.id, p])), tournamentRules)
  const placed = Object.values(d.assignments).filter((o) => o.kind === 'participant')
  const filledSlots = Object.entries(d.assignments).filter(([, o]) => o.kind === 'participant')
  check(
    `N=${n} draw fills every non-rest slot once`,
    placed.length === n &&
      new Set(placed.map((o) => o.participantId)).size === n &&
      filledSlots.length === d.structure.bracketSize - d.structure.restSlotIds.length,
  )
}

const layout = computeBracketLayout(draw.structure, {
  cardWidth: 200,
  cardHeight: 50,
  rowHeight: 70,
  columnPitch: 260,
  padX: 20,
  padTop: 50,
  padBottom: 20,
  boxPad: 6,
  innerGap: 8,
  chipSize: 22,
})
check('layout has no NaN coordinates',
  layout.matches.every(
    (item) => Number.isFinite(item.x) && Number.isFinite(item.y),
  ),
)
check('width and height positive', layout.width > 0 && layout.height > 0)
// converging layout: one label per round per side + the centred final
check('columns cover both sides plus final', layout.columns.length === 2 * draw.structure.roundCount - 1)
const finalColumn = layout.columns[0]
check('final column is centred', Math.abs(finalColumn.x - layout.width / 2) < 0.01)
check('final match is the widest-positioned centre box', layout.matches.some(
  (match) => match.matchId === 'match-4' && Math.abs(match.x + match.width / 2 - layout.width / 2) < 0.01,
))
// user rule: numbering and placement start from the LEFT edge — match №1 (the
// first side's round-1 fight, 2 of the 3 left athletes) sits left of centre,
// the second side's semifinal sits right of centre
const firstMatchBox = layout.matches.find((match) => match.matchId === 'match-1')!
check('match 1 sits on the LEFT half of the sheet', firstMatchBox.x + firstMatchBox.width / 2 < layout.width / 2)
const thirdMatchBox = layout.matches.find((match) => match.matchId === 'match-3')!
check('match 3 (second side semifinal) sits on the RIGHT half', thirdMatchBox.x + thirdMatchBox.width / 2 > layout.width / 2)
check('match 1 badge faces the centre from the left wing',
  Math.abs(firstMatchBox.chipX - (firstMatchBox.x + firstMatchBox.width)) < 0.01,
)
check('match rows stay inside their boxes', layout.matches.every(
  (match) =>
    match.topRowOffset > 0 &&
    match.bottomRowOffset > match.topRowOffset &&
    match.bottomRowOffset < match.height,
))
const testCardHalf = 25 // cardHeight 50 in the dims below
check('slot rows fit vertically inside their boxes', layout.matches.every(
  (match) =>
    match.topRowOffset - testCardHalf >= -0.01 &&
    match.bottomRowOffset + testCardHalf <= match.height + 0.01,
))
check('match chips have finite centres', layout.matches.every(
  (match) => Number.isFinite(match.chipX) && Number.isFinite(match.chipY),
))
check('connectors are straight, jogged or champion paths', layout.connectors.every(
  (points) => points.length === 2 || points.length === 4,
))
check('champion plate hangs below the final', layout.champion !== null && layout.champion.y > 0)

// ————— staged print plans: big brackets split into clean same-size pages —————
const stagedDims = fitPrintDims(4, 1060)
const staged = buildStagedPrintPlans(buildBracketTree(32))
check('32 draw → two band pages + one final page', staged.length === 3 && staged[0].kind === 'band' && staged[2].kind === 'final')
check('band pages carry 8 rows each', staged[0].rowTo! - staged[0].rowFrom! === BAND_ROWS && staged[1].rowTo === 16)
const bandLayout = computePlanLayout(staged[0].plan, stagedDims)
check('band page shows rounds 1-3 of both wings (7 boxes per wing)',
  bandLayout.matches.length === 14 &&
  bandLayout.matches.filter((m) => m.round === 1).length === 8 &&
  bandLayout.matches.filter((m) => m.round === 2).length === 4 &&
  bandLayout.matches.filter((m) => m.round === 3).length === 2,
)
check('band page fits one A4 landscape body',
  bandLayout.height + 104 + 8 + 30 <= 770 && bandLayout.width <= 1060,
)
check('band page has a continue point and no champion', bandLayout.continuePoint !== null && bandLayout.champion === null)
check('band pages keep every first-round slot exactly once',
  new Set(staged.slice(0, 2).flatMap((p) => collectSlotIds(p.plan))).size === 32,
)
const finalLayout = computePlanLayout(staged[2].plan, fitPrintDims(staged[2].columns, 1060))
check('final page = semifinals + final with «برنده مسابقه» leaves',
  finalLayout.matches.length === 3 &&
  finalLayout.matches.some((m) => m.topWinner !== null || m.bottomWinner !== null) &&
  finalLayout.champion !== null && finalLayout.continuePoint === null,
)
check('final page fits one A4 landscape body with the results table',
  finalLayout.height + 104 + 8 + 126 + 34 <= 770,
)
const staged64 = buildStagedPrintPlans(buildBracketTree(64))
check('64 draw → four band pages + one final page', staged64.length === 5 && staged64[4].kind === 'final')
const staged16 = buildStagedPrintPlans(buildBracketTree(16))
check('16 draw stays a single full page', staged16.length === 1 && staged16[0].kind === 'full')

function collectSlotIds(plan: unknown): string[] {
  const node = plan as { kind: string; slotId?: string; left?: unknown; right?: unknown }
  if (node.kind === 'slot' && node.slotId) return [node.slotId]
  if (node.kind === 'match') {
    return [...collectSlotIds(node.left), ...collectSlotIds(node.right)]
  }
  return []
}
const finalMatch5 = layout.matches.find((match) => match.matchId === 'match-4')!
check(
  'N=5 final shows two placeholder rows (no inline slots)',
  finalMatch5.topSlotId === null && finalMatch5.bottomSlotId === null,
)
check('every contested non-final match owns a connector chip', layout.matches
  .filter((match) => match.contested && match.round < draw.structure.roundCount)
  .every((match) => Number.isFinite(match.chipX) && Number.isFinite(match.chipY)))
check('walkover boxes are marked uncontested', layout.matches.filter((m) => !m.contested).length === 3)

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
  boxPad: 6,
  innerGap: 8,
  chipSize: 22,
})
check('N=1 layout renders one card area', singleLayout.width > 0 && singleLayout.champion === null)

// ---------- mat/session schedule (برنامه ریزی زمین ها) ----------

function makeScheduleParticipants(
  specs: Array<{ age: string; weight: string; count: number }>,
): Participant[] {
  const participants: Participant[] = []
  let row = 2
  for (const spec of specs) {
    for (let i = 0; i < spec.count; i += 1) {
      participants.push({
        id: `${spec.age}-${spec.weight}-${i}`,
        fullName: `ورزشکار ${i + 1} ${spec.weight}`,
        coachName: `مربی ${i % 3}`,
        ageCategory: spec.age,
        weightCategory: spec.weight,
        weightKg: '',
        sourceRow: row++,
      })
    }
  }
  return participants
}

const scheduleSquad = makeScheduleParticipants([
  { age: 'کودکان', weight: '۲۸-', count: 5 },
  { age: 'کودکان', weight: '۳۵+', count: 3 },
  { age: 'نوجوانان', weight: '۴۵-', count: 6 },
  { age: 'نوجوانان', weight: '۵۳+', count: 2 },
  { age: 'جوانان', weight: '۶۶+', count: 1 },
])
const scheduleByIdMap = new Map(scheduleSquad.map((p) => [p.id, p]))
const scheduleByIdRecord = Object.fromEntries(scheduleSquad.map((p) => [p.id, p]))
const scheduleDraws: Record<string, ReturnType<typeof generateGroupDraw>> = Object.fromEntries(
  groupByCategory(scheduleSquad).map((g) => [g.id, generateGroupDraw(g, scheduleByIdRecord, tournamentRules)]),
)
const groupIdOf = (age: string, weight: string): string => {
  const found = Object.values(scheduleDraws).find(
    (d) => d.group.ageCategory === age && d.group.weightCategory === weight,
  )
  if (!found) throw new Error(`missing draw ${age} ${weight}`)
  return found.groupId
}

const G28 = groupIdOf('کودکان', '۲۸-')
const G35 = groupIdOf('کودکان', '۳۵+')
const G45 = groupIdOf('نوجوانان', '۴۵-')
const G53 = groupIdOf('نوجوانان', '۵۳+')
const G66 = groupIdOf('جوانان', '۶۶+')

check('2-person weight → exactly the final', flattenGroupMatches(scheduleDraws[G53], scheduleByIdMap).length === 1)
check('3-person weight → 2 real matches (walkover unnumbered)', flattenGroupMatches(scheduleDraws[G35], scheduleByIdMap).length === 2)

const sessionA = {
  id: 's1',
  timeFrom: '۸:۰۰',
  timeTo: '۱۰:۰۰',
  mats: [
    { id: 'm1', label: 'زمین ۱', groupIds: [G28, G45] },
    { id: 'm2', label: 'زمین ۲', groupIds: [G35, G53] },
  ],
}
const builtA = buildSchedule([sessionA], scheduleDraws, scheduleByIdMap)
check('schedule totals 12 matches', builtA.totalMatches === 12)
const mat1A = builtA.sessions[0].mats[0]
const mat2A = builtA.sessions[0].mats[1]
// هر زمین شماره مخصوص خودش را دارد — شمارش هر زمین از ۱ شروع می شود
check('mat 1 numbers are 1..9 contiguous',
  mat1A.firstSeq === 1 && mat1A.lastSeq === 9 &&
  mat1A.weights.flatMap((w) => w.matches.map((m) => m.seq)).sort((a, b) => a - b).join(',') ===
    Array.from({ length: 9 }, (_, i) => String(i + 1)).join(','))
check('mat 2 restarts from 1 (1..3)', mat2A.firstSeq === 1 && mat2A.lastSeq === 3)
check('mat 1 heaviest weight first (۴۵- با ۵ مسابقه)', mat1A.weights[0].groupId === G45 && mat1A.weights[0].matchCount === 5)
check('mat 2 orders ۲مسابقه ای پیش از تک مسابقه', mat2A.weights[0].groupId === G35)
check('solo weight never enters the schedule', !builtA.assignedGroupIds.includes(G66))

const w28 = mat1A.weights.find((w) => w.groupId === G28)!
const w45 = mat1A.weights.find((w) => w.groupId === G45)!
check('28kg lists its 4 matches with ascending rounds',
  w28.matches.length === 4 && w28.matches.every((m, i, arr) => i === 0 || m.round >= arr[i - 1].round))
const w28Final = w28.matches[w28.matches.length - 1]
check('28kg final sides are «winner of» refs', w28Final.chong.kind === 'winnerOf' && w28Final.hong.kind === 'winnerOf')
if (w28Final.chong.kind === 'winnerOf' && w28Final.hong.kind === 'winnerOf') {
  const chongSeq = builtA.seqByKey.get(`${G28}/${w28Final.chong.matchId}`)!
  const hongSeq = builtA.seqByKey.get(`${G28}/${w28Final.hong.matchId}`)!
  check('winner refs point to earlier numbers', chongSeq < w28Final.seq && hongSeq < w28Final.seq)
}
check('round-1 sides resolve to real athlete names',
  w28.matches.some((m) => m.round === 1 && m.chong.kind === 'athlete' && m.chong.name !== '—'))

// round-robin: دور اول همه وزن ها (پرمسابقه تر اول)، بعد دور دوم و تا فینال
check('round-robin: 45kg round-1 opens the count (1,2)',
  w45.matches.filter((m) => m.round === 1).map((m) => m.seq).join(',') === '1,2')
check('round-robin: 28kg round-1 follows at 3',
  w28.matches.find((m) => m.round === 1)!.seq === 3)
check('round-robin: 45kg numbers sweep per round (1,2,4,5,8)',
  w45.matches.map((m) => m.seq).join(',') === '1,2,4,5,8')
check('round-robin: 28kg numbers sweep per round (3,6,7,9)',
  w28.matches.map((m) => m.seq).join(',') === '3,6,7,9')
check('finals land on the last numbers of their mat',
  w45.matches[w45.matches.length - 1].seq === 8 &&
  w28.matches[w28.matches.length - 1].seq === 9 &&
  mat1A.lastSeq === 9)

const w35B = mat2A.weights.find((w) => w.groupId === G35)!
const w53B = mat2A.weights.find((w) => w.groupId === G53)!
check('round-robin: 35kg round-1 = 1, single-match 53+ = 2',
  w35B.matches.find((m) => m.round === 1)!.seq === 1 && w53B.matches[0].seq === 2)
check('the very last number of mat 2 is a final (35+ final = 3)',
  w35B.matches[w35B.matches.length - 1].seq === 3 && mat2A.lastSeq === 3)
check('each weight final is the highest number of its own weight',
  [...mat1A.weights, ...mat2A.weights].every((w) => {
    const finalMatch = w.matches.find((m) => m.round === w.roundCount)!
    return w.matches.every((m) => m.seq <= finalMatch.seq)
  }))

const sessionB1 = { id: 's1', timeFrom: '۸:۰۰', timeTo: '۱۰:۰۰', mats: [{ id: 'm1', label: 'زمین ۱', groupIds: [G28] }] }
const sessionB2 = { id: 's2', timeFrom: '۱۰:۰۰', timeTo: '۱۲:۰۰', mats: [{ id: 'm2', label: 'زمین ۱', groupIds: [G45] }] }
const builtNextSession = buildSchedule([sessionB1, sessionB2], scheduleDraws, scheduleByIdMap)
check('a mat in the next session starts from 1 again',
  builtNextSession.sessions[1].mats[0].firstSeq === 1 && builtNextSession.sessions[1].mats[0].lastSeq === 5)
const sessionC = {
  id: 's3',
  timeFrom: '۸:۰۰',
  timeTo: '۱۰:۰۰',
  mats: [
    { id: 'c1', label: 'زمین ۱', groupIds: [G28] },
    { id: 'c2', label: 'زمین ۲', groupIds: [G45] },
  ],
}
const builtSameSession = buildSchedule([sessionC], scheduleDraws, scheduleByIdMap)
check('two mats of one session both count from 1',
  builtSameSession.sessions[0].mats[0].firstSeq === 1 && builtSameSession.sessions[0].mats[1].firstSeq === 1 &&
  builtSameSession.sessions[0].mats[1].lastSeq === 5)

// ————— باران مدال: تقسیم جدول ها، جداسازی مربی ها و مسابقه رده بندی —————

check('pool sizes: 7 → 4 + 3', medalRainPoolSizes(7).join(',') === '4,3')
check('pool sizes: 10 → 4 + 4 + 2', medalRainPoolSizes(10).join(',') === '4,4,2')
check('pool sizes: 11 → 4 + 4 + 3', medalRainPoolSizes(11).join(',') === '4,4,3')
check('pool sizes: 8 → 4 + 4', medalRainPoolSizes(8).join(',') === '4,4')
check('pool sizes: 5 → 3 + 2 (no medal without a fight)', medalRainPoolSizes(5).join(',') === '3,2')
check('pool sizes: 9 → 4 + 3 + 2', medalRainPoolSizes(9).join(',') === '4,3,2')
check('pool sizes: 4 → 4', medalRainPoolSizes(4).join(',') === '4')
check('pool sizes: 1 → solo pool', medalRainPoolSizes(1).join(',') === '1')

/** همان مربی دو بار در یک نیمه نهایی نیفتد (جدول ۴ نفره) */
function sameHalfCollision(seated: string[]): boolean {
  const firstHalf = seated.slice(0, 2)
  const secondHalf = seated.slice(2, 4)
  const duplicated = (half: string[]): boolean =>
    half.some((name, index) => half.indexOf(name) !== index)
  return duplicated(firstHalf) || duplicated(secondHalf)
}

// ۲۰ قرعه تصادفی — قانون ها باید در همه شان برقرار بمانند
for (let iteration = 0; iteration < 20; iteration += 1) {
  const rows = [
    ...Array.from({ length: 2 }, (_, i) => ({ fullName: `a${i}`, coachName: 'استاد الف' })),
    ...Array.from({ length: 2 }, (_, i) => ({ fullName: `b${i}`, coachName: 'استاد ب' })),
    ...Array.from({ length: 2 }, (_, i) => ({ fullName: `c${i}`, coachName: 'استاد پ' })),
    { fullName: 'd0', coachName: 'استاد ت' },
  ]
  const pools = splitMedalRainPools(rows)
  check(
    `rain 7 → two pools of 4 and 3 (draw ${iteration})`,
    pools.length === 2 &&
      pools.map((pool) => pool.athletes.length).sort().join(',') === '3,4',
  )
  const allNames = pools.flatMap((pool) => pool.athletes.map((athlete) => athlete.fullName))
  check(
    `rain 7 → every athlete exactly once (draw ${iteration})`,
    new Set(allNames).size === 7 && allNames.length === 7,
  )
  for (const [poolIndex, pool] of pools.entries()) {
    const byCoach = new Map<string, number>()
    for (const athlete of pool.athletes) {
      byCoach.set(athlete.coachName, (byCoach.get(athlete.coachName) ?? 0) + 1)
    }
    check(
      `rain 7 → no coach twice in pool ${poolIndex + 1} (draw ${iteration})`,
      [...byCoach.values()].every((count) => count <= 1),
    )
    if (pool.athletes.length === 4) {
      check(
        `rain 7 → 4-pool seats without same-half clash (draw ${iteration})`,
        !sameHalfCollision(pool.athletes.map((athlete) => athlete.coachName)),
      )
    }
  }
}

// مربی پرهنرجوتر از تعداد جدول ها — pigeonhole: حداکثر دو هنرجو در هر جدول
// و نشستن دو طرف نیمه نهایی (۱۱ نفر → ۳ جدول ۴ و ۴ و ۳)
for (let iteration = 0; iteration < 20; iteration += 1) {
  const others = ['الف', 'ب', 'پ', 'ت', 'ث', 'ج'].map((coach, index) => ({
    fullName: `o${index}`,
    coachName: `استاد ${coach}`,
  }))
  const rows = [
    ...Array.from({ length: 5 }, (_, i) => ({ fullName: `x${i}`, coachName: 'استاد پر' })),
    ...others,
  ]
  const pools = splitMedalRainPools(rows)
  check(
    `rain pigeonhole → pools of 4 and 4 and 3 (draw ${iteration})`,
    pools.map((pool) => pool.athletes.length).join(',') === '4,4,3',
  )
  for (const pool of pools) {
    const crowded = pool.athletes.filter((athlete) => athlete.coachName === 'استاد پر').length
    check(`rain pigeonhole → max 2 per pool (draw ${iteration})`, crowded <= 2)
    if (crowded === 2 && pool.athletes.length === 4) {
      check(
        `rain pigeonhole → crowded pair on opposite semifinals (draw ${iteration})`,
        !sameHalfCollision(pool.athletes.map((athlete) => athlete.coachName)),
      )
      check(
        `rain pigeonhole → opposite semifinal carries a warning-free layout (draw ${iteration})`,
        pool.warnings.length === 0,
      )
    }
  }
}

// جدول ۳ نفره — استراحت به هنرجویی می رسد که مربی اش در جدول دیگری هست
for (let iteration = 0; iteration < 10; iteration += 1) {
  const rows = [
    { fullName: 'p0', coachName: 'استاد اول' },
    { fullName: 'q0', coachName: 'استاد دوم' },
    { fullName: 'p1', coachName: 'استاد اول' },
    { fullName: 'r0', coachName: 'استاد سوم' },
    { fullName: 's0', coachName: 'استاد چهارم' },
  ]
  const pools = splitMedalRainPools(rows)
  const triple = pools.find((pool) => pool.athletes.length === 3)
  check(
    `rain 5 → a 3-pool exists with the linked coach resting (draw ${iteration})`,
    triple !== undefined && triple.athletes[0].coachName === 'استاد اول',
  )
}

// مسابقه رده بندی — چسباندن به ساختار ۴ نفره و شماره گذاری
const bronzeStructure = attachBronzeMatch(buildBracketTree(4))
check('bronze: attached to a 4-bracket', bronzeStructure.bronzeMatch !== undefined)
check('bronze: match number 3, final bumped to 4', (() => {
  const numbers: number[] = []
  function walk(node: BracketStructureNode): void {
    if (node.kind === 'match') {
      numbers.push(node.matchNumber)
      walk(node.left)
      walk(node.right)
    }
  }
  walk(bronzeStructure.root)
  return numbers.sort((a, b) => a - b).join(',') === '1,2,4' && bronzeStructure.bronzeMatch!.matchNumber === 3
})())
check('bronze: fromMatches are the two semifinals', (() => {
  const bronze = bronzeStructure.bronzeMatch!
  return bronze.fromMatches.map((ref) => ref.matchNumber).join(',') === '1,2'
})())
check('bronze: other sizes untouched', attachBronzeMatch(buildBracketTree(8)).bronzeMatch === undefined)
check('bronze: attaching twice is harmless', attachBronzeMatch(bronzeStructure) === bronzeStructure)

const bronzeSquad = makeParticipants({ 'رضایی': 2, 'محمدی': 2 })
const bronzeGroup = groupByCategory(bronzeSquad)[0]
const bronzeDraw = generateGroupDraw(
  bronzeGroup,
  Object.fromEntries(bronzeSquad.map((p) => [p.id, p])),
  tournamentRules,
  { bronze: true },
)
check('draw with bronze: structure carries the bronze match', bronzeDraw.structure.bronzeMatch !== undefined)
check('draw with bronze: realMatchCount counts 4', realMatchCount(bronzeDraw) === 4)
const bronzeById = new Map(bronzeSquad.map((p) => [p.id, p]))
const bronzeFlat = flattenGroupMatches(bronzeDraw, bronzeById)
check('bronze: schedule lists 4 matches in order SF, SF, bronze, final',
  bronzeFlat.length === 4 &&
  bronzeFlat.map((match) => match.matchNumber).join(',') === '1,2,3,4' &&
  bronzeFlat[2].bronze === true &&
  bronzeFlat[3].matchNumber === 4,
)
check('bronze: schedule sides are loser refs',
  bronzeFlat[2].chong.kind === 'loserOf' && bronzeFlat[2].hong.kind === 'loserOf',
)

const bronzeLayout = computeBracketLayout(bronzeDraw.structure, {
  cardWidth: 150,
  cardHeight: 38,
  rowHeight: 54,
  columnPitch: 250,
  padX: 26,
  padTop: 34,
  padBottom: 18,
  boxPad: 4,
  innerGap: 6,
  chipSize: 24,
})
const bronzeBox = bronzeLayout.matches.find((match) => match.bronze)
check('bronze: layout draws the bronze box below the champion plate',
  bronzeBox !== undefined &&
  bronzeLayout.champion !== null &&
  bronzeBox.y > bronzeLayout.champion.y + bronzeLayout.champion.height,
)
check('bronze: loser rows label the two semifinals',
  bronzeBox !== undefined && bronzeBox.topLoser === 1 && bronzeBox.bottomLoser === 2,
)
check('bronze: layout stays finite and grows',
  bronzeLayout.height > 0 && bronzeLayout.matches.every((match) => Number.isFinite(match.y)),
)

// برنامه زمین ها با وزن باران مدال — رده بندی درست قبل از فینال شماره می خورد
const rainSession = {
  id: 'sr',
  timeFrom: '۸:۰۰',
  timeTo: '۱۰:۰۰',
  mats: [{ id: 'mr', label: 'زمین ۱', groupIds: [bronzeGroup.id] }],
}
const rainSchedule = buildSchedule([rainSession], { [bronzeGroup.id]: bronzeDraw }, bronzeById)
const rainMatches = rainSchedule.sessions[0].mats[0].weights[0].matches
check('bronze: mat numbering runs SF(1,2) → bronze(3) → final(4)',
  rainMatches.map((match) => match.seq).join(',') === '1,2,3,4',
)

// ————— تم های جدول — گزینه های تنظیمات و وفاداری تم کلاسیک —————
check('themes: seven themes with unique ids and Persian names',
  tableThemes.length === 7 &&
    new Set(tableThemes.map((theme) => theme.id)).size === 7 &&
    tableThemes.every((theme) => theme.id.length > 0 && theme.name.length > 0),
)
check('themes: classic is first and the neutral default',
  tableThemes[0].id === 'classic' && tableThemeById(undefined).id === 'classic',
)
check('themes: unknown id falls back to classic',
  tableThemeById('no-such-theme').id === 'classic' && tableThemeById(42).id === 'classic',
)
check('themes: classic matches the previous hardcoded sheet colours',
  classicTheme.sheetBg === '#ffffff' &&
    classicTheme.sheetText === '#101d31' &&
    classicTheme.matBadgeBg === '#1e3a5f' &&
    classicTheme.matchAccent === '#1e3a5f' &&
    classicTheme.finalAccent === '#d97706' &&
    classicTheme.connector === '#475569' &&
    classicTheme.boxBorder === '#cbd5e1' &&
    classicTheme.resultsHeaderBg === '#1e3a5f',
)
check('themes: corner colours stay blue(chong)/red(hong) in every theme',
  tableThemes.every((theme) =>
    theme.sides.chong.accent !== theme.sides.hong.accent &&
    theme.sides.chong.accent.length > 0 &&
    theme.sides.hong.accent.length > 0,
  ),
)
check('themes: every theme covers the full token surface',
  tableThemes.every((theme) =>
    [theme.sheetBg, theme.headerRule, theme.titleText, theme.subtitleText,
      theme.chipText, theme.chipBg, theme.chipBorder, theme.matBadgeText, theme.matBadgeBg,
      theme.timeBadgeText, theme.timeBadgeBg, theme.timeBadgeBorder, theme.statBorder,
      theme.statDivider, theme.statLabel, theme.connector, theme.roundLabel,
      theme.matchAccent, theme.finalAccent, theme.chipEmptyBg, theme.chipEmptyText,
      theme.chipFocusBg, theme.championFrom, theme.championTo, theme.championText,
      theme.championShadow, theme.continueText, theme.continueBg, theme.continueBorder,
      theme.boxBorder, theme.boxRestBorder, theme.boxBg, theme.bronzeBorder, theme.bronzeLabel,
      theme.nameText, theme.coachText, theme.byeBg, theme.resultsBorder, theme.resultsHeaderBg,
      theme.resultsHeaderText, theme.resultsHeaderSub, theme.resultsInnerBorder,
      theme.resultsRankText, theme.resultsDotted, theme.resultsCellBg, theme.soloNoteBg,
      theme.soloNoteBorder, theme.soloNoteText, theme.soloMuted, theme.soloNameText,
      theme.contRule, theme.contMuted, theme.canvasBg,
    ].every((token) => typeof token === 'string' && token.length > 0),
  ),
)
check('themes: dark theme letterbox matches its sheet',
  tableThemeById('night').canvasBg === tableThemeById('night').sheetBg,
)
check('themes: mono theme is pure grayscale for black-and-white printers',
  (() => {
    const mono = tableThemeById('mono')
    const grays = [
      mono.sheetBg, mono.sheetText, mono.headerRule, mono.titleText, mono.matBadgeBg,
      mono.matchAccent, mono.finalAccent, mono.connector, mono.boxBorder,
      mono.sides.chong.bg, mono.sides.chong.accent, mono.sides.hong.bgSoft, mono.sides.hong.accent,
    ]
    const isGray = (hex: string) => {
      if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return false
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return r === g && g === b
    }
    // دو گوشه باید در چاپ سیاه و سفید از هم جدا بمانند — چونگ تیره تر از هونگ
    return grays.every(isGray) &&
      mono.sides.chong.accent !== mono.sides.hong.accent &&
      parseInt(mono.sides.chong.bgSoft.slice(1, 3), 16) <
        parseInt(mono.sides.hong.bgSoft.slice(1, 3), 16)
  })(),
)
check('themes: store migration keeps a saved theme and repairs junk',
  await (async () => {
    // zustand persist بدون حافظه api.persist را سیم نمی کند — یک حافظه ساده می گذاریم
    // (پیش فرض زوستاند window.localStorage است، پس هر دو باید باشند)
    if (typeof globalThis.localStorage === 'undefined') {
      const memory = new Map<string, string>()
      const memoryStorage = {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => void memory.set(key, value),
        removeItem: (key: string) => void memory.delete(key),
      }
      Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage })
      ;(globalThis as Record<string, unknown>).window = { localStorage: memoryStorage }
    }
    const { useTournament } = await import('../src/store/tournamentStore.ts')
    const migrate = (
      useTournament as unknown as {
        persist?: { getOptions?: () => { migrate?: (state: unknown) => unknown } }
      }
    ).persist?.getOptions?.()?.migrate
    if (typeof migrate !== 'function') return false
    const migrated = migrate({ tableThemeId: 'gold' }) as { tableThemeId?: string }
    const junk = migrate({ tableThemeId: 'junk-theme' }) as { tableThemeId?: string }
    const empty = migrate({}) as { tableThemeId?: string }
    return migrated.tableThemeId === 'gold' &&
      junk.tableThemeId === 'classic' &&
      empty.tableThemeId === 'classic'
  })(),
)

// ————— ظاهر شماره مسابقه (v13) —————

check('match chip: six modes with unique ids, valid shape and fill',
  matchChipModes.length === 6 &&
    new Set(matchChipModes.map((mode) => mode.id)).size === 6 &&
    matchChipModes.every((mode) =>
      (['circle', 'rounded', 'square'] as const).includes(mode.shape) &&
      (['solid', 'outline'] as const).includes(mode.fill) &&
      mode.name.length > 0,
    ),
)

check('match chip: radius follows shape — circle full, square near-sharp, rounded in between',
  matchChipRadius('circle', 24) === 999 &&
    matchChipRadius('square', 24) <= 4 &&
    matchChipRadius('rounded', 24) > 4 &&
    matchChipRadius('rounded', 24) < 12 &&
    matchChipRadius('rounded', 12) >= 3,
)

check('match chip: follow-theme keeps final gold and regular navy',
  matchChipPalette(defaultMatchChipStyle, classicTheme, false).accent === classicTheme.matchAccent &&
    matchChipPalette(defaultMatchChipStyle, classicTheme, true).accent === classicTheme.finalAccent,
)

check('match chip: custom color overrides accents for regular and final',
  (() => {
    const custom: MatchChipStyle = { shape: 'square', fill: 'solid', color: '#123456' }
    return matchChipPalette(custom, classicTheme, false).accent === '#123456' &&
      matchChipPalette(custom, classicTheme, true).accent === '#123456' &&
      matchChipPalette(custom, classicTheme, false).filledText === '#ffffff'
  })(),
)

check('match chip: readable text flips dark on light custom colors',
  matchChipPalette({ ...defaultMatchChipStyle, color: '#fbbf24' }, classicTheme, false)
    .filledText !== '#ffffff' &&
    matchChipPalette({ ...defaultMatchChipStyle, color: '#101d31' }, classicTheme, false)
      .filledText === '#ffffff',
)

check('match chip: outline palette keeps theme empty tones for coherence',
  matchChipPalette({ ...defaultMatchChipStyle, fill: 'outline' }, classicTheme, false)
    .outlineBg === classicTheme.chipEmptyBg,
)

check('match chip: normalize repairs junk style to the classic default',
  normalizeMatchChipStyle(null).shape === 'circle' &&
    normalizeMatchChipStyle(null).fill === 'solid' &&
    normalizeMatchChipStyle(null).color === null &&
    normalizeMatchChipStyle({ shape: 'diamond', fill: 'glow', color: 'red' }).shape === 'circle' &&
    normalizeMatchChipStyle({ shape: 'diamond', fill: 'glow', color: 'red' }).color === null &&
    normalizeMatchChipStyle({ shape: 'square', fill: 'outline', color: '#ABCDEF' }).shape === 'square' &&
    normalizeMatchChipStyle({ shape: 'square', fill: 'outline', color: '#ABCDEF' }).color === '#abcdef',
)

// ————— اندازه بج شماره (v14) —————

check('match chip size: three ordered options with growing factors',
  matchChipSizeOptions.length === 3 &&
    new Set(matchChipSizeOptions.map((option) => option.id)).size === 3 &&
    matchChipSizeOptions[0].factor === 1 &&
    matchChipSizeOptions[0].factor < matchChipSizeOptions[1].factor &&
    matchChipSizeOptions[1].factor < matchChipSizeOptions[2].factor,
)

check('match chip size: factor lookup and junk normalization',
  matchChipFactor('normal') === 1 &&
    matchChipFactor('big') > 1 &&
    matchChipFactor('huge') > matchChipFactor('big') &&
    normalizeMatchChipSize('junk') === 'normal' &&
    normalizeMatchChipSize(null) === 'normal' &&
    normalizeMatchChipSize('huge') === 'huge',
)

check('match chip size: store migration keeps a saved size and repairs junk',
  await (async () => {
    if (typeof globalThis.localStorage === 'undefined') {
      const memory = new Map<string, string>()
      const memoryStorage = {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => void memory.set(key, value),
        removeItem: (key: string) => void memory.delete(key),
      }
      Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage })
      ;(globalThis as Record<string, unknown>).window = { localStorage: memoryStorage }
    }
    const { useTournament } = await import('../src/store/tournamentStore.ts')
    const migrate = (
      useTournament as unknown as {
        persist?: { getOptions?: () => { migrate?: (state: unknown) => unknown } }
      }
    ).persist?.getOptions?.()?.migrate
    if (typeof migrate !== 'function') return false
    const saved = migrate({ matchChipSize: 'huge' }) as { matchChipSize?: MatchChipSize }
    const junk = migrate({ matchChipSize: 'giant' }) as { matchChipSize?: MatchChipSize }
    const empty = migrate({}) as { matchChipSize?: MatchChipSize }
    return saved.matchChipSize === 'huge' &&
      junk.matchChipSize === 'normal' &&
      empty.matchChipSize === 'normal'
  })(),
)

check('match chip: store migration keeps a saved style and repairs junk',
  await (async () => {
    if (typeof globalThis.localStorage === 'undefined') {
      const memory = new Map<string, string>()
      const memoryStorage = {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => void memory.set(key, value),
        removeItem: (key: string) => void memory.delete(key),
      }
      Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage })
      ;(globalThis as Record<string, unknown>).window = { localStorage: memoryStorage }
    }
    const { useTournament } = await import('../src/store/tournamentStore.ts')
    const migrate = (
      useTournament as unknown as {
        persist?: { getOptions?: () => { migrate?: (state: unknown) => unknown } }
      }
    ).persist?.getOptions?.()?.migrate
    if (typeof migrate !== 'function') return false
    const saved = migrate({
      matchChipStyle: { shape: 'square', fill: 'outline', color: '#16a34a' },
    }) as { matchChipStyle?: MatchChipStyle }
    const junk = migrate({ matchChipStyle: { shape: 'blob', color: 'junk' } }) as {
      matchChipStyle?: MatchChipStyle
    }
    const empty = migrate({}) as { matchChipStyle?: MatchChipStyle }
    return saved.matchChipStyle?.shape === 'square' &&
      saved.matchChipStyle.fill === 'outline' &&
      saved.matchChipStyle.color === '#16a34a' &&
      junk.matchChipStyle?.shape === 'circle' &&
      junk.matchChipStyle.color === null &&
      empty.matchChipStyle?.color === null
  })(),
)

/* ————— کمربندها — فهرست آماده، اولویت جدول/بازه، باگ فاصله ————— */

check('belts: preset list is unique, ordered and free of ZWNJ',
  new Set(beltPresets).size === beltPresets.length &&
    beltPresets.includes('سبز و آبی') &&
    beltPresets.includes('زرد و سبز') &&
    beltPresets.includes('قرمز و مشکی') &&
    beltPresets.every((belt) => !belt.includes('\u200c')) &&
    beltPresets[0] === 'سفید' &&
    beltPresets[beltPresets.length - 1] === 'مشکی',
)

check('belts: table belt wins over session belt, empty falls through',
  resolveBeltLabel('سبز و آبی', 'زرد') === 'سبز و آبی' &&
    resolveBeltLabel(undefined, 'زرد') === 'زرد' &&
    resolveBeltLabel('', 'زرد') === 'زرد' &&
    resolveBeltLabel('  ', 'زرد') === 'زرد' &&
    resolveBeltLabel(undefined, undefined) === '' &&
    resolveBeltLabel(' زرد ', undefined) === 'زرد',
)

check('belts: store keeps raw value so typing a space survives (بودن فاصله)',
  await (async () => {
    if (typeof globalThis.localStorage === 'undefined') {
      const memory = new Map<string, string>()
      const memoryStorage = {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => void memory.set(key, value),
        removeItem: (key: string) => void memory.delete(key),
      }
      Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage })
      ;(globalThis as Record<string, unknown>).window = { localStorage: memoryStorage }
    }
    const { useTournament } = await import('../src/store/tournamentStore.ts')
    // بعد از هر تغییر باید getState تازه بگیریم — اسنپ شات قدیمی خوانا نیست
    const setTableBelt = (groupId: string, value: string) =>
      useTournament.getState().setTableBeltLabel(groupId, value)
    const belts = () =>
      (useTournament.getState() as {
        tableBeltLabels: Record<string, string>
        sessionBeltLabels: Record<string, string>
      })
    // تایپ حرف به حرف «سبز و آبی» — با هر فاصله مقدار خام باید سر جایش بماند
    setTableBelt('g1', 'سبز')
    setTableBelt('g1', 'سبز ')
    setTableBelt('g1', 'سبز و')
    setTableBelt('g1', 'سبز و آبی')
    const typed = belts().tableBeltLabels['g1']
    setTableBelt('g1', '   ')
    const cleared = belts().tableBeltLabels['g1'] === undefined
    useTournament.getState().setSessionBeltLabel('s1', 'قرمز و مشکی ')
    const sessionRaw = belts().sessionBeltLabels['s1'] === 'قرمز و مشکی '
    return typed === 'سبز و آبی' && cleared && sessionRaw
  })(),
)

check('belts: store migration v15 keeps saved belts of tables and sessions',
  await (async () => {
    if (typeof globalThis.localStorage === 'undefined') {
      const memory = new Map<string, string>()
      const memoryStorage = {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => void memory.set(key, value),
        removeItem: (key: string) => void memory.delete(key),
      }
      Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage })
      ;(globalThis as Record<string, unknown>).window = { localStorage: memoryStorage }
    }
    const { useTournament } = await import('../src/store/tournamentStore.ts')
    const migrate = (
      useTournament as unknown as {
        persist?: { getOptions?: () => { migrate?: (state: unknown) => unknown } }
      }
    ).persist?.getOptions?.()?.migrate
    if (typeof migrate !== 'function') return false
    const saved = migrate({
      tableBeltLabels: { g1: 'سبز و آبی' },
      sessionBeltLabels: { s1: 'زرد' },
    }) as { tableBeltLabels?: Record<string, string>; sessionBeltLabels?: Record<string, string> }
    const empty = migrate({}) as {
      tableBeltLabels?: Record<string, string>
      sessionBeltLabels?: Record<string, string>
    }
    return saved.tableBeltLabels?.g1 === 'سبز و آبی' &&
      saved.sessionBeltLabels?.s1 === 'زرد' &&
      Object.keys(empty.tableBeltLabels ?? { x: 1 }).length === 0 &&
      Object.keys(empty.sessionBeltLabels ?? { x: 1 }).length === 0
  })(),
)

/* ————— تسک ۲۹ — جدول دو نفره، بج فینال و کلید پلاک قهرمان ————— */

const heroSquad = makeParticipants({ 'حیدری': 1, 'کریمی': 1 })
const heroGroup = groupByCategory(heroSquad)[0]
const heroDraw = generateGroupDraw(
  heroGroup,
  Object.fromEntries(heroSquad.map((p) => [p.id, p])),
  tournamentRules,
)

check('two-athlete sheet: hero print dims are larger than the standard card',
  heroDraw.structure.roundCount === 1 &&
    fitPrintDims(1, 1060).cardWidth === 360 &&
    fitPrintDims(4, 1060).cardWidth <= 150 &&
    fitPrintDims(1, 1060).nameFontSize === 15 &&
    fitPrintDims(1, 1060).chipSize === 28 &&
    fitPrintDims(4, 1060).nameFontSize === 11,
)

const heroLayout = computeBracketLayout(heroDraw.structure, fitPrintDims(1, 1060))
const heroFinal = heroLayout.matches.find((match) => match.round === 1)

check('two-athlete sheet: final box is compact and centred inside its own layout',
  Boolean(heroFinal) &&
    heroLayout.width < 500 &&
    Math.abs(heroLayout.width / 2 - (heroFinal!.x + heroFinal!.width / 2)) < 0.5,
)

check('two-athlete sheet: final badge hangs below the box, clear of the coach line',
  Boolean(heroFinal) && (() => {
    const heroChip = fitPrintDims(1, 1060).chipSize
    const boxBottom = heroFinal!.y + heroFinal!.height
    const plateGap = heroChip + 16
    return heroFinal!.chipY > boxBottom + 1 &&
      heroFinal!.chipY - boxBottom < plateGap - heroChip / 2
  })(),
)

check('two-athlete sheet: champion plate sits centred under the final',
  Boolean(heroLayout.champion) &&
    Math.abs(heroLayout.champion!.x + heroLayout.champion!.width / 2 - heroLayout.width / 2) < 0.5 &&
    heroLayout.champion!.y > heroFinal!.y + heroFinal!.height,
)

const heroHidden = computeBracketLayout(heroDraw.structure, fitPrintDims(1, 1060), {
  showChampion: false,
})

check('champion toggle off: layout drops the plate and shrinks',
  heroHidden.champion === null &&
    !heroHidden.connectors.some((points) =>
      points.some((point) => heroLayout.champion
        ? Math.abs(point.x - heroLayout.width / 2) < 0.5 &&
          point.y > heroFinal!.y + heroFinal!.height
        : false),
    ) &&
    heroHidden.height < heroLayout.height,
)

check('champion toggle: store migration keeps the saved switch and defaults old saves to on',
  await (async () => {
    if (typeof globalThis.localStorage === 'undefined') {
      const memory = new Map<string, string>()
      const memoryStorage = {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => void memory.set(key, value),
        removeItem: (key: string) => void memory.delete(key),
      }
      Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage })
      ;(globalThis as Record<string, unknown>).window = { localStorage: memoryStorage }
    }
    const { useTournament } = await import('../src/store/tournamentStore.ts')
    const migrate = (
      useTournament as unknown as {
        persist?: { getOptions?: () => { migrate?: (state: unknown) => unknown } }
      }
    ).persist?.getOptions?.()?.migrate
    if (typeof migrate !== 'function') return false
    const off = migrate({ showChampion: false }) as { showChampion?: boolean }
    const on = migrate({ showChampion: true }) as { showChampion?: boolean }
    const junk = migrate({ showChampion: 'junk' }) as { showChampion?: boolean }
    const empty = migrate({}) as { showChampion?: boolean }
    return off.showChampion === false &&
      on.showChampion === true &&
      junk.showChampion === true &&
      empty.showChampion === true
  })(),
)

// ————— طرح برگه (کلاسیک/مدرن) — منبع حقیقت + مهاجرت v17 —————

{
  const layouts = await import('../src/lib/sheetLayouts.ts')
  const layoutList = layouts.sheetLayouts
  check('sheet layouts: two options, classic first and default',
    layoutList.length === 2 &&
      layoutList[0]!.id === 'classic' &&
      layoutList[1]!.id === 'modern',
  )
  check('sheet layouts: normalize accepts valid ids and rejects junk/empty',
    layouts.normalizeSheetLayoutId('modern') === 'modern' &&
      layouts.normalizeSheetLayoutId('classic') === 'classic' &&
      layouts.normalizeSheetLayoutId('junk') === 'classic' &&
      layouts.normalizeSheetLayoutId(42) === 'classic' &&
      layouts.normalizeSheetLayoutId(undefined) === 'classic',
  )
}

check('sheet layout: store migration v17 defaults old saves to classic and keeps modern',
  await (async () => {
    if (typeof globalThis.localStorage === 'undefined') {
      const memory = new Map<string, string>()
      const memoryStorage = {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => void memory.set(key, value),
        removeItem: (key: string) => void memory.delete(key),
      }
      Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage })
      ;(globalThis as Record<string, unknown>).window = { localStorage: memoryStorage }
    }
    const { useTournament } = await import('../src/store/tournamentStore.ts')
    const migrate = (
      useTournament as unknown as {
        persist?: { getOptions?: () => { migrate?: (state: unknown) => unknown } }
      }
    ).persist?.getOptions?.()?.migrate
    if (typeof migrate !== 'function') return false
    const fresh = migrate({}) as { sheetLayout?: string }
    const kept = migrate({ sheetLayout: 'modern' }) as { sheetLayout?: string }
    const junk = migrate({ sheetLayout: 'junk' }) as { sheetLayout?: string }
    return fresh.sheetLayout === 'classic' &&
      kept.sheetLayout === 'modern' &&
      junk.sheetLayout === 'classic'
  })(),
)

if (failures > 0) {
  console.error(`${failures} failure(s)`)
  process.exit(1)
}
console.log('All core checks passed.')
