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
 * Classic tournament bracket: the sheet is always a power of two (2, 4, 8, 16,
 * 32, 64 …) and every absent slot becomes an explicit first-round bye. The
 * participants are spread with the ceil/floor rule at every level, which puts
 * the byes at the BOTTOM of each section:
 *
 *   N=5 → sheet of 8:  3 athletes on the first side — two of them fight in
 *   round 1 while the lone one waits below, his opponent being «استراحت» —
 *   and 2 athletes on the other side, both entering the semifinal on a bye.
 */
function splitRaw(count: number, capacity: number): RawNode {
  if (capacity === 1) {
    return { kind: 'leaf', count }
  }
  const leftCount = Math.min(capacity / 2, Math.ceil(count / 2))
  return {
    kind: 'match',
    count,
    left: splitRaw(leftCount, capacity / 2),
    right: splitRaw(count - leftCount, capacity / 2),
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
  const root = splitRaw(participantCount, bracketSize)

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
