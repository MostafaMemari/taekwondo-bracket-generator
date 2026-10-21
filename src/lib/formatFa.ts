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
  return `${ageCategory} — وزن ${weightCategory}`
}
