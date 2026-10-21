/**
 * حالت های ظاهری «شماره مسابقه» — شکل و رنگ بج شماره روی جدول ها از تنظیمات
 * عوض می شود؛ هیچ چیز دیگری — داده، چیدمان، منطق شماره گذاری — دست نمی خورد.
 *
 * رنگ دلخواه کاربر روی همه بج ها می نشیند؛ وقتی رنگی انتخاب نشده باشد
 * («همراه تم») بج ها رنگ خود را از تم جدول می گیرند و فینال طلایی می ماند.
 * این فایل عمدا react ندارد تا در تست node هم لود شود.
 */

export type MatchChipShape = 'circle' | 'rounded' | 'square'
export type MatchChipFill = 'solid' | 'outline'
/** اندازه بج شماره — ضریب رشد روی اندازه پایه چیدمان */
export type MatchChipSize = 'normal' | 'big' | 'huge'

export interface MatchChipStyle {
  /** شکل بج — دایره / مربع گرد / مربع */
  shape: MatchChipShape
  /** پر (پس زمینه رنگی) یا توخالی (حاشیه رنگی با پس زمینه برگه) */
  fill: MatchChipFill
  /** رنگ دلخواه #rrggbb — null یعنی همراه تم جدول */
  color: string | null
}

/** رفتار همیشگی — دایره پر با رنگ تم */
export const defaultMatchChipStyle: MatchChipStyle = {
  shape: 'circle',
  fill: 'solid',
  color: null,
}

export const defaultMatchChipSize: MatchChipSize = 'normal'

export interface MatchChipSizeOption {
  id: MatchChipSize
  name: string
  /** ضریب اندازه — روی بج های خود جدول ضرب می شود */
  factor: number
}

/** سه اندازه آماده — ترتیب نمایش در تنظیمات؛ بزرگ ترها برای شماره های درشت تر */
export const matchChipSizeOptions: readonly MatchChipSizeOption[] = [
  { id: 'normal', name: 'معمولی', factor: 1 },
  { id: 'big', name: 'درشت', factor: 1.25 },
  { id: 'huge', name: 'خیلی درشت', factor: 1.5 },
]

const sizeIds: Record<MatchChipSize, string> = {
  normal: 'normal',
  big: 'big',
  huge: 'huge',
}

/** مقدار ذخیره شده ممکن است خراب باشد — هر چیزی که نشناختیم معمولی می شود */
export function normalizeMatchChipSize(value: unknown): MatchChipSize {
  return typeof value === 'string' && value in sizeIds ? (value as MatchChipSize) : defaultMatchChipSize
}

/** ضریب اندازه بج از شناسه انتخابی */
export function matchChipFactor(size: MatchChipSize): number {
  return matchChipSizeOptions.find((option) => option.id === size)?.factor ?? 1
}

export interface MatchChipMode {
  id: string
  name: string
  shape: MatchChipShape
  fill: MatchChipFill
}

/** شش حالت آماده — سه شکل در دو حالت پر/توخالی؛ ترتیب نمایش در تنظیمات */
export const matchChipModes: readonly MatchChipMode[] = [
  { id: 'circle-solid', name: 'دایره', shape: 'circle', fill: 'solid' },
  { id: 'circle-outline', name: 'دایره توخالی', shape: 'circle', fill: 'outline' },
  { id: 'rounded-solid', name: 'مربع گرد', shape: 'rounded', fill: 'solid' },
  { id: 'rounded-outline', name: 'مربع گرد توخالی', shape: 'rounded', fill: 'outline' },
  { id: 'square-solid', name: 'مربع', shape: 'square', fill: 'solid' },
  { id: 'square-outline', name: 'مربع توخالی', shape: 'square', fill: 'outline' },
]

const shapesById: Record<MatchChipShape, string> = {
  circle: 'circle',
  rounded: 'rounded',
  square: 'square',
}
const fillsById: Record<MatchChipFill, string> = {
  solid: 'solid',
  outline: 'outline',
}

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
}

