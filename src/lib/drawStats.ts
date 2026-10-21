import type { GroupDraw } from '../core/types.ts'
import { toFaDigits } from './formatFa.ts'

/**
 * تعداد مسابقه های واقعی یک وزن: در جدول حذفی تک نفره هر شرکت کننده دقیقا
 * یک بار می بازد، پس تعداد مسابقه ها همیشه «نفرات منهای یک» است — حتی با
 * استراحت ها. جدول ۴ نفره باران مدال مسابقه رده بندی هم دارد (یکی بیشتر).
 * گروه خالی صفر مسابقه دارد.
 */
export function realMatchCount(draw: GroupDraw): number {
  if (draw.structure.roundCount === 0) return 0
  const base = Math.max(0, draw.group.participantIds.length - 1)
  return base + (draw.structure.bronzeMatch ? 1 : 0)
}

/** برچسب استاندارد یک وزن برای فهرست ها و option ها — با شمار مسابقه ها */
export function groupOptionLabel(draw: GroupDraw): string {
  return `${draw.group.ageCategory} — وزن ${draw.group.weightCategory} (${toFaDigits(realMatchCount(draw))} مسابقه)`
}
