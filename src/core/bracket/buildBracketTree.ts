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
  return {
    kind: 'match',
    count,
    left: splitRaw(leftCount, half, mirrorMode(rows.from, mid, wingRows), { from: rows.from, to: mid }, wingRows),
    right: splitRaw(count - leftCount, half, mirrorMode(mid, rows.to, wingRows), { from: mid, to: rows.to }, wingRows),
  }
}

/** بالای محور نیمه → top، پایینش → bottom؛ گره ای که روی محور می نشیند (خود نیمه) → top */
function mirrorMode(from: number, to: number, wingRows: number): SplitMode {
  return to <= wingRows / 2 || from < wingRows / 2 ? 'top' : 'bottom'
}

/**
 * دو بال برگه — هر دو با جهت top ساخته می شوند (سرریز ورزشکار به بالای نیمه،
 * استراحت ها آینه حول وسط همان نیمه) و ریشه آن ها را با قانون «استراحت
 * اضافی سمت چپ» به هم می دوزد: نیمه اول floor(n/2) ورزشکار می گیرد.
 */
function buildWingedTree(participantCount: number, bracketSize: number): RawNode {
  const wingRows = bracketSize / 2
  const leftCount = Math.floor(participantCount / 2)
  return {
    kind: 'match',
    count: participantCount,
    left: splitRaw(leftCount, wingRows, 'top', { from: 0, to: wingRows }, wingRows),
    right: splitRaw(participantCount - leftCount, wingRows, 'top', { from: 0, to: wingRows }, wingRows),
  }
}

export function buildBracketTree(participantCount: number): BracketStructure {
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
  const root = buildWingedTree(participantCount, bracketSize)

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
