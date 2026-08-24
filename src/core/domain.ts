/**
 * Domain vocabulary for the whole app. Pure data — no React, no IO.
 */

export type ParticipantId = string;

/** Coach is identified by display name within one event. */
export type Coach = string;

/** Free label coming from the Excel sheet (e.g. "Kids", "Juniors"). */
export type AgeCategory = string;

/**
 * Predefined weight label exactly as written in the Excel cell
 * (e.g. "-28 kg"). The app never compares numeric weights.
 */
export type WeightCategory = string;

export interface Participant {
  readonly id: ParticipantId;
  readonly fullName: string;
  readonly coach: Coach;
  readonly ageCategory: AgeCategory;
  readonly weightCategory: WeightCategory;
  /** 1-based row number in the source Excel sheet; stable tie-breaker. */
  readonly sourceRow: number;
}

/** Unique key of one bracket = age category × weight category. */
export interface CategoryGroup {
  readonly groupId: string;
  readonly ageCategory: AgeCategory;
  readonly weightCategory: WeightCategory;
  /** Roster order preserved (Excel row order). */
  readonly memberIds: readonly ParticipantId[];
}
