import type { BracketStructure } from '../types.ts'
import { toFaDigits } from '../../lib/formatFa.ts'

/**
 * باران مدال — چیدمانی که در آن همه مدال می گیرند: هنرجوهای یک وزن بین چند
 * جدول ۴ نفره (نیمه نهایی و فینال) پخش می شوند و هنرجوی هر جدول دو مبارزه
 * دارد. تقسیم با دو قانون انجام می شود:
 *
 *  ۱. همه جدول ها تا ۴ نفر پر می شوند و باقیمانده جدول آخر را می گیرد؛
 *     اگر باقیمانده ۱ نفر شود، دو جدول آخر متعادل می شوند (۳ + ۲) تا هیچکس
 *     بدون مبارزه مدال نگیرد.
 *  ۲. هنرجوهای یک مربی بین جدول ها پخش می شوند — مربی ای که هنرجوی بیشتری
 *     دارد اول سرو می شود. اگر جدا شدن ممکن نباشد (مربی بیش از تعداد جدول
 *     ها هنرجو دارد)، هم مربی ها درون جدول دو طرف نیمه نهایی می نشینند تا
 *     فقط در فینال به هم بخورند.
 */

export const BRONZE_MATCH_ID = 'match-bronze'

export interface MedalRainRow {
  fullName: string
  coachName: string
}

export interface MedalRainPool {
  athletes: MedalRainRow[]
  /** هشدارهای چیدمان — جایی که جدا کردن هم مربی ها ممکن نشد */
  warnings: string[]
}

/**
 * اندازه جدول ها برای «count» هنرجو: ۷ → [۴، ۳]، ۱۰ → [۴، ۴، ۲]،
 * ۵ → [۳، ۲] (نه ۴ + ۱)، ۹ → [۴، ۳، ۲].
 */
export function medalRainPoolSizes(count: number): number[] {
  if (count <= 0) return []
  const pools = Math.ceil(count / 4)
  const remainder = count - 4 * (pools - 1)
  if (remainder === 1 && pools >= 2) {
    return [...Array.from({ length: pools - 2 }, () => 4), 3, 2]
  }
  return [...Array.from({ length: pools - 1 }, () => 4), remainder]
}

function shuffle<T>(list: T[]): T[] {
  const out = [...list]
  for (let index = out.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    ;[out[index], out[swap]] = [out[swap], out[index]]
  }
  return out
}

/**
 * چیدن درون جدول ۴ نفره — جایگاه ها: [نیمه نهایی ۱ بالا، نیمه نهایی ۱ پایین،
 * نیمه نهایی ۲ بالا، نیمه نهایی ۲ پایین]. هر نیمه ظرفیت ۲ دارد و هم مربی ها
 * تا حد امکان بین دو نیمه پخش می شوند.
 */
function seatFour(athletes: MedalRainRow[]): MedalRainRow[] {
  const firstHalf: MedalRainRow[] = []
  const secondHalf: MedalRainRow[] = []
  const sameCount = (half: MedalRainRow[], coachName: string): number =>
    half.filter((athlete) => athlete.coachName === coachName).length
  for (const athlete of athletes) {
    const firstFull = firstHalf.length >= 2
    const secondFull = secondHalf.length >= 2
    const coach = athlete.coachName
    let toFirst: boolean
    if (firstFull) toFirst = false
    else if (secondFull) toFirst = true
    else if (coach.trim() === '') toFirst = firstHalf.length <= secondHalf.length
    else {
      const firstSame = sameCount(firstHalf, coach)
      const secondSame = sameCount(secondHalf, coach)
      toFirst =
        firstSame !== secondSame ? firstSame < secondSame : firstHalf.length <= secondHalf.length
    }
    ;(toFirst ? firstHalf : secondHalf).push(athlete)
  }
  return [...firstHalf, ...secondHalf]
}

/** جدول ۳ نفره — نفر اول مستقیم به فینال می رود (استراحت)؛ این استراحت به
 *  هنرجویی می رسد که مربی اش در جدول دیگری هم هنرجو دارد */
function seatThree(
  athletes: MedalRainRow[],
  buckets: MedalRainRow[][],
  ownIndex: number,
): MedalRainRow[] {
  const coachElsewhere = (coachName: string): boolean =>
    coachName.trim() !== '' &&
    buckets.some(
      (bucket, index) =>
        index !== ownIndex && bucket.some((athlete) => athlete.coachName === coachName),
    )
  const byeIndex = athletes.findIndex((athlete) => coachElsewhere(athlete.coachName))
  if (byeIndex <= 0) return [...athletes]
  const seated = [...athletes]
  const [bye] = seated.splice(byeIndex, 1)
  return [bye, ...seated]
}

