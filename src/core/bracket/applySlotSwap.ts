import type { BracketStructure, BracketStructureNode, SlotAssignments, StructureMatch } from '../types.ts'

/**
 * Swap two slot occupants — participant with participant, or participant
 * with rest («استراحت»). The structure (matchId / matchNumber) never moves;
 * only the two occupants trade places, so the numbering always stays right.
 * A rest-to-rest swap is a no-op and is rejected.
 */
export function applySlotSwap(
  assignments: SlotAssignments,
  fromSlotId: string,
  toSlotId: string,
): SlotAssignments | null {
  const fromOccupant = assignments[fromSlotId]
  const toOccupant = assignments[toSlotId]
  if (!fromOccupant || !toOccupant || fromSlotId === toSlotId) return null
  // حداقل یک طرف باید هنرجو باشد — جابه‌جایی استراحت با استراحت بی معنی است
  if (fromOccupant.kind !== 'participant' && toOccupant.kind !== 'participant') return null

  return {
    ...assignments,
    [fromSlotId]: toOccupant,
    [toSlotId]: fromOccupant,
  }
}

/**
 * شماره دستی مسابقه ها بعد از تعویض استراحت با هنرجو به روز می شود:
 * مسابقه ای که استراحت به آن رسید «بی کار» می شود — شماره دستی اش پاک می
 * شود — و همان شماره به مسابقه ای می رود که هنرجو جای استراحت نشست و
 * «واقعی» شد (اگر خودش شماره نداشته باشد). فقط دو خانه عوض شده اند پس بقیه
 * شماره ها دست نمی خورند. وقتی چیزی عوض نشود null برمی گردد.
 */
export function reconcileMatchNumberOverrides(
  structure: BracketStructure,
  before: SlotAssignments,
  after: SlotAssignments,
  overrides: Record<string, string>,
  fromSlotId: string,
  toSlotId: string,
): Record<string, string> | null {
  // مالک هر خانه: مسابقه ای که آن خانه یکی از دو گوشه مستقیمش است
  const owner = new Map<string, StructureMatch>()
  const walk = (node: BracketStructureNode) => {
    if (node.kind !== 'match') return
    if (node.left.kind === 'leaf') owner.set(node.left.slotId, node)
    if (node.right.kind === 'leaf') owner.set(node.right.slotId, node)
    walk(node.left)
    walk(node.right)
  }
  walk(structure.root)

  const playedCorners = (match: StructureMatch, assignments: SlotAssignments) =>
    [match.left, match.right].filter(
      (child) => child.kind === 'leaf' && assignments[child.slotId]?.kind === 'participant',
    ).length

  const matchIds = [...new Set(
    [owner.get(fromSlotId)?.matchId, owner.get(toSlotId)?.matchId].filter(Boolean),
  )] as string[]
  if (matchIds.length === 0) return null

  const next = { ...overrides }
  let changed = false
  let freedNumber: string | null = null

  const matchById = new Map<string, StructureMatch>()
  for (const m of owner.values()) matchById.set(m.matchId, m)

  // اول مسابقه ای که بی کار شد — شماره اش آزاد می شود
  for (const matchId of matchIds) {
    const m = matchById.get(matchId)
    if (!m) continue
    if (playedCorners(m, before) >= 2 && playedCorners(m, after) < 2 && next[matchId]) {
      freedNumber = next[matchId]
      delete next[matchId]
      changed = true
    }
  }

  // بعد مسابقه ای که واقعی شد — شماره آزاد شده به او می رسد
  if (freedNumber) {
    for (const matchId of matchIds) {
      const m = matchById.get(matchId)
      if (!m) continue
      if (playedCorners(m, before) < 2 && playedCorners(m, after) >= 2 && !next[matchId]) {
        next[matchId] = freedNumber
        changed = true
        break
      }
    }
  }

  return changed ? next : null
}
