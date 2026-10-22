import type { ByeMajorityId, ByePlacementId } from '../../lib/drawModes.ts'
import type {
  BracketStructure,
  BracketStructureNode,
  StructureLeaf,
  StructureMatch,
} from '../types.ts'

interface RawNode {
  kind: 'leaf' | 'match'
  /** participants inside this subtree */
  count: number
  left?: RawNode
  right?: RawNode
}

/**
 * جهت چیدن سرریز ورزشکارها در یک گره:
 *  - top: سرریز به بچه بالایی می رود → استراحت پایینِ جفت می نشیند
 *    (اسم بالا، استراحت پایین) — بالای محور آینه نیمه
 *  - bottom: برعکس — استراحت بالای اسم می نشیند — پایین محور آینه نیمه
 *  - root: فقط ریشه — ورزشکارها با گرد کردن به پایین تقسیم می شوند تا
 *    استراحت های اضافی سمت چپ (نیمه اول قرعه) بنشینند:
 *    ۵ استراحت → ۳ سمت چپ و ۲ سمت راست
 */
type SplitMode = 'root' | 'top' | 'bottom'

/**
 * چیدمان اصولی و آینه ای استراحت ها — قانون قرعه کشی:
 * هر نیمه (بال چپ و بال راست برگه) حول محور افقی خودش آینه می شود؛ بالای
 * محور استراحت زیر اسم است و پایین محور بالای اسم. `rows` بازه ردیف های گره
 * داخل نیمه خودش است و جهت از مقایسه با وسط نیمه (wingRows / 2) در می آید.
 */
function splitRaw(
  count: number,
  capacity: number,
  mode: SplitMode,
  rows: { from: number; to: number },
  wingRows: number,
  byePlacement: ByePlacementId,
): RawNode {
  if (capacity === 1) {
    return { kind: 'leaf', count }
  }
  const half = capacity / 2
  const leftCount =
    mode === 'top'
      ? Math.min(half, Math.ceil(count / 2))
      : Math.max(count - half, Math.floor(count / 2))
  const mid = rows.from + half
  const childMode = (from: number, to: number): SplitMode =>
    byePlacement === 'belowName' ? 'top' : mirrorMode(from, to, wingRows)
  return {
    kind: 'match',
    count,
    left: splitRaw(leftCount, half, childMode(rows.from, mid), { from: rows.from, to: mid }, wingRows, byePlacement),
    right: splitRaw(count - leftCount, half, childMode(mid, rows.to), { from: mid, to: rows.to }, wingRows, byePlacement),
  }
}

/** بالای محور نیمه → top، پایینش → bottom؛ گره ای که روی محور می نشیند (خود نیمه) → top */
function mirrorMode(from: number, to: number, wingRows: number): SplitMode {
  return to <= wingRows / 2 || from < wingRows / 2 ? 'top' : 'bottom'
}

/**
 * چیدمان «همیشه زیر اسم» با قانون چهارگوشه — ترتیب اولویت مسابقه های
 * استراحت گیرنده روی برگه (طبق الگوی قرعه کشی):
 *   ۱) اولین مسابقه نیمه چپ   ۲) اولین مسابقه نیمه راست
 *   ۳) آخرین مسابقه نیمه چپ   ۴) آخرین مسابقه نیمه راست
 *   ۵) به بعد — استراحت های اضافی به سمت «اکثریت استراحت ها» می روند و از
 *      بالای همان سمت یکی در میان با سمت مقابل به سمت وسط نیمه می نشینند
 *      («سمت راست جدول قسمت بالا» با پیش فرض راست).
 * هر مسابقه دور یک یا «استراحت دار» است (هنرجو خانه بالا، استراحت خانه پایین)
 * یا «واقعی» (دو هنرجو)؛ استراحت ها به ترتیب همین اولویت مسابقه برمی دارند و
 * شمار هنرجوی هر نیمه از دل همین چینش در می آید — با اکثریت راست ۵ استراحت
 * ۲ چپ و ۳ راست می شود و با اکثریت چپ ۳ چپ و ۲ راست.
 */
function buildCornerByeTree(
  participantCount: number,
  bracketSize: number,
  majority: ByeMajorityId,
): RawNode {
  const wingMatches = bracketSize / 4
  const priority: Array<['left' | 'right', number]> = [
    ['left', 0],
    ['right', 0],
    ['left', wingMatches - 1],
    ['right', wingMatches - 1],
  ]
  for (let index = 1; index <= wingMatches - 2; index += 1) {
    if (majority === 'left') {
      priority.push(['left', index], ['right', index])
    } else {
      priority.push(['right', index], ['left', index])
    }
  }
  const byeCount = Math.min(bracketSize - participantCount, priority.length)
  const byeMatches = new Set<string>()
  for (let index = 0; index < byeCount; index += 1) {
    const [wing, matchIndex] = priority[index]!
    byeMatches.add(`${wing}:${matchIndex}`)
  }

  /** بخش [from, to) از برگ های یک نیمه — تک جفتِ دور یک: استراحت دار یا واقعی */
  function buildWingPart(wing: 'left' | 'right', from: number, to: number): RawNode {
    if (to - from === 2) {
      const isBye = byeMatches.has(`${wing}:${from / 2}`)
      return {
        kind: 'match',
        count: isBye ? 1 : 2,
        left: { kind: 'leaf', count: 1 },
        right: { kind: 'leaf', count: isBye ? 0 : 1 },
      }
    }
    const mid = from + (to - from) / 2
    const left = buildWingPart(wing, from, mid)
    const right = buildWingPart(wing, mid, to)
    return { kind: 'match', count: left.count + right.count, left, right }
  }

  const wingRows = bracketSize / 2
  return {
    kind: 'match',
    count: participantCount,
    left: buildWingPart('left', 0, wingRows),
    right: buildWingPart('right', 0, wingRows),
  }
}

