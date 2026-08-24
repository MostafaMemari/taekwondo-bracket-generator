export type ParticipantId = string
export type GroupId = string
export type SlotId = string

export interface Participant {
  id: ParticipantId
  fullName: string
  coachName: string
  ageCategory: string
  weightCategory: string
  sourceRow: number
}

export interface ImportIssue {
  rowNumber: number
  missingFields: string[]
}

export interface ParsedRoster {
  participants: Participant[]
  issues: ImportIssue[]
}

export interface CategoryGroup {
  id: GroupId
  ageCategory: string
  weightCategory: string
  participantIds: ParticipantId[]
}

export type SlotOccupant =
  | { kind: 'participant'; participantId: ParticipantId }
  | { kind: 'bye' }

export type SlotAssignments = Record<SlotId, SlotOccupant>

export interface StructureLeaf {
  kind: 'leaf'
  slotId: SlotId
  entryRound: number
}

export interface StructureMatch {
  kind: 'match'
  matchId: string
  matchNumber: number
  round: number
  left: BracketStructureNode
  right: BracketStructureNode
}

export type BracketStructureNode = StructureMatch | StructureLeaf

export interface BracketStructure {
  root: BracketStructureNode
  leaves: StructureLeaf[]
  byeSlotIds: SlotId[]
  roundCount: number
}

export interface GroupDraw {
  groupId: GroupId
  group: CategoryGroup
  structure: BracketStructure
  assignments: SlotAssignments
  initialAssignments: SlotAssignments
  history: SlotAssignments[]
}
