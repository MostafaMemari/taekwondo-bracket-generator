import type { BracketStructure, BracketStructureNode } from '../types.ts'

export interface LayoutDims {
  cardWidth: number
  cardHeight: number
  rowHeight: number
  columnPitch: number
  padX: number
  padTop: number
  padBottom: number
  matchHeaderHeight: number
  matchInnerGap: number
}

export interface LayoutPoint {
  x: number
  y: number
}

export interface LayoutCard {
  slotId: string
  kind: 'participant' | 'bye-marker'
  column: number
  x: number
  y: number
}

export interface LayoutMatch {
  matchId: string
  matchNumber: number
  round: number
  x: number
  y: number
  width: number
  height: number
  topSlotId: string | null
  bottomSlotId: string | null
}

export interface LayoutColumn {
  round: number
  x: number
}

export interface BracketLayout {
  width: number
  height: number
  columns: LayoutColumn[]
  cards: LayoutCard[]
  matches: LayoutMatch[]
  connectors: LayoutPoint[][]
}

export const interactiveLayoutDims: LayoutDims = {
  cardWidth: 216,
  cardHeight: 58,
  rowHeight: 88,
  columnPitch: 292,
  padX: 32,
  padTop: 72,
  padBottom: 40,
  matchHeaderHeight: 24,
  matchInnerGap: 8,
}

export const printLayoutDims: LayoutDims = {
  cardWidth: 236,
  cardHeight: 62,
  rowHeight: 90,
  columnPitch: 300,
  padX: 30,
  padTop: 90,
  padBottom: 48,
  matchHeaderHeight: 26,
  matchInnerGap: 10,
}

interface MeasuredNode {
  source: BracketStructureNode
  roundsToLeaf: number
  left?: MeasuredNode
  right?: MeasuredNode
}

interface PlacedNode {
  source: BracketStructureNode
  column: number
  cx: number
  cy: number
  left?: PlacedNode
  right?: PlacedNode
}

export function computeBracketLayout(
  structure: BracketStructure,
  dims: LayoutDims,
): BracketLayout {
  if (structure.roundCount === 0) {
    return {
      width: dims.cardWidth + dims.padX * 2,
      height: dims.cardHeight + dims.padTop + dims.padBottom,
      columns: [],
      cards: [],
      matches: [],
      connectors: [],
    }
  }

  const columnCenterX = (round: number): number =>
    dims.padX + dims.cardWidth / 2 + (structure.roundCount - round) * dims.columnPitch
  const rowCenterY = (row: number): number =>
    dims.padTop + row * dims.rowHeight + dims.cardHeight / 2

  let nextRow = 0

  function place(node: MeasuredNode, parentColumn: number): PlacedNode {
    if (node.source.kind === 'leaf') {
      const row = nextRow
      nextRow += 1
      return {
        source: node.source,
        column: parentColumn,
        cx: columnCenterX(parentColumn),
        cy: rowCenterY(row),
      }
    }
    const left = place(node.left!, node.roundsToLeaf)
    const right = place(node.right!, node.roundsToLeaf)
    return {
      source: node.source,
      column: node.roundsToLeaf,
      cx: columnCenterX(node.roundsToLeaf),
      cy: (left.cy + right.cy) / 2,
      left,
      right,
    }
  }

  function measure(source: BracketStructureNode): MeasuredNode {
    if (source.kind === 'leaf') {
      return { source, roundsToLeaf: 0 }
    }
    const left = measure(source.left)
    const right = measure(source.right)
    return {
      source,
      roundsToLeaf: Math.max(left.roundsToLeaf, right.roundsToLeaf) + 1,
      left,
      right,
    }
  }

  const placedRoot = place(measure(structure.root), 0)

  const cards: LayoutCard[] = []
  const matches: LayoutMatch[] = []
  const connectors: LayoutPoint[][] = []

  function emit(node: PlacedNode): void {
    if (node.source.kind === 'leaf') {
      if (node.column >= 2) {
        cards.push({
          slotId: node.source.slotId,
          kind: 'participant',
          column: node.column,
          x: node.cx - dims.cardWidth / 2,
          y: node.cy - dims.cardHeight / 2,
        })
        cards.push({
          slotId: node.source.slotId,
          kind: 'bye-marker',
          column: node.column - 1,
          x: columnCenterX(node.column - 1) - dims.cardWidth / 2,
          y: node.cy - dims.cardHeight / 2,
        })
      }
      return
    }

    const leftSource = node.left!.source
    const rightSource = node.right!.source
    const topLeaf = leftSource.kind === 'leaf' ? leftSource : null
    const bottomLeaf = rightSource.kind === 'leaf' ? rightSource : null
    const containsSlots = topLeaf !== null && bottomLeaf !== null
    const height = containsSlots
      ? dims.matchHeaderHeight + dims.cardHeight * 2 + dims.matchInnerGap
      : dims.cardHeight

    matches.push({
      matchId: node.source.matchId,
      matchNumber: node.source.matchNumber,
      round: node.column,
      x: node.cx - dims.cardWidth / 2,
      y: node.cy - height / 2,
      width: dims.cardWidth,
      height,
      topSlotId: topLeaf?.slotId ?? null,
      bottomSlotId: bottomLeaf?.slotId ?? null,
    })

    if (!containsSlots) {
      for (const child of [node.left!, node.right!]) {
        if (child.column === node.column) {
          connectors.push([
            { x: child.cx, y: child.cy },
            { x: node.cx, y: node.cy },
          ])
        } else {
          const childEdgeX = child.cx + dims.cardWidth / 2
          const parentEdgeX = node.cx - dims.cardWidth / 2
          const midX = (childEdgeX + parentEdgeX) / 2
          connectors.push([
            { x: childEdgeX, y: child.cy },
            { x: midX, y: child.cy },
            { x: midX, y: node.cy },
            { x: parentEdgeX, y: node.cy },
          ])
        }
      }
    }

    emit(node.left!)
    emit(node.right!)
  }

  emit(placedRoot)

  return {
    width: columnCenterX(1) + dims.cardWidth / 2 + dims.padX,
    height: dims.padTop + structure.leaves.length * dims.rowHeight + dims.padBottom,
    columns: Array.from({ length: structure.roundCount }, (_, index) => ({
      round: index + 1,
      x: columnCenterX(index + 1),
    })),
    cards,
    matches,
    connectors,
  }
}
