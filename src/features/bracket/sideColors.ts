import type { SlotSide } from '../../core/bracket/layout.ts'

export interface SideTheme {
  /** stronger tint — empty corner rows and the final's placeholders */
  bg: string
  /** soft tint — athlete rows */
  bgSoft: string
  border: string
  borderSoft: string
  /** saturated corner colour — accent bar, legend dots */
  accent: string
  /** text colour on tinted backgrounds */
  text: string
}

/**
 * The two corners of a taekwondo match. Top row = blue, bottom row = red.
 * The colours are deliberately saturated and unmistakable — the corner colour
 * itself does the talking, no written labels anywhere.
 */
export const sideTheme: Record<SlotSide, SideTheme> = {
  chong: {
    bg: '#dbeafe',
    bgSoft: '#eff6ff',
    border: '#93c5fd',
    borderSoft: '#bfdbfe',
    accent: '#2563eb',
    text: '#1d4ed8',
  },
  hong: {
    bg: '#fee2e2',
    bgSoft: '#fef2f2',
    border: '#fca5a5',
    borderSoft: '#fecaca',
    accent: '#dc2626',
    text: '#b91c1c',
  },
}

/** gold used for the final box / final badge / champion plate */
export const FINAL_GOLD = '#d97706'
