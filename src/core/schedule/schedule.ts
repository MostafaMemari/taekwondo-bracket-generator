import type {
  BracketStructureNode,
  GroupDraw,
  Participant,
  SlotAssignments,
  StructureMatch,
} from '../types.ts'
import { toFaDigits } from '../../lib/formatFa.ts'

/**
 * برنامه ریزی زمین ها — the mat/session scheduler.
 *
 * The organizer groups weights into time blocks («بازه ۸:۰۰ تا ۱۰:۰۰») and
 * mats («زمین ۱»). EVERY MAT COUNTS ON ITS OWN — mat 1 runs 1..N, then mat 2
 * starts from 1 again, and so does the next session. INSIDE a mat the tables
 * are stacked biggest-first (32-person, then 16, then 8, …) and the count
 * sweeps ROUND BY ROUND — first round of every table, then back to the first
 * table for round two, and so on, so the finals always land on the last
 * numbers of the mat:
 *
 *   mat 1: R1: 32A 1..8 · 16B 9..12 · 8C 13..15  →  R2: … final takes N
 *   mat 2: starts from 1 again
 */

/** یک زمین مسابقه: وزن هایی که مسابقه هایشان روی همین زمین پشت سرهم شماره می خورد */
export interface ScheduleMat {
  id: string
  label: string
  groupIds: string[]
}

/** یک بازه زمانی (مثلاً «۸:۰۰» تا «۱۰:۰۰») همراه با زمین های فعال آن */
export interface ScheduleSession {
  id: string
  timeFrom: string
  timeTo: string
  mats: ScheduleMat[]
}

/** یکی از دو گوشه یک مسابقه در فهرست برنامه */
export type ScheduleSide =
  | { kind: 'athlete'; name: string; coach: string }
  | { kind: 'winnerOf'; matchId: string; matchNumber: number }
  | { kind: 'loserOf'; matchId: string; matchNumber: number }

export interface FlatMatch {
  matchId: string
  matchNumber: number
  round: number
  /** مسابقه رده بندی باران مدال — برچسب دورش «رده بندی» است نه فینال */
  bronze?: boolean
  /** ردیف بالا (آبی) */
  chong: ScheduleSide
  /** ردیف پایین (قرمز) */
  hong: ScheduleSide
}

export interface ScheduledMatch extends FlatMatch {
  groupId: string
  ageCategory: string
  weightCategory: string
  /** شماره نهایی مسابقه در کل برنامه */
  seq: number
}

export interface ScheduledWeight {
  groupId: string
  ageCategory: string
  weightCategory: string
  matchCount: number
  /** تعداد کل دورهای جدول این وزن — برای برچسب دورها */
  roundCount: number
  matches: ScheduledMatch[]
  /** ترتیب انتخاب کاربر — برای تساویِ تعداد مسابقه ها */
  order: number
}

export interface ScheduledMat {
  mat: ScheduleMat
  /** مرتب شده از بیشترین تعداد مسابقه به کمترین */
  weights: ScheduledWeight[]
  matchCount: number
  firstSeq: number | null
  lastSeq: number | null
}

export interface ScheduledSession {
  session: ScheduleSession
  mats: ScheduledMat[]
  matchCount: number
}

export interface ScheduleNumberEntry {
  groupId: string
  matchId: string
  seq: number
}

export interface BuiltSchedule {
  sessions: ScheduledSession[]
  totalMatches: number
  /** وزن های قرارگرفته در برنامه (به ترتیب اولین حضور) */
  assignedGroupIds: string[]
  /** «groupId/matchId» → شماره نهایی — برای برچسب «برنده مسابقه N» */
  seqByKey: Map<string, number>
  /** فهرست صاف شماره ها برای نوشتن روی دایره های جدول قرعه */
  numberEntries: ScheduleNumberEntry[]
}

/**
 * فهرست مسابقه های واقعی یک وزن به ترتیب برگه قرعه (دور ۱ تا فینال)؛
 * به همراه نام ورزشکاران یا ارجاع «برنده مسابقه N» برای دورهای بعدی.
 */
export function flattenGroupMatches(
  draw: GroupDraw,
  participantsById: Map<string, Participant>,
): FlatMatch[] {
  const found: Array<Pick<StructureMatch, 'matchId' | 'matchNumber' | 'round'> & {
    left: BracketStructureNode
    right: BracketStructureNode
  }> = []

  function walk(node: BracketStructureNode): void {
    if (node.kind === 'leaf') return
    if (node.matchNumber > 0) {
      found.push({
        matchId: node.matchId,
        matchNumber: node.matchNumber,
        round: node.round,
        left: node.left,
        right: node.right,
      })
    }
    walk(node.left)
    walk(node.right)
  }

  walk(draw.structure.root)
  found.sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber)

  const assignments: SlotAssignments = draw.assignments
  const flat: FlatMatch[] = found.map((entry) => ({
    matchId: entry.matchId,
    matchNumber: entry.matchNumber,
    round: entry.round,
    chong: resolveSide(entry.left, assignments, participantsById),
    hong: resolveSide(entry.right, assignments, participantsById),
  }))

  // مسابقه رده بندی باران مدال — درست قبل از فینال شماره می خورد
  const bronze = draw.structure.bronzeMatch
  if (bronze) {
    const [topFrom, bottomFrom] = bronze.fromMatches
    flat.push({
      matchId: bronze.matchId,
      matchNumber: bronze.matchNumber,
      round: bronze.round,
      bronze: true,
      chong: { kind: 'loserOf', matchId: topFrom.matchId, matchNumber: topFrom.matchNumber },
      hong: { kind: 'loserOf', matchId: bottomFrom.matchId, matchNumber: bottomFrom.matchNumber },
    })
    flat.sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber)
  }

  return flat
}