/** مقدار ذخیره شده ممکن است خراب باشد — هر چیزی که نشناختیم پیش فرض می شود */
export function normalizeMatchChipStyle(value: unknown): MatchChipStyle {
  if (!value || typeof value !== 'object') return defaultMatchChipStyle
  const raw = value as Partial<MatchChipStyle>
  return {
    shape: raw.shape && raw.shape in shapesById ? raw.shape : defaultMatchChipStyle.shape,
    fill: raw.fill && raw.fill in fillsById ? raw.fill : defaultMatchChipStyle.fill,
    color: isHexColor(raw.color) ? raw.color.toLowerCase() : null,
  }
}

/** شعاع گوشه بج بر اساس شکل — دایره کامل، مربع تقریبا تیز، وسط ها متناسب اندازه */
export function matchChipRadius(shape: MatchChipShape, size: number): number {
  if (shape === 'circle') return 999
  if (shape === 'rounded') return Math.max(3, Math.round(size * 0.26))
  return 3
}

/** درخشندگی نسبی رنگ — برای انتخاب متن روشن یا تیره روی پس زمینه رنگی */
function luminance(hex: string): number {
  const channel = (index: number) => {
    const value = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2)
}

/** متن روشن روی رنگ های تیره، متن تیره روی رنگ های روشن (مثلا زرد دلخواه) */
export function readableChipText(bg: string): string {
  return luminance(bg) > 0.45 ? '#101d31' : '#ffffff'
}

/**
 * رنگ نهایی بج شماره — از تم جدول یا رنگ دلخواه کاربر.
 * - همراه تم: مسابقه معمولی matchAccent تم، فینال finalAccent (طلایی)
 * - رنگ دلخواه: همه بج ها با همان رنگ؛ متن پرش خودکار روشن/تیره می شود
 * پالت توخالی هم پس زمینه و متن خالی را از تم می گیرد تا با برگه هماهنگ بماند.
 */
export interface MatchChipPalette {
  /** رنگ اصلی بج — پس زمینه (پر) یا حاشیه و متن (توخالی) */
  accent: string
  /** رنگ متن بج پرشده */
  filledText: string
  /** پس زمینه بج توخالی پرشده — همیشه از تم، تا با برگه هماهنگ بماند */
  outlineBg: string
  emptyBg: string
  emptyText: string
  emptyBorder: string
  focusBg: string
  /** هاله فوکوس — همان رنگ اصلی با شفافیت */
  halo: string
}

export function matchChipPalette(
  style: MatchChipStyle,
  theme: {
    matchAccent: string
    finalAccent: string
    chipEmptyBg: string
    chipEmptyText: string
    chipFocusBg: string
    boxRestBorder: string
  },
  isFinal: boolean,
): MatchChipPalette {
  const accent = style.color ?? (isFinal ? theme.finalAccent : theme.matchAccent)
  return {
    accent,
    filledText: readableChipText(accent),
    outlineBg: theme.chipEmptyBg,
    emptyBg: theme.chipEmptyBg,
    emptyText: theme.chipEmptyText,
    emptyBorder: theme.boxRestBorder,
    focusBg: theme.chipFocusBg,
    halo: `${accent}59`,
  }
}

/** رنگ های آماده کنار «رنگ دلخواه» در تنظیمات — سرمه ای همیشگی اول */
export const matchChipPresetColors: readonly { name: string; value: string }[] = [
  { name: 'سرمه ای', value: '#1e3a5f' },
  { name: 'آبی', value: '#2563eb' },
  { name: 'قرمز', value: '#dc2626' },
  { name: 'سبز', value: '#16a34a' },
  { name: 'بنفش', value: '#7c3aed' },
  { name: 'نارنجی', value: '#ea580c' },
  { name: 'طلایی', value: '#d97706' },
  { name: 'صورتی', value: '#db2777' },
  { name: 'مشکی', value: '#1c1c1c' },
]
