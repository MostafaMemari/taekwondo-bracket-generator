/**
 * راستی آزمایی «انتقال استراحت» — شماره مسابقه ها باید دست نخورده بمانند.
 *
 * جدول ۵ نفره (برگه ۸ نفره، سه استراحت) را می سازیم، استراحت را با درگ شبیه
 * سازی می کنیم (تعویض اسلات صاحب استراحت با هنرجوی مقصد) و بررسی می کنیم:
 *   ۱) ساختار جدول عوض نشود — همان matchId ها و همان matchNumber ها
 *   ۲) مسابقه های «واقعی» (contested) همان های قبل باشند
 *   ۳) شماره گذاری برنامه (flattenGroupMatches) مو به مو ثابت بماند
 *   ۴) فقط نام دو گوشه مسابقه ای که تعویض شده عوض شود
 */
import { generateGroupDraw } from '../src/core/bracket/generateGroupDraw.ts'
import { applySlotSwap } from '../src/core/bracket/applySlotSwap.ts'
import { flattenGroupMatches } from '../src/core/schedule/schedule.ts'
import { tournamentRules } from '../src/config/tournamentRules.ts'
import type { CategoryGroup, GroupDraw, Participant } from '../src/core/types.ts'

let failed = 0
function check(label: string, ok: boolean): void {
  console.log(`${ok ? 'ok' : 'FAIL'}: ${label}`)
  if (!ok) failed += 1
}

function makeParticipant(id: string, name: string): Participant {
  return { id, fullName: name, coachName: `مربی ${name}`, ageCategory: 'آزمایشی', weightCategory: '۲۸-', weightKg: '27.5', sourceRow: 0 }
}

// جدول ۵ نفره
const names = ['علی احمدی', 'رضا قاسمی', 'حسین مرادی', 'امیر حسینی', 'محمد کریمی']
const participants = names.map((n, i) => makeParticipant(`p-${i + 1}`, n))
const byId = new Map(participants.map((p) => [p.id, p]))
const group: CategoryGroup = {
  id: 'g-test',
  ageCategory: 'آزمایشی',
  weightCategory: '۲۸-',
  participantIds: participants.map((p) => p.id),
}
const draw: GroupDraw = generateGroupDraw(group, Object.fromEntries(participants.map((p) => [p.id, p])), tournamentRules)

check('جدول ۵ نفره روی برگه ۸ نفره ساخته شد', draw.structure.bracketSize === 8)
check('سه گوشه استراحت وجود دارد', draw.structure.restSlotIds.length === 3)

/** نمای فشرده شماره گذاری — قبل و بعد باید یکی باشند */
function snapshot(d: GroupDraw): string {
  return flattenGroupMatches(d, byId)
    .map((m) => `#${m.matchNumber}@r${m.round}`)
    .join('|')
}

/** نقشه اسلات → نام هنرجو */
function slotNames(d: GroupDraw): Record<string, string> {
  const out: Record<string, string> = {}
  for (const leaf of d.structure.leaves) {
    const occ = d.assignments[leaf.slotId]
    out[leaf.slotId] = occ.kind === 'participant' ? byId.get(occ.participantId)!.fullName : 'استراحت'
  }
  return out
}

const before = {
  matchIds: JSON.stringify(collectMatchIds(draw)),
  numbers: snapshot(draw),
  slots: slotNames(draw),
}

function collectMatchIds(d: GroupDraw): string[] {
  const ids: string[] = []
  function walk(node: (typeof d.structure.root)): void {
    if (node.kind === 'match') {
      ids.push(`${node.matchId}:${node.matchNumber}`)
      walk(node.left)
      walk(node.right)
    }
  }
  walk(d.structure.root)
  return ids
}

// شبیه سازی درگ استراحت: صاحب کنونی استراحت را پیدا کن و با هنرجوی یک مسابقه
// دور اول دیگر عوضش کن — همان کاری که handleDragEnd با moveParticipant می کند
const restSlot = draw.structure.restSlotIds[0]
const restNumber = Number(restSlot.replace('slot-', ''))
const ownerSlot = `slot-${restNumber - 1}` // همسایه اسلات اولین استراحت — همیشه بالای آن می نشیند
const ownerOcc = draw.assignments[ownerSlot]
if (ownerOcc?.kind !== 'participant') throw new Error(`همسایه استراحت (${ownerSlot}) هنرجو نیست`)
// مقصد: یک خانه واقعی دور اول (مسابقه contested) — با چیدمان آینه ای جای
// جفت contested ثابت نیست، پس پویا پیدا می شود
const targetLeaf = draw.structure.leaves.find(
  (leaf) => leaf.entryRound === 1 && draw.assignments[leaf.slotId].kind === 'participant',
)
if (!targetLeaf) throw new Error('خانه دور اول پر پیدا نشد')
const targetSlot = targetLeaf.slotId

const nextAssignments = applySlotSwap(draw.assignments, ownerSlot, targetSlot)
check('تعویض صاحب استراحت با هنرجوی مقصد انجام شد', nextAssignments !== null)

const after: GroupDraw = { ...draw, assignments: nextAssignments! }
const afterSlots = slotNames(after)

check('ساختار (matchId و matchNumber) دست نخورد', JSON.stringify(collectMatchIds(after)) === before.matchIds)
check('شماره گذاری مسابقه ها مو به مو ثابت ماند', snapshot(after) === before.numbers)

// فقط دو اسلات تعویض شده اند — بقیه دست نخورده
const changed = Object.keys(before.slots).filter((slot) => before.slots[slot] !== afterSlots[slot])
check(
  'فقط دو خانه عوض شده اند',
  changed.length === 2 && changed.sort().join(',') === [ownerSlot, targetSlot].sort().join(','),
)
check('استراحت هنوز همان اسلات ساختاری است', afterSlots[restSlot] === 'استراحت')
check('هنرجوی مقصد حالا صاحب استراحت است — صاحب قبلی جای او نشست', afterSlots[targetSlot] !== 'استراحت' && before.slots[targetSlot] !== afterSlots[targetSlot])

// شماره برنامه: هیچ مسابقه ای شماره اش عوض نشده — چون ساختار ثابت است
const afterFlat = flattenGroupMatches(after, byId)
const beforeFlat = flattenGroupMatches(draw, byId)
check(
  'فهرست مسابقه های شماره دار (برنامه زمین) یکسان ماند',
  beforeFlat.length === afterFlat.length &&
    beforeFlat.every((m, i) => m.matchId === afterFlat[i].matchId && m.matchNumber === afterFlat[i].matchNumber),
)

if (failed > 0) {
  console.error(`${failed} check(s) failed`)
  process.exit(1)
}
console.log('All rest-move checks passed.')