function resolveSide(
  node: BracketStructureNode,
  assignments: SlotAssignments,
  participantsById: Map<string, Participant>,
): ScheduleSide {
  if (node.kind === 'leaf') {
    const occupant = assignments[node.slotId]
    if (occupant && occupant.kind === 'participant') {
      const participant = participantsById.get(occupant.participantId)
      if (participant) {
        return { kind: 'athlete', name: participant.fullName, coach: participant.coachName }
      }
    }
    return { kind: 'athlete', name: '—', coach: '' }
  }
  return { kind: 'winnerOf', matchId: node.matchId, matchNumber: node.matchNumber }
}

/**
 * محاسبه کل برنامه: بازه ها → زمین ها → وزن ها (از بیشترین مسابقه به کمترین)؛
 * شماره گذاری در هر زمین مستقل است و از ۱ شروع می شود — در هر زمین دوربه دور:
 * دور اول همه وزن ها، بعد دور دوم و تا فینال؛ پس فینال ها آخرین شماره های
 * همان زمین را می گیرند و زمین بعدی دوباره از ۱ می شمارد.
 */
export function buildSchedule(
  sessions: ScheduleSession[],
  draws: Record<string, GroupDraw>,
  participantsById: Map<string, Participant>,
): BuiltSchedule {
  const flatCache = new Map<string, FlatMatch[]>()
  const flatOf = (groupId: string): FlatMatch[] => {
    let flat = flatCache.get(groupId)
    if (!flat) {
      const draw = draws[groupId]
      flat = draw ? flattenGroupMatches(draw, participantsById) : []
      flatCache.set(groupId, flat)
    }
    return flat
  }

  const assignedGroupIds: string[] = []
  const seen = new Set<string>()
  const seqByKey = new Map<string, number>()
  const numberEntries: ScheduleNumberEntry[] = []
  const outSessions: ScheduledSession[] = []
  let totalMatches = 0

  for (const session of sessions) {
    const outMats: ScheduledMat[] = []
    for (const mat of session.mats) {
      // هر زمین شماره مخصوص خودش را دارد — شمارش همیشه از ۱ شروع می شود
      let counter = 1
      const matFirst = 1

      // dedupe: a weight lives on exactly one mat; match-less weights are skipped
      const candidates: Array<{ groupId: string; flat: FlatMatch[]; order: number }> = []
      mat.groupIds.forEach((groupId, order) => {
        if (seen.has(groupId)) return
        const flat = flatOf(groupId)
        if (flat.length === 0) return
        candidates.push({ groupId, flat, order })
      })

      // «از تعداد بازی زیاد به کم» — the tables stack top to bottom
      candidates.sort((a, b) => b.flat.length - a.flat.length || a.order - b.order)

      // shells first — the seq of every match is filled by the sweeps below
      const shells: Array<{
        groupId: string
        draw: GroupDraw
        order: number
        matches: ScheduledMatch[]
      }> = candidates.map(({ groupId, flat, order }) => {
        seen.add(groupId)
        assignedGroupIds.push(groupId)
        const draw = draws[groupId]
        return {
          groupId,
          draw,
          order,
          matches: flat.map((match) => ({
            groupId,
            ageCategory: draw.group.ageCategory,
            weightCategory: draw.group.weightCategory,
            ...match,
            seq: 0,
          })),
        }
      })

      // «برگشت به جدول اول» — round-by-round sweeps across the stacked tables:
      // round 1 of every weight (heaviest table first), then round 2, … the
      // finals therefore always take the last numbers of this mat
      const maxRound = shells.reduce(
        (max, shell) => Math.max(max, shell.draw.structure.roundCount),
        0,
      )
      for (let round = 1; round <= maxRound; round += 1) {
        for (const shell of shells) {
          for (const match of shell.matches) {
            if (match.round !== round) continue
            match.seq = counter
            counter += 1
            seqByKey.set(`${shell.groupId}/${match.matchId}`, match.seq)
            numberEntries.push({ groupId: shell.groupId, matchId: match.matchId, seq: match.seq })
          }
        }
      }

      const weights: ScheduledWeight[] = shells.map(({ groupId, draw, order, matches }) => ({
        groupId,
        ageCategory: draw.group.ageCategory,
        weightCategory: draw.group.weightCategory,
        matchCount: matches.length,
        roundCount: draw.structure.roundCount,
        matches,
        order,
      }))

      const matMatchCount = weights.reduce((sum, weight) => sum + weight.matchCount, 0)
      outMats.push({
        mat,
        weights,
        matchCount: matMatchCount,
        firstSeq: matMatchCount > 0 ? matFirst : null,
        lastSeq: matMatchCount > 0 ? counter - 1 : null,
      })
    }

    const sessionMatchCount = outMats.reduce((sum, mat) => sum + mat.matchCount, 0)
    outSessions.push({
      session,
      mats: outMats,
      matchCount: sessionMatchCount,
    })
    totalMatches += sessionMatchCount
  }

  return {
    sessions: outSessions,
    totalMatches,
    assignedGroupIds,
    seqByKey,
    numberEntries,
  }
}