/**
 * دو بال برگه — هر دو با جهت top ساخته می شوند (سرریز ورزشکار به بالای نیمه،
 * استراحت ها آینه حول وسط همان نیمه) و ریشه آن ها را با قانون «استراحت
 * اضافی سمت چپ» به هم می دوزد: نیمه اول floor(n/2) ورزشکار می گیرد.
 * حالت «همیشه زیر اسم» از مسیر جداگانه buildCornerByeTree می گذرد (قانون
 * چهارگوشه) و فقط برای برگه دو نفره — که استراحت ندارد — به همین تابع می رسد.
 */
function buildWingedTree(
  participantCount: number,
  bracketSize: number,
  byePlacement: ByePlacementId,
): RawNode {
  const wingRows = bracketSize / 2
  const leftCount = Math.floor(participantCount / 2)
  return {
    kind: 'match',
    count: participantCount,
    left: splitRaw(leftCount, wingRows, 'top', { from: 0, to: wingRows }, wingRows, byePlacement),
    right: splitRaw(
      participantCount - leftCount,
      wingRows,
      'top',
      { from: 0, to: wingRows },
      wingRows,
      byePlacement,
    ),
  }
}

export interface BuildBracketOptions {
  /** جایگاه استراحت ها — پیش فرض آینه ای دو طرف (رفتار همیشگی) */
  byePlacement?: ByePlacementId
  /**
   * اکثریت استراحت ها — فقط در چیدمان «همیشه زیر اسم»؛ سمت ای که استراحت
   * های اضافی (پنجم به بعد) می گیرند. پیش فرض راست (رفتار همیشگی).
   */
  byeMajority?: ByeMajorityId
}

export function buildBracketTree(participantCount: number, options: BuildBracketOptions = {}): BracketStructure {
  if (participantCount < 1) {
    throw new Error('Cannot build a bracket for an empty group')
  }

  // a single athlete is the champion without any match
  if (participantCount === 1) {
    const leaf: StructureLeaf = { kind: 'leaf', slotId: 'slot-1', entryRound: 1 }
    return { root: leaf, leaves: [leaf], restSlotIds: [], bracketSize: 1, roundCount: 0 }
  }

  const bracketSize = 2 ** Math.ceil(Math.log2(participantCount))
  const totalRounds = Math.round(Math.log2(bracketSize))
  // «همیشه زیر اسم» روی برگه های ۴ نفره به بالا: قانون چهارگوشه؛ آینه ای و
  // برگه دو نفره: همان ساختار همیشگی
  const root =
    options.byePlacement === 'belowName' && bracketSize >= 4
      ? buildCornerByeTree(participantCount, bracketSize, options.byeMajority ?? 'right')
      : buildWingedTree(participantCount, bracketSize, options.byePlacement ?? 'mirror')

  const leaves: StructureLeaf[] = []
  const matches: StructureMatch[] = []
  const restSlotIds: string[] = []

  /**
   * `entryRound` — the round in which the occupant of a leaf actually fights.
   * Leaf children of a match holding 2+ participants fight in that match;
   * below a match with a single participant (walkover) the pending round is
   * passed through untouched, so the waiting athlete enters the next round
   * while the sibling slot stays empty («استراحت»).
   */
  function annotate(node: RawNode, depth: number, pendingRound: number): BracketStructureNode {
    if (node.kind === 'leaf') {
      if (node.count === 0) restSlotIds.push(`slot-${leaves.length + 1}`)
      const leaf: StructureLeaf = {
        kind: 'leaf',
        slotId: `slot-${leaves.length + 1}`,
        entryRound: Math.max(pendingRound, 1),
      }
      leaves.push(leaf)
      return leaf
    }
    const round = Math.max(totalRounds - depth, 1)
    const nextPending = node.count >= 2 ? round : pendingRound
    const match: StructureMatch = {
      kind: 'match',
      matchId: '',
      matchNumber: 0,
      round,
      entrantCount: node.count,
      left: annotate(node.left!, depth + 1, nextPending),
      right: annotate(node.right!, depth + 1, nextPending),
    }
    matches.push(match)
    return match
  }

  const structureRoot = annotate(root, 0, 1)

  // only genuinely contested matches (both corners reach the mat) get a
  // number, ordered round 1 → final like a real draw sheet; walkovers stay
  // unnumbered
  let contestedIndex = 0
  let walkoverIndex = 0
  for (const match of matches.slice().sort((a, b) => a.round - b.round)) {
    if (match.entrantCount >= 2) {
      contestedIndex += 1
      match.matchNumber = contestedIndex
      match.matchId = `match-${contestedIndex}`
    } else {
      walkoverIndex += 1
      match.matchId = `match-bye-${walkoverIndex}`
    }
  }

  return {
    root: structureRoot,
    leaves,
    restSlotIds,
    bracketSize,
    roundCount: totalRounds,
  }
}
