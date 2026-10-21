import type { BracketStructure, BracketStructureNode, BronzeMatchInfo } from '../types.ts'

/** the two corners of a taekwondo match: top row = chong (blue), bottom = hong (red) */
export type SlotSide = 'chong' | 'hong'

export interface LayoutDims {
  cardWidth: number
  cardHeight: number
  /** vertical rhythm between two consecutive slot rows */
  rowHeight: number
  columnPitch: number
  padX: number
  padTop: number
  padBottom: number
  /** padding between the match-box border and its slot rows */
  boxPad: number
  /** gap between the two rows of an intermediate/final box */
  innerGap: number
  /** edge length of the match-number badge sitting on the box edge */
  chipSize: number
  nameFontSize?: number
  subFontSize?: number
  /** خط مربی زیر نام — برگه چاپ آن را از گنجایش ارتفاع کارت حساب می کند */
  showCoach?: boolean
}

export interface LayoutPoint {
  x: number
  y: number
}

export interface LayoutMatch {
  matchId: string
  matchNumber: number
  round: number
  /** walkover — one corner is «استراحت», drawn without a number chip */
  contested: boolean
  x: number
  y: number
  width: number
  height: number
  /** centres of the two slot rows, measured from the box top */
  topRowOffset: number
  bottomRowOffset: number
  /** leaf slots rendered inside the box (round-1 matches) */
  topSlotId: string | null
  bottomSlotId: string | null
  /** جایگاه «برنده مسابقه N» — برگ صفحه پایانی جاهایی که دور قبلش برگه دیگری است */
  topWinner: number | null
  bottomWinner: number | null
  /** جایگاه «بازنده مسابقه N» — فقط مسابقه رده بندی */
  topLoser: number | null
  bottomLoser: number | null
  /** مسابقه رده بندی باران مدال — زیر صفحه قهرمان می نشیند */
  bronze?: boolean
  /** centre of the match-number badge: on the parent-facing box edge (the
   *  final carries its badge on the bottom edge, above the champion plate) */
  chipX: number
  chipY: number
}

export interface LayoutColumn {
  round: number
  x: number
}

export interface LayoutChampion {
  x: number
  y: number
  width: number
  height: number
}

export interface BracketLayout {
  width: number
  height: number
  columns: LayoutColumn[]
  matches: LayoutMatch[]
  connectors: LayoutPoint[][]
  /** the «قهرمان» plate hanging under the final (null for empty draws) */
  champion: LayoutChampion | null
  /** نقطه همگرایی ریشه مجازی صفحات نوار — محل برچسب «ادامه در صفحه بعد» */
  continuePoint: LayoutPoint | null
}

/** ارتفاع نوار سرتیتر «رده بندی» داخل جعبه مسابقه رده بندی */
export const BRONZE_HEADER_HEIGHT = 18

/**
 * سمت نوار رنگی گوشه برای یک جعبه مسابقه — برگه آینه ای است: جعبه های نیمه
 * چپ نوار را روی لبه چپ می گیرند و نیمه راست روی لبه راست تا نوار همیشه سمت
 * بیرونی (ورود مبارز از لبه برگه) بنشیند. جعبه های وسط (فینال) راست می گیرند.
 */
export function barSideForMatch(
  match: { x: number; width: number },
  layoutWidth: number,
): 'left' | 'right' {
  const cx = match.x + match.width / 2
  return cx < layoutWidth / 2 - 0.5 ? 'left' : 'right'
}

export const interactiveLayoutDims: LayoutDims = {
  cardWidth: 200,
  cardHeight: 64,
  rowHeight: 96,
  columnPitch: 272,
  padX: 36,
  padTop: 76,
  padBottom: 44,
  boxPad: 6,
  innerGap: 8,
  chipSize: 30,
  // نام و مربی روی بوم همیشه دو خط خوانا دارند
  nameFontSize: 15,
  subFontSize: 12,
  showCoach: true,
}

