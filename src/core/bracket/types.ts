import type { ParticipantId } from '../domain.ts';

/**
 * Bracket structure types. Pure data; nothing here knows about React,
 * Excel or the store.
 */

export type SlotEntry =
  | Readonly<{ kind: 'athlete'; participantId: ParticipantId }>
  | Readonly<{ kind: 'bye' }>;

export type MatchId = string;

/** Binary direction taken from a node: left (top of the sheet) or right. */
export type BranchBit = 0 | 1;

/** Structural description of one leaf position before anyone is placed. */
export interface LeafSpec {
  readonly index: number;
  /**
   * True when the occupant of this leaf skips round 1 (odd-split rest).
   * The recursion guarantees these positions exist exactly where a
   * subgroup of size 1 faces a larger sibling subtree.
   */
  readonly isBye: boolean;
  /** Path from the root: 0 = left child, 1 = right child. */
  readonly path: readonly BranchBit[];
}

export interface BracketShape {
  readonly athleteCount: number;
  readonly leafCount: number;
  /** Height of the tree = number of rounds played. */
  readonly totalRounds: number;
  readonly leaves: readonly LeafSpec[];
}

export interface LeafNode {
  readonly type: 'leaf';
  readonly leafIndex: number;
  readonly entry: SlotEntry;
}

export interface MatchNode {
  readonly type: 'match';
  readonly matchId: MatchId;
  readonly left: BracketNode;
  readonly right: BracketNode;
}

export type BracketNode = LeafNode | MatchNode;

export const isMatchNode = (node: BracketNode): node is MatchNode => node.type === 'match';
export const isLeafNode = (node: BracketNode): node is LeafNode => node.type === 'leaf';

/** A ready-to-render bracket for one category group. */
export interface Bracket {
  readonly groupId: string;
  readonly slots: readonly SlotEntry[];
  readonly root: BracketNode;
  readonly shape: BracketShape;
}
