export interface BeltColor {
  hex: string
  needsBorder: boolean
}

const beltColors: BeltColor[] = [
  { hex: '#f2f2ec', needsBorder: true },
  { hex: '#f2c94c', needsBorder: false },
  { hex: '#2f9e44', needsBorder: false },
  { hex: '#2f80ed', needsBorder: false },
  { hex: '#d93025', needsBorder: false },
  { hex: '#16181d', needsBorder: false },
]

function hashText(text: string): number {
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0
  }
  return hash
}

export function beltColorFor(categoryName: string): BeltColor {
  return beltColors[hashText(categoryName) % beltColors.length]
}