/**
 * برگه چاپ — یک اندازه ثابت برای «همه» جدول ها: نام و مربی روی هر کارت دو
 * خطِ خوانا دارند (۱۱ و ۹٫۵) و فقط عرض کارت به تعداد دورها وابسته است. فاصله
 * بین خانه های دور یک (rowHeight − cardHeight − 2×boxPad = ۸) همان درز برش
 * صفحات بزرگ است — computePageTops همان جا برگه را صفحه می کند.
 */
export const printLayoutDims: LayoutDims = {
  cardWidth: 150,
  cardHeight: 38,
  rowHeight: 54,
  columnPitch: 250,
  padX: 26,
  padTop: 34,
  padBottom: 18,
  boxPad: 4,
  innerGap: 6,
  chipSize: 24,
  nameFontSize: 11,
  subFontSize: 9.5,
  showCoach: true,
}

function clamp(min: number, value: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * ابعاد چاپ هر برگه — دیگر «کوچک شدن تا جا شدن» نیست: فونت نام و مربی و
 * ارتفاع کارت برای همه اندازه ها یکسان است (دو خط همیشگی) و فقط عرض کارت
 * با تعداد دورها جمع می شود. برگه های بلند (۳۲ و ۶۴ نفره) به جای ریز شدن،
 * با درزهای بین خانه ها روی چند صفحه A4 ادامه می یابند.
 *
 * جدول دو نفره استثنا است: فقط «فینال» روی برگه است — یک کارت قهرمانی درشت
 * که وسط صفحه می نشیند، نه کارت کوچک گوشه راست؛ نام و مربی هم درشت تر خوانا
 * می شوند.
 */
export function fitPrintDims(roundCount: number, bodyWidth: number): LayoutDims {
  const base = printLayoutDims
  if (roundCount <= 1) {
    return {
      ...base,
      cardWidth: 360,
      cardHeight: 56,
      rowHeight: 86,
      boxPad: 6,
      innerGap: 8,
      chipSize: 28,
      nameFontSize: 15,
      subFontSize: 12,
    }
  }

  const halfSpan = bodyWidth / 2 - base.padX
  // عرض کارت از گام ستون ها در می آید و ۱۲ پیکسل نفس بین ستون ها می ماند
  let cardWidth = base.cardWidth
  let columnPitch = base.columnPitch
  columnPitch = (halfSpan - cardWidth / 2) / (roundCount - 1)
  cardWidth = clamp(70, columnPitch - 12, base.cardWidth)
  columnPitch = (halfSpan - cardWidth / 2) / (roundCount - 1)
  cardWidth = Math.min(cardWidth, Math.max(70, columnPitch - 12))
  return { ...base, cardWidth, columnPitch }
}

/**
 * برش افقی یک برگه بلند به چند صفحه — هر برش روی «درز» می افتد: نقطه ای که
 * با هیچ خانه، صفحه قهرمان یا جدول نتایج برخورد ندارد تا خانه ای دوتکه نشود.
 * blocked = بازه های اشغال شده مختصات صفحه (y مطلق روی برگه)، caps = گنجایش
 * هر صفحه پیاپی. اگر برگه در n صفحه جا شد، مختص بالای هر صفحه برمی گردد.
 */

/**
 * درخت برنامه — برگ عمومی: یا اسلات واقعی دور یک یا جایگاه «برنده مسابقه N»
 * برای صفحه هایی که دورهای اولشان روی برگه دیگری چیده شده است.
 */
export type PlanLeaf =
  | { kind: 'slot'; slotId: string }
  | { kind: 'winner'; matchId: string; matchNumber: number }

export type PlanNode =
  | PlanLeaf
  | {
      kind: 'match'
      matchId: string
      matchNumber: number
      round: number
      /** participants that reach this match (≥ 2 ⇒ actually contested) */
      entrantCount: number
      left: PlanNode
      right: PlanNode
      /**
       * ریشه مجازی صفحات نوار — جعبه و بج نمی گیرد؛ فقط نقطه همگرایی
       * اتصال های دور آخر نوار است («ادامه در صفحه بعد»).
       */
      virtual?: boolean
    }

interface MeasuredNode {
  source: PlanNode
  left?: MeasuredNode
  right?: MeasuredNode
}

interface PlacedNode {
  source: PlanNode
  /** distance (in columns) from the central final column */
  depth: number
  /** half direction: +1 → right of centre, -1 → left of centre, 0 → the final */
  dir: 1 | -1 | 0
  cx: number
  cy: number
  left?: PlacedNode
  right?: PlacedNode
}

function toPlan(node: BracketStructureNode): PlanNode {
  if (node.kind === 'leaf') return { kind: 'slot', slotId: node.slotId }
  return {
    kind: 'match',
    matchId: node.matchId,
    matchNumber: node.matchNumber,
    round: node.round,
    entrantCount: node.entrantCount,
    left: toPlan(node.left),
    right: toPlan(node.right),
  }
}

/**
 * Converging "martial arts" layout: the final sits in the horizontal centre,
 * the FIRST side of the draw — the structure's left wing, the one that gets
 * the extra athlete (e.g. 3 of 5) and match №1 — grows to the LEFT edge and
 * the second side to the RIGHT edge, so the sheet is read from the left:
 * round 1 enters from BOTH edges and every later round moves towards the
 * middle — like real taekwondo draw sheets.
 *
 * Geometry contract (shared with MatchBox):
 *  - the two halves SHARE the same slot rows, so the sheet stays compact and
 *    the semifinals line up horizontally with the final;
 *  - a round-1 match renders both slots inline; its two rows occupy exactly
 *    the leaf rows, so connectors meet the rows head-on;
 *  - intermediate / final boxes are two placeholder rows (chong over hong);
 *  - contested matches carry a solid number badge on their parent-facing box
 *    edge and the final hangs a «قهرمان» plate below it;
 *  - a virtual root (band pages) draws no box and no badge — the two wing
 *    boxes just converge to its point, where the «ادامه» note sits.
 */
/** گزینه های چیدمان — فعلا فقط کلید نمایش صفحه قهرمان (از تنظیمات) */
export interface PlanLayoutOptions {
  /** پلاک «قهرمان» زیر فینال — خاموش شدنش جای خالی نمی سازد و رده بندی بالا می آید */
  showChampion?: boolean
}

export function computePlanLayout(
  plan: PlanNode,
  dims: LayoutDims,
  bronze?: BronzeMatchInfo | null,
  options?: PlanLayoutOptions,
): BracketLayout {
  if (plan.kind !== 'match') {
    return {
      width: dims.cardWidth + dims.padX * 2,
      height: dims.cardHeight + dims.padTop + dims.padBottom,
      columns: [],
      matches: [],
      connectors: [],
      champion: null,
      continuePoint: null,
    }
  }

  // عمق مؤثر = عمیق ترین «جعبه مسابقه» — برگ ها داخل جعبه ها می نشینند و
  // ستون و عرض اضافه نمی سازند
  function maxMatchDepth(node: PlanNode, depth: number): number {
    if (node.kind !== 'match') return -1
    return Math.max(
      depth,
      maxMatchDepth(node.left, depth + 1),
      maxMatchDepth(node.right, depth + 1),
    )
  }
  const maxDepth = maxMatchDepth(plan, 0)
  const width = 2 * (dims.padX + dims.cardWidth / 2 + maxDepth * dims.columnPitch)
  const centerX = width / 2
  const rootRound = plan.round
  const virtualRoot = plan.virtual === true
  const rowCenterY = (row: number): number =>
    dims.padTop + row * dims.rowHeight + dims.cardHeight / 2

  function measure(source: PlanNode): MeasuredNode {
    if (source.kind !== 'match') return { source }
    return {
      source,
      left: measure(source.left),
      right: measure(source.right),
    }
  }

  /** direction: +1 → right of centre, -1 → left of centre (the first side) */
  function place(node: MeasuredNode, depth: number, dir: 1 | -1, cursor: { row: number }): PlacedNode {
    if (node.source.kind !== 'match') {
      const row = cursor.row
      cursor.row += 1
      return {
        source: node.source,
        depth,
        dir,
        cx: centerX + dir * depth * dims.columnPitch,
        cy: rowCenterY(row),
      }
    }
    const left = place(node.left!, depth + 1, dir, cursor)
    const right = place(node.right!, depth + 1, dir, cursor)
    return {
      source: node.source,
      depth,
      dir,
      cx: centerX + dir * depth * dims.columnPitch,
      cy: (left.cy + right.cy) / 2,
      left,
      right,
    }
  }

  const measuredRoot = measure(plan)
  const placedRoot: PlacedNode = { source: measuredRoot.source, depth: 0, dir: 0, cx: centerX, cy: 0 }

  /** ردیف های نوار — هر نیمه روی همین ردیف ها آینه می شود */
  let leafRows = 0
  if (measuredRoot.left && measuredRoot.right) {
    if (plan.round === 1) {
      // the two finals slots stack on the same shared rows
      const shared = { row: 0 }
      placedRoot.left = place(measuredRoot.left, 1, -1, shared)
      placedRoot.right = place(measuredRoot.right, 1, 1, shared)
      leafRows = 2
    } else {
      // both halves share the same rows — one cursor per wing; the structure's
      // left wing (match №1, the extra athlete) is mirrored onto the LEFT edge
      const sharedLeft = { row: 0 }
      placedRoot.left = place(measuredRoot.left, 1, -1, sharedLeft)
      placedRoot.right = place(measuredRoot.right, 1, 1, { row: 0 })
      leafRows = sharedLeft.row
    }
    placedRoot.cy = (placedRoot.left.cy + placedRoot.right.cy) / 2
  } else if (measuredRoot.left ?? measuredRoot.right) {
    const only = place((measuredRoot.left ?? measuredRoot.right)!, 1, 1, { row: 0 })
    placedRoot.left = only
    placedRoot.cy = only.cy
    leafRows = 1
  }

  const matches: LayoutMatch[] = []
  const connectors: LayoutPoint[][] = []

  function leafRef(child: PlacedNode): { slotId: string | null; winnerOf: number | null } {
    if (child.source.kind === 'slot') return { slotId: child.source.slotId, winnerOf: null }
    if (child.source.kind === 'winner') return { slotId: null, winnerOf: child.source.matchNumber }
    return { slotId: null, winnerOf: null }
  }

  function emit(node: PlacedNode): void {
    if (node.source.kind !== 'match') return

    const source = node.source
    const leftChild = node.left!
    const rightChild = node.right!
    const containsLeaves = leftChild.source.kind !== 'match' && rightChild.source.kind !== 'match'

    const rowOffset = containsLeaves
      ? dims.rowHeight / 2
      : (dims.cardHeight + dims.innerGap) / 2
    const height =
      (containsLeaves ? dims.rowHeight + dims.cardHeight : dims.cardHeight * 2 + dims.innerGap) +
      dims.boxPad * 2

    const topLeaf = leafRef(leftChild)
    const bottomLeaf = leafRef(rightChild)

    const match: LayoutMatch = {
      matchId: source.matchId,
      matchNumber: source.matchNumber,
      round: source.round,
      contested: source.entrantCount >= 2,
      x: node.cx - dims.cardWidth / 2,
      y: node.cy - height / 2,
      width: dims.cardWidth,
      height,
      topRowOffset: height / 2 - rowOffset,
      bottomRowOffset: height / 2 + rowOffset,
      topSlotId: containsLeaves ? topLeaf.slotId : null,
      bottomSlotId: containsLeaves ? bottomLeaf.slotId : null,
      topWinner: containsLeaves ? topLeaf.winnerOf : null,
      bottomWinner: containsLeaves ? bottomLeaf.winnerOf : null,
      topLoser: null,
      bottomLoser: null,
      // badge anchored to the box itself: the edge facing the next round
      // (the final, dir 0, wears its badge on the bottom edge). The final that
      // carries REAL name rows (the 2-athlete draw) hangs its badge just below
      // the box, centred in the gap to the champion plate — on the edge it
      // would sit right on the bottom athlete's coach line.
      chipX: node.dir === 0 ? node.cx : node.cx - node.dir * (dims.cardWidth / 2),
      chipY:
        node.dir === 0
          ? node.cy + height / 2 + (containsLeaves ? dims.chipSize / 2 + 8 : 0)
          : node.cy,
    }
    if (!source.virtual) matches.push(match)

    for (const [child, isLeft] of [
      [leftChild, true],
      [rightChild, false],
    ] as const) {
      if (child.source.kind === 'match' && child.source.virtual) continue
      if (source.virtual) {
        // ریشه مجازی: اتصال مستقیم هر جعبه دور آخر نوار به نقطه همگرایی
        const sign: 1 | -1 = child.cx > node.cx ? 1 : -1
        connectors.push([
          { x: child.cx - (sign * dims.cardWidth) / 2, y: child.cy },
          { x: node.cx, y: node.cy },
        ])
        continue
      }
      if (child.source.kind !== 'match') continue
      const rowY = node.cy + (isLeft ? -rowOffset : rowOffset)
      const sign: 1 | -1 = child.cx > node.cx ? 1 : -1
      const childEdgeX = child.cx - (sign * dims.cardWidth) / 2
      const parentEdgeX = node.cx + (sign * dims.cardWidth) / 2

      if (Math.abs(child.cy - rowY) < 0.5) {
        connectors.push([
          { x: childEdgeX, y: child.cy },
          { x: parentEdgeX, y: rowY },
        ])
      } else {
        const jogX = (childEdgeX + parentEdgeX) / 2
        connectors.push([
          { x: childEdgeX, y: child.cy },
          { x: jogX, y: child.cy },
          { x: jogX, y: rowY },
          { x: parentEdgeX, y: rowY },
        ])
      }
    }

    emit(leftChild)
    emit(rightChild)
  }

  emit(placedRoot)

  // «قهرمان» plate under the final; the final's badge sits on its bottom edge
  let champion: LayoutChampion | null = null
  const finalMatch = matches.find((match) => match.round === rootRound)
  if (finalMatch && !virtualRoot && options?.showChampion !== false) {
    const plateWidth = Math.max(130, Math.min(dims.cardWidth, 180))
    const plateHeight = Math.max(40, Math.round(dims.cardHeight * 0.72))
    const plateGap = dims.chipSize + 16
    champion = {
      x: centerX - plateWidth / 2,
      y: finalMatch.y + finalMatch.height + plateGap,
      width: plateWidth,
      height: plateHeight,
    }
    connectors.push([
      { x: centerX, y: finalMatch.y + finalMatch.height },
      { x: centerX, y: champion.y },
    ])
  }

  // مسابقه رده بندی باران مدال — زیر صفحه قهرمان، با دو ردیف «بازنده مسابقه N»
  let bronzeMatch: LayoutMatch | null = null
  if (bronze && finalMatch && !virtualRoot) {
    const [topFrom, bottomFrom] = bronze.fromMatches
    const height =
      dims.boxPad * 2 + BRONZE_HEADER_HEIGHT + dims.cardHeight * 2 + dims.innerGap
    const anchorBottom = champion
      ? champion.y + champion.height
      : finalMatch.y + finalMatch.height
    const y = anchorBottom + 16
    bronzeMatch = {
      matchId: bronze.matchId,
      matchNumber: bronze.matchNumber,
      round: -1,
      contested: true,
      bronze: true,
      x: centerX - dims.cardWidth / 2,
      y,
      width: dims.cardWidth,
      height,
      topRowOffset: dims.boxPad + BRONZE_HEADER_HEIGHT + dims.cardHeight / 2,
      bottomRowOffset:
        dims.boxPad + BRONZE_HEADER_HEIGHT + dims.cardHeight + dims.innerGap + dims.cardHeight / 2,
      topSlotId: null,
      bottomSlotId: null,
      topWinner: null,
      bottomWinner: null,
      topLoser: topFrom.matchNumber,
      bottomLoser: bottomFrom.matchNumber,
      // بج روی لبه پایین — مثل فینال، دور از سرتیتر رده بندی
      chipX: centerX,
      chipY: y + height,
    }
    matches.push(bronzeMatch)
  }

  const columns: LayoutColumn[] = []
  if (!virtualRoot) columns.push({ round: rootRound, x: centerX })
  for (let depth = 1; depth <= maxDepth; depth += 1) {
    columns.push({ round: rootRound - depth, x: centerX + depth * dims.columnPitch })
    columns.push({ round: rootRound - depth, x: centerX - depth * dims.columnPitch })
  }

  const bandBottom = dims.padTop + leafRows * dims.rowHeight
  const championBottom = champion ? champion.y + champion.height : 0
  const bronzeBottom = bronzeMatch ? bronzeMatch.y + bronzeMatch.height : 0
  return {
    width,
    height: Math.max(bandBottom, championBottom, bronzeBottom) + dims.padBottom,
    columns,
    matches,
    connectors,
    champion,
    continuePoint: virtualRoot ? { x: centerX, y: placedRoot.cy } : null,
  }
}

/** یک برگ از درخت ساختار — برای جایگاه «برنده مسابقه N» */
function winnerLeafOf(node: BracketStructureNode): PlanLeaf {
  return node.kind === 'match'
    ? { kind: 'winner', matchId: node.matchId, matchNumber: node.matchNumber }
    : { kind: 'slot', slotId: node.slotId }
}

/** شمردن برگ های یک شاخه — ردیف هایش در فضای ردیف های نیمه می مانند */
function countLeaves(node: BracketStructureNode, cursor: { row: number }): void {
  if (node.kind === 'leaf') {
    cursor.row += 1
    return
  }
  countLeaves(node.left, cursor)
  countLeaves(node.right, cursor)
}

/**
 * برش یک نیمه برای یک صفحه نوار: فقط دورهای ۱ تا BAND_ROUNDS که کامل داخل
 * بازه ردیف ها [from, to) می نشینند — ریشه نیمه (نیمه نهایی و بالاتر) خودش
 * جعبه نمی گیرد و بچه پرشده آن برمی گردد؛ دورهای عمیق ترِ پایین تر هم به
 * صفحه پایانی می روند و ردیف هایشان شمرده می شود تا ردیف بندی نیمه حفظ شود.
 */
function clipWing(wing: BracketStructureNode, from: number, to: number): PlanNode | null {
  return clipRounds(wing, { row: 0 }, from, to, true)
}

function clipRounds(
  node: BracketStructureNode,
  cursor: { row: number },
  from: number,
  to: number,
  skipBox: boolean,
): PlanNode | null {
  if (node.kind === 'leaf') {
    const row = cursor.row
    cursor.row += 1
    return from <= row && row < to ? { kind: 'slot', slotId: node.slotId } : null
  }
  const above = node.round > BAND_ROUNDS
  if (!skipBox && above) {
    countLeaves(node, cursor)
    return null
  }
  // تا وقتی بالای دورهای نوار هستیم از جعبه ها عبور می کنیم — تکه در یکی از بچه هاست
  const childSkip = skipBox && above
  const left = clipRounds(node.left, cursor, from, to, childSkip)
  const right = clipRounds(node.right, cursor, from, to, childSkip)
  if (!left && !right) return null
  if (above) {
    // تکه ۸ ردیفی همیشه کامل داخل یکی از دو بچه نیمه است
    return left ?? right
  }
  return {
    kind: 'match',
    matchId: node.matchId,
    matchNumber: node.matchNumber,
    round: node.round,
    entrantCount: node.entrantCount,
    left: left ?? winnerLeafOf(node.left),
    right: right ?? winnerLeafOf(node.right),
  }
}

/**
 * درخت دورهای پایانی: از ریشه تا دور minRound پایین می رود و فرزندان دور
 * minRound به برگ های «برنده مسابقه N» تبدیل می شوند — چون مسابقه های دور
 * قبل روی صفحات نوار چیده شده اند.
 */
function topPlan(node: BracketStructureNode, minRound: number): PlanNode {
  if (node.kind !== 'match') return winnerLeafOf(node)
  if (node.round === minRound) {
    return {
      kind: 'match',
      matchId: node.matchId,
      matchNumber: node.matchNumber,
      round: node.round,
      entrantCount: node.entrantCount,
      left: winnerLeafOf(node.left),
      right: winnerLeafOf(node.right),
    }
  }
  return {
    kind: 'match',
    matchId: node.matchId,
    matchNumber: node.matchNumber,
    round: node.round,
    entrantCount: node.entrantCount,
    left: topPlan(node.left, minRound),
    right: topPlan(node.right, minRound),
  }
}

export interface PrintPagePlan {
  /** full = برگه یکصفحه ای (تا ۱۶ نفره)؛ band = تکه ۸ ردیفی دورهای اول؛ final = دورهای آخر + قهرمان */
  kind: 'full' | 'band' | 'final'
  plan: PlanNode
  /** ستون های هر نیمه — ورود fitPrintDims برای عرض کارت این صفحه */
  columns: number
  roundFrom: number
  roundTo: number
  /** صفحه نوار: بازه ردیف های این تکه */
  rowFrom?: number
  rowTo?: number
}

/** سقف ردیف های هر صفحه نوار — ۸ ردیف = ۴ خانه دور یک در هر نیمه */
export const BAND_ROWS = 8
/** دورهایی که روی صفحات نوار چیده می شوند — بقیه به صفحه پایانی می روند */
export const BAND_ROUNDS = 3

/**
 * صفحه بندی معنایی برگه چاپ: تا ۸ ردیف یک صفحه کامل؛ بزرگ ترها چند صفحه
 * نوار (هر بار ۸ ردیف، دورهای ۱ تا ۳، هر دو نیمه) به اضافه یک صفحه پایانی
 * (بقیه دورها + قهرمان). همه صفحه ها با همان ابعاد یکسان و درشت رندر می
 * شوند — هیچ جا کوچک شدن نیست و هیچ خانه ای هم دوتکه بریده نمی شود.
 */
export function buildStagedPrintPlans(structure: BracketStructure): PrintPagePlan[] {
  if (structure.roundCount === 0) return []
  const rows = structure.roundCount === 1 ? 2 : structure.bracketSize / 2
  if (rows <= BAND_ROWS) {
    return [
      {
        kind: 'full',
        plan: toPlan(structure.root),
        columns: structure.roundCount,
        roundFrom: 1,
        roundTo: structure.roundCount,
      },
    ]
  }
  const root = structure.root
  if (root.kind !== 'match') return []

  const pages: PrintPagePlan[] = []
  for (let from = 0; from < rows; from += BAND_ROWS) {
    const to = from + BAND_ROWS
    const left = clipWing(root.left, from, to)
    const right = clipWing(root.right, from, to)
    if (!left || !right) continue
    pages.push({
      kind: 'band',
      plan: {
        kind: 'match',
        matchId: `band-${from}`,
        matchNumber: 0,
        round: BAND_ROUNDS + 1,
        entrantCount: 2,
        left,
        right,
        virtual: true,
      },
      columns: BAND_ROUNDS + 1,
      roundFrom: 1,
      roundTo: BAND_ROUNDS,
      rowFrom: from,
      rowTo: to,
    })
  }
  pages.push({
    kind: 'final',
    plan: topPlan(root, BAND_ROUNDS + 1),
    columns: structure.roundCount - BAND_ROUNDS,
    roundFrom: BAND_ROUNDS + 1,
    roundTo: structure.roundCount,
  })
  return pages
}

/** چیدمان کامل یک ساختار — همان قرارداد قدیمی برای بوم و برگه های تک صفحه ای */
export function computeBracketLayout(
  structure: BracketStructure,
  dims: LayoutDims,
  options?: PlanLayoutOptions,
): BracketLayout {
  if (structure.roundCount === 0) {
    return {
      width: dims.cardWidth + dims.padX * 2,
      height: dims.cardHeight + dims.padTop + dims.padBottom,
      columns: [],
      matches: [],
      connectors: [],
      champion: null,
      continuePoint: null,
    }
  }
  return computePlanLayout(toPlan(structure.root), dims, structure.bronzeMatch ?? null, options)
}
