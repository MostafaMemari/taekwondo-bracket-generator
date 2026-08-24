const faDigitChars = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const

export function toFaDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => faDigitChars[Number(digit)])
}

export function faDate(date: Date): string {
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }).format(date)
}

export function groupTitle(ageCategory: string, weightCategory: string): string {
  return `${ageCategory} — وزن ${weightCategory}`
}
