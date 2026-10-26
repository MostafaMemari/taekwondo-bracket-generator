/**
 * ظاهر «پلاک قهرمان» زیر فینال — رنگ و متن دلخواه از تنظیمات؛ هیچ چیز
 * دیگری — چیدمان، منطق قرعه، داده — دست نمی خورد.
 *
 * رنگ دلخواه کاربر روی بوم قرعه، برگه چاپ و خروجی عکس/PDF می نشیند؛ وقتی
 * رنگی انتخاب نشده باشد («همراه تم») پلاک رنگ خودش را از تم جدول می گیرد.
 * متن پلاک هم دلخواه است — متن خالی عمدا پذیرفته می شود تا پلاک بدون نوشته
 * بماند و اسم قهرمان بعدا نوشته شود؛ فقط مقدار غایب/خراب به پیش فرض «قهرمان»
 * برمی گردد (سازگاری استورهای قدیمی).
 * این فایل عمدا react ندارد تا در تست node هم لود شود.
 */

import { isHexColor, readableChipText } from './matchChipStyles.ts'

/** متن پیش فرض پلاک — همان برچسب همیشگی */
export const DEFAULT_CHAMPION_LABEL = 'قهرمان'

/** سقف کاراکترهای متن پلاک — پلاک فضای ثابت زیر فینال دارد */
const MAX_LABEL_LENGTH = 40

/**
 * متن ذخیره شده — متن خالی (حتی فقط فاصله) عمدا پذیرفته می شود: پلاک بدون
 * نوشته رندر می شود تا جای اسم قهرمان خالی بماند. فقط مقدار غایب یا غیر رشته
 * ای (استور قدیمی/داده خراب) به پیش فرض «قهرمان» برمی گردد.
 */
export function normalizeChampionLabel(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_CHAMPION_LABEL
  return value.trim().slice(0, MAX_LABEL_LENGTH)
}

/** رنگ ذخیره شده ممکن است خراب باشد — هر چیزی که نشناختیم «همراه تم» می شود */
export function normalizeChampionColor(value: unknown): string | null {
  return isHexColor(value) ? value.toLowerCase() : null
}

/** ترکیب رنگ با سیاه — برای سرِ گرادیان تیره تر از رنگ انتخابی کاربر */
function darken(hex: string, ratio: number): string {
  const channel = (index: number) => {
    const value = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16)
    return Math.round(value * (1 - ratio))
  }
  const toHex = (value: number) => value.toString(16).padStart(2, '0')
  return `#${toHex(channel(0))}${toHex(channel(1))}${toHex(channel(2))}`
}

/** پالت نهایی پلاک قهرمان — از تم جدول یا رنگ دلخواه کاربر */
export interface ChampionPlatePalette {
  /** ابتدای گرادیان */
  from: string
  /** انتهای گرادیان — کمی تیره تر تا پلاک حجم داشته باشد */
  to: string
  /** رنگ متن — خودکار روشن یا تیره تا روی هر رنگی خوانا بماند */
  text: string
  /** سایه پلاک — با همان رنگ انتخابی هماهنگ می ماند */
  shadow: string
}

/**
 * رنگ پلاک قهرمان — همراه تم: رنگ های خود تم (طلایی همیشگی)؛ رنگ دلخواه:
 * گرادیان از همان رنگ تا نسخه تیره ترش، متن خودکار روشن/تیره و سایه همرنگ.
 */
export function championPlatePalette(
  custom: string | null,
  theme: { championFrom: string; championTo: string; championText: string; championShadow: string },
): ChampionPlatePalette {
  if (!custom) {
    return {
      from: theme.championFrom,
      to: theme.championTo,
      text: theme.championText,
      shadow: theme.championShadow,
    }
  }
  return {
    from: custom,
    to: darken(custom, 0.28),
    text: readableChipText(custom),
    shadow: `0 2px 8px ${custom}59`,
  }
}
