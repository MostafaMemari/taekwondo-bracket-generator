import { toFaDigits } from './formatFa.ts'

export function roundLabel(round: number, roundCount: number): string {
  if (round === roundCount) return 'فینال'
  if (round === roundCount - 1) return 'نیمه نهایی'
  if (round === roundCount - 2) return 'یک چهارم نهایی'
  if (round === roundCount - 3) return 'یک هشتم نهایی'
  if (round === roundCount - 4) return 'یک شانزدهم نهایی'
  if (round === roundCount - 5) return 'یک سی و دوم نهایی'
  return `دور ${toFaDigits(round)}`
}
