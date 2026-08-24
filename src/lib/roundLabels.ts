import { toFaDigits } from './formatFa.ts'

export function roundLabel(round: number, roundCount: number): string {
  if (round === roundCount) return 'فینال'
  if (round === roundCount - 1 && roundCount >= 3) return 'نیمه‌نهایی'
  return `دور ${toFaDigits(round)}`
}

export function matchLabel(matchNumber: number): string {
  return `مسابقه ${toFaDigits(matchNumber)}`
}
