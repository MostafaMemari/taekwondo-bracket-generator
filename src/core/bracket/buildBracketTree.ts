import type {
  BracketStructure,
  BracketStructureNode,
  StructureLeaf,
  StructureMatch,
} from '../types.ts'

interface RawNode {
  kind: 'leaf' | 'match'
  left?: RawNode
  right?: RawNode
}

interface RoundedNode {
  source: RawNode
  rounds: number
  left?: RoundedNode
  right?: RoundedNode
}

function splitRaw(count: number): RawNode {
  if (count === 1) {
    return { kind: 'leaf' }
  }
  return {
    kind: 'match',
    left: splitRaw(Math.ceil(count / 2)),
    right: splitRaw(Math.floor(count / 2)),
  }
}

function withRounds(source: RawNode): RoundedNode {
  if (source.kind === 'leaf') {
    return { source, rounds: 0 }
  }
  const left = withRounds(source.left!)
  const right = withRounds(source.right!)
  return {
    source,
    rounds: Math.max(left.rounds, right.rounds) + 1,
    left,
    right,
  }
}

export function buildBracketTree(participantCount: number): BracketStructure {
  if (participantCount < 1) {
    throw new Error('Cannot build a bracket for an empty group')
  }

  const roundedRoot = withRounds(splitRaw(participantCount))
  const totalRounds = roundedRoot.rounds
  const leaves: StructureLeaf[] = []
  const matches: StructureMatch[] = []

  function annotate(node: RoundedNode, parentRound: number): BracketStructureNode {
    if (node.source.kind === 'leaf') {
      const leaf: StructureLeaf = {
        kind: 'leaf',
        slotId: `slot-${leaves.length + 1}`,
        entryRound: Math.max(parentRound, 1),
      }
      leaves.push(leaf)
      return leaf
    }
    const match: StructureMatch = {
      kind: 'match',
      matchId: '',
      matchNumber: 0,
      round: node.rounds,
      left: annotate(node.left!, node.rounds),
      right: annotate(node.right!, node.rounds),
    }
    matches.push(match)
    return match
  }

  const root = annotate(roundedRoot, 0)

  matches
    .slice()
    .sort((a, b) => a.round - b.round)
    .forEach((match, index) => {
      match.matchNumber = index + 1
      match.matchId = `match-${index + 1}`
    })

  return {
    root,
    leaves,
    byeSlotIds: leaves.filter((leaf) => leaf.entryRound > 1).map((leaf) => leaf.slotId),
    roundCount: totalRounds,
  }
}
