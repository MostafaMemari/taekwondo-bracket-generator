/**
 * کمربندهای دستی جدول ها — فهرست آماده و قواعد یکجا.
 *
 * کمربند دو لایه دارد:
 *   - کمربند «بازه زمانی» (sessionBeltLabels) — یک بار در برنامه ریزی زمین ها
 *     کنار ساعت انتخاب می شود و روی سربرگ همه جدول های همان بازه می نشیند؛
 *     درست مثل ساعت که با یک ورودی به همه جدول های بازه می رسد.
 *   - کمربند «هر جدول» (tableBeltLabels) — اگر یک جدول کمربند خودش را داشته
 *     باشد، همان بر کمربند بازه مقدم است (بازنویسی محلی).
 *
 * مقدار ذخیره شده همان تایپ کاربر است (فاصله های اول/آخر دست نمی خورد تا
 * تایپ در ورودی روان بماند) — نمایش همیشه با trim انجام می شود.
 */

/** کمربندهای آماده — به ترتیب رشد کمربند در تکواندو */
export const beltPresets: readonly string[] = [
  'سفید',
  'زرد',
  'زرد و سبز',
  'سبز',
  'سبز و آبی',
  'آبی',
  'آبی و قرمز',
  'قرمز',
  'قرمز و مشکی',
  'مشکی',
]

/** شناسه گزینه «دلخواه» در select — با خود کمربند اشتباه نشود */
export const CUSTOM_BELT = '__custom__'

/** مقدار ذخیره شده کمربند یک جدول/بازه است یا نه */
export function isPresetBelt(value: string): boolean {
  return beltPresets.includes(value)
}

/** کمربند قابل نمایش — فاصله های اضافی اول/آخر را می ریزد */
export function beltDisplayValue(value: string | undefined): string {
  return (value ?? '').trim()
}

/**
 * کمربند مؤثر یک جدول: کمربند خود جدول مقدم است، بعد کمربند بازه اش، بعد هیچ.
 * هر دو ورودی خام اند (همان که کاربر تایپ کرده) — خروجی همیشه trim شده است.
 */
export function resolveBeltLabel(
  tableValue: string | undefined,
  sessionValue: string | undefined,
): string {
  return beltDisplayValue(tableValue) || beltDisplayValue(sessionValue)
}
