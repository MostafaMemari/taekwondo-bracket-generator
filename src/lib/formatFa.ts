const faDigitChars = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const

export function toFaDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => faDigitChars[Number(digit)])
}

/** «۱۲» یا «12» → «12» — برای مقایسه شماره های دستی و خودکار */
export function toEnDigits(value: string): string {
  return String(value).replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
}

export function faDate(date: Date): string {
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }).format(date)
}

export function groupTitle(ageCategory: string, weightCategory: string): string {
  // رقم رده سنی و وزن همیشه فارسی رندر می شود («وزن ۱») — روی صفحه، برگه چاپ
  // و نام فایل خروجی یکسان.
  return `${toFaDigits(ageCategory)} — وزن ${toFaDigits(weightCategory)}`
}

/** قالب پیش فرض عنوان وزن ها — همان نمایش قدیمی، این بار قابل تنظیم */
export const SHEET_TITLE_DEFAULT_FORMAT = '{رده سنی} — وزن {وزن}'

/** متغیرهای مجاز قالب — در تنظیمات به کاربر نشان داده می شود */
export const SHEET_TITLE_VARIABLES = ['{رده سنی}', '{وزن}', '{عنوان}'] as const

export interface WeightTitleVars {
  ageCategory: string
  weightCategory: string
  /** عنوان مسابقات از تنظیمات سراسری — جایگزین «{عنوان}» می شود */
  tournamentTitle?: string
}

/**
 * قالب عنوان وزن ها را پر می کند — هم برای سربرگ برگه های چاپی و هم برای
 * نام فایل خروجی ها. قالب خالی یعنی پیش فرض. اگر قالب هیچ متغیری نداشته باشد،
 * به عنوان پیشوند می نشیند و عنوان کامل وزن دنبالش می آید تا برگه بی نام نماند.
 */
export function renderWeightTitle(
  format: string | undefined | null,
  vars: WeightTitleVars,
): string {
  const template = (format ?? '').trim() || SHEET_TITLE_DEFAULT_FORMAT
  let out = template
    .replaceAll('{رده سنی}', toFaDigits(vars.ageCategory.trim()))
    .replaceAll('{وزن}', toFaDigits(vars.weightCategory.trim()))
    .replaceAll('{عنوان}', (vars.tournamentTitle ?? '').trim())
    .replace(/\s{2,}/g, ' ')
    .trim()
  // جداکننده های سرگردان وقتی متغیری خالی می ماند
  out = out.replace(/^[—–-]\s*/, '').replace(/\s*[—–-]+$/, '').trim()
  if (!out) return groupTitle(vars.ageCategory, vars.weightCategory)
  if (!template.includes('{رده سنی}') && !template.includes('{وزن}')) {
    return `${out} — ${groupTitle(vars.ageCategory, vars.weightCategory)}`
  }
  return out
}
