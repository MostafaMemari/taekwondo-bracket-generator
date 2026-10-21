export type ParticipantId = string
export type GroupId = string
export type SlotId = string

export interface Participant {
  id: ParticipantId
  fullName: string
  coachName: string
  ageCategory: string
  weightCategory: string
  /** وزن هنرجو بر حسب کیلوگرم — فقط اطلاعات تکمیلی؛ در چیدمان جدول نقشی ندارد */
  weightKg: string
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
  /** printed number — 0 for walkovers (a corner is «استراحت») */
  matchNumber: number
  round: number
  /** participants that reach this match (≥ 2 ⇒ actually contested) */
  entrantCount: number
  left: BracketStructureNode
  right: BracketStructureNode
}

export type BracketStructureNode = StructureMatch | StructureLeaf

/**
 * مسابقه رده بندی جدول ۴ نفره باران مدال — بازنده های دو نیمه نهایی به هم
 * می رسند تا رتبه های ۱ تا ۴ کامل شود. بیرون از درخت حذفی زندگی می کند و
 * خودش شماره می گیرد (نیمه نهایی ها ۱ و ۲، رده بندی ۳، فینال ۴).
 */
export interface BronzeMatchInfo {
  matchId: string
  matchNumber: number
  /** دور فینال — برای شماره گذاری برنامه درست قبل از فینال می نشیند */
  round: number
  /** دو نیمه نهایی که بازنده هایشان به اینجا می رسند */
  fromMatches: Array<{ matchId: string; matchNumber: number }>
}

export interface BracketStructure {
  root: BracketStructureNode
  leaves: StructureLeaf[]
  /** structurally empty slots — the «استراحت» corners of first-round walkovers */
  restSlotIds: SlotId[]
  /** power-of-two sheet size: 2, 4, 8, 16, 32, 64 … */
  bracketSize: number
  roundCount: number
  /** مسابقه رده بندی — فقط جدول ۴ نفره باران مدال */
  bronzeMatch?: BronzeMatchInfo
}

export interface GroupDraw {
  groupId: GroupId
  group: CategoryGroup
  structure: BracketStructure
  assignments: SlotAssignments
  initialAssignments: SlotAssignments
  history: SlotAssignments[]
}