/**
 * شماره زنده برنامه (بدون شماره های دستی) — کلید «groupId/matchId» → رقم فارسی.
 * برای دایره های روی صفحه قرعه: اولویت دستی/برنامه خودِ دایره انجام می شود تا
 * راهنمای آن بتواند «شماره برنامه» را جدا نشان دهد.
 */
export function planMatchNumbers(
  sessions: ScheduleSession[],
  draws: Record<string, GroupDraw>,
  participantsById: Map<string, Participant>,
): Map<string, string> {
  const map = new Map<string, string>()
  if (sessions.length === 0) return map
  const built = buildSchedule(sessions, draws, participantsById)
  for (const entry of built.numberEntries) {
    map.set(`${entry.groupId}/${entry.matchId}`, toFaDigits(entry.seq))
  }
  return map
}

/**
 * شماره نمایشی هر مسابقه روی برگه های چاپ/PDF/عکس — کلید «groupId/matchId» →
 * متن. شماره زنده برنامه + شماره های دستی کاربر که همیشه بر برنامه مقدم اند؛
 * شماره دستی وزن های بیرون از برنامه هم روی جدول خودش می نشیند.
 */
export function effectiveMatchNumbers(
  sessions: ScheduleSession[],
  draws: Record<string, GroupDraw>,
  participantsById: Map<string, Participant>,
  manualNumbers: Record<string, Record<string, string>>,
): Map<string, string> {
  const map = planMatchNumbers(sessions, draws, participantsById)
  for (const [groupId, perMatch] of Object.entries(manualNumbers)) {
    for (const [matchId, text] of Object.entries(perMatch)) {
      const trimmed = text.trim()
      // نمایش همیشه رقم فارسی است — هر چه کاربر تایپ کند (۱ یا 1)
      if (trimmed) map.set(`${groupId}/${matchId}`, toFaDigits(trimmed))
    }
  }
  return map
}

/** یک گوشه هنوز بازیکن مشخص ندارد؟ («برنده مسابقه N» یا «بازنده مسابقه N») */
export function winnerLabelPending(label: string): boolean {
  return label.startsWith('برنده ') || label.startsWith('بازنده ')
}

/** برچسب یک گوشه مسابقه: نام ورزشکار یا ارجاع «برنده/بازنده مسابقه N» با شماره نهایی برنامه — شماره دستی اگر باشد همان نشان داده می شود */
export function scheduleSideLabel(
  side: ScheduleSide,
  groupId: string,
  seqByKey: Map<string, number>,
  manualNumbers?: Map<string, string>,
): string {
  if (side.kind === 'athlete') return side.name
  const prefix = side.kind === 'winnerOf' ? 'برنده مسابقه' : 'بازنده مسابقه'
  const fallback = side.kind === 'winnerOf' ? 'برنده دور قبل' : 'بازنده دور قبل'
  const manual = manualNumbers?.get(`${groupId}/${side.matchId}`)
  if (manual) return `${prefix} ${toFaDigits(manual)}`
  const seq = seqByKey.get(`${groupId}/${side.matchId}`)
  return seq ? `${prefix} ${toFaDigits(seq)}` : fallback
}

/** «بازه ۲ — ساعت ۸:۰۰ تا ۱۰:۰۰» */
export function sessionLabel(session: ScheduleSession, index: number): string {
  const base = `بازه ${toFaDigits(index + 1)}`
  const from = session.timeFrom.trim()
  const to = session.timeTo.trim()
  if (from && to) return `${base} — ساعت ${toFaDigits(from)} تا ${toFaDigits(to)}`
  if (from) return `${base} — ساعت ${toFaDigits(from)}`
  if (to) return `${base} — تا ساعت ${toFaDigits(to)}`
  return base
}

/**
 * یادداشت سربرگ هر برگه: «زمین ۱ • ساعت ۸» — ساعت حضور فقط یک زمان است
 * (ساعت شروع بازه)، نه بازه کامل.
 */
export function sheetScheduleNote(matLabel: string, session: ScheduleSession): string {
  const from = session.timeFrom.trim()
  return from ? `${matLabel} • ساعت ${toFaDigits(from)}` : matLabel
}

/** «مسابقه ۱ تا ۹» یا «مسابقه ۵» یا «—» */
export function seqRangeLabel(first: number | null, last: number | null): string {
  if (first === null || last === null) return ''
  if (first === last) return `مسابقه ${toFaDigits(first)}`
  return `مسابقه ${toFaDigits(first)} تا ${toFaDigits(last)}`
}