/** هشدارهای یک جدول چیده شده — فقط جایی که هم مربی ها زود به هم می خورند */
function poolWarnings(seated: MedalRainRow[]): string[] {
  const warnings: string[] = []
  const byCoach = new Map<string, number>()
  for (const athlete of seated) {
    const coachName = athlete.coachName.trim()
    if (!coachName) continue
    byCoach.set(coachName, (byCoach.get(coachName) ?? 0) + 1)
  }
  if (seated.length === 2) {
    for (const [coachName, count] of byCoach) {
      if (count >= 2) warnings.push(`مربی ${coachName} — دو هنرجو روبه روی هم`)
    }
    return warnings
  }
  if (seated.length === 4) {
    for (const [coachName, count] of byCoach) {
      if (count < 2) continue
      const firstHalf = seated
        .slice(0, 2)
        .filter((athlete) => athlete.coachName === coachName).length
      if (firstHalf !== 1) {
        warnings.push(`مربی ${coachName} — دو هنرجو در یک نیمه نهایی`)
      }
    }
  }
  return warnings
}

/** تقسیم هنرجوها بین جدول ها — با قرعه تصادفی و دو قانون بالا */
export function splitMedalRainPools(rows: MedalRainRow[]): MedalRainPool[] {
  const athletes = rows.filter((row) => row.fullName.trim().length > 0)
  const sizes = medalRainPoolSizes(athletes.length)
  if (sizes.length === 0) return []

  const buckets: MedalRainRow[][] = sizes.map(() => [])
  const remaining = [...sizes]
  const sameCountOf = (poolIndex: number, coachName: string): number =>
    buckets[poolIndex].filter((athlete) => athlete.coachName === coachName).length

  // دسته بندی بر اساس مربی — پر جمعیت تر اول؛ بی مربی ها محدودیتی ندارند
  const byCoach = new Map<string, MedalRainRow[]>()
  shuffle(athletes).forEach((athlete, index) => {
    const coachName = athlete.coachName.trim() || `__بی مربی ${index}__`
    const list = byCoach.get(coachName) ?? []
    list.push(athlete)
    byCoach.set(coachName, list)
  })
  const coachGroups = [...byCoach.entries()].sort((a, b) => b[1].length - a[1].length)

  for (const [, group] of coachGroups) {
    for (const athlete of group) {
      const coachName = athlete.coachName.trim()
      let bestIndex = -1
      let bestSame = Number.POSITIVE_INFINITY
      let bestFree = Number.NEGATIVE_INFINITY
      for (let index = 0; index < buckets.length; index += 1) {
        if (remaining[index] <= 0) continue
        const same = coachName === '' ? 0 : sameCountOf(index, coachName)
        // اولویت: مربیِ غایب، بعد بیشترین جای خالی، بعد جدول جلوتر
        if (same < bestSame || (same === bestSame && remaining[index] > bestFree)) {
          bestIndex = index
          bestSame = same
          bestFree = remaining[index]
        }
      }
      buckets[bestIndex].push(athlete)
      remaining[bestIndex] -= 1
    }
  }

  return buckets.map((bucket, poolIndex) => {
    const seated =
      bucket.length === 4
        ? seatFour(bucket)
        : bucket.length === 3
          ? seatThree(bucket, buckets, poolIndex)
          : [...bucket]
    return { athletes: seated, warnings: poolWarnings(seated) }
  })
}

/**
 * چسباندن مسابقه رده بندی به ساختار ۴ نفره — فینال از ۳ به ۴ شماره می رود و
 * رده بندی ۳ می گیرد. روی ساختارهای دیگر بی اثر است.
 */
export function attachBronzeMatch(structure: BracketStructure): BracketStructure {
  if (structure.bronzeMatch || structure.bracketSize !== 4 || structure.roundCount !== 2) {
    return structure
  }
  const root = structure.root
  if (root.kind !== 'match') return structure
  const [left, right] = [root.left, root.right]
  if (left.kind !== 'match' || right.kind !== 'match') return structure
  if (left.matchNumber !== 1 || right.matchNumber !== 2 || root.matchNumber !== 3) {
    return structure
  }

  // شماره گذاری: نیمه نهایی ۱ و ۲، رده بندی ۳، فینال ۴
  root.matchNumber = 4
  return {
    ...structure,
    bronzeMatch: {
      matchId: BRONZE_MATCH_ID,
      matchNumber: 3,
      round: root.round,
      fromMatches: [
        { matchId: left.matchId, matchNumber: left.matchNumber },
        { matchId: right.matchId, matchNumber: right.matchNumber },
      ],
    },
  }
}

/** برچسب هشدار کوتاه برای پیش نمایش — تعداد هنرجوهای هم مربی یک جدول */
export function coachCrowdLabel(count: number): string {
  return `${toFaDigits(count)} هنرجو`
}
