import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { tournamentRules } from '../config/tournamentRules.ts'
import { applySlotSwap, reconcileMatchNumberOverrides } from '../core/bracket/applySlotSwap.ts'
import { generateGroupDraw } from '../core/bracket/generateGroupDraw.ts'
import { attachBronzeMatch } from '../core/bracket/medalRain.ts'
import { groupByCategory } from '../core/grouping/groupByCategory.ts'
import { type ScheduleMat, type ScheduleSession } from '../core/schedule/schedule.ts'
import { createId } from '../core/id.ts'
import { toEnDigits, toFaDigits, SHEET_TITLE_DEFAULT_FORMAT } from '../lib/formatFa.ts'
import {
  defaultMatchChipStyle,
  defaultMatchChipSize,
  normalizeMatchChipSize,
  normalizeMatchChipStyle,
  type MatchChipSize,
  type MatchChipStyle,
} from '../lib/matchChipStyles.ts'
import { isTableThemeId, type TableThemeId } from '../lib/tableThemes.ts'
import {
  normalizeByeMajorityId,
  normalizeByePlacementId,
  normalizeDrawTypeId,
  type ByeMajorityId,
  type ByePlacementId,
  type DrawTypeId,
} from '../lib/drawModes.ts'
import { normalizeSheetLayoutId, type SheetLayoutId } from '../lib/sheetLayouts.ts'
import type {
  CategoryGroup,
  GroupDraw,
  ImportIssue,
  Participant,
  ParsedRoster,
  SlotAssignments,
  SlotOccupant,
} from '../core/types.ts'

export type PageName = 'import' | 'groups' | 'bracket' | 'schedule'

/** دو نوع خروجی: PDF چند صفحه ای یا عکس PNG (تلگرامی، بدون جدول نتایج) */
export type ExportKind = 'pdf' | 'image'

export type ExportScope = 'single' | 'all'

/**
 * یک کار خروجی در جریان: صفحه آفسکرین برگه ها را مونت می کند، می گیرد و
 * دانلود می کند — هم PDF و هم عکس از همین یک ساختار استفاده می کنند.
 */
export interface ExportJob {
  kind: ExportKind
  scope: ExportScope
  /** برای scope «single» — گروه هدف؛ برای «all» بی مصرف است */
  groupId: string | null
}

export interface TournamentMeta {
  /** competition title shown above the bracket (print & screen) */
  title: string
  /** secondary line: venue / date / stage … */
  subtitle: string
  logoDataUrl: string | null
  /**
   * قالب عنوان وزن ها — سربرگ برگه های چاپی و نام فایل خروجی ها با همین قالب
   * ساخته می شود. متغیرها: {رده سنی} {وزن} {عنوان}؛ خالی یعنی پیش فرض.
   */
  sheetTitleFormat: string
}

export const defaultMeta: TournamentMeta = {
  title: '',
  subtitle: '',
  logoDataUrl: null,
  sheetTitleFormat: SHEET_TITLE_DEFAULT_FORMAT,
}

/**
 * per-group manual match numbers, typed straight onto the on-canvas circles:
 * groupId → matchId → short free text (e.g. «۱۲»). Empty by default — the
 * organizer numbers the matches himself; nothing is printed automatically.
 */
export type MatchNumberOverrides = Record<string, Record<string, string>>

/**
 * رده سنی جدول های دستی — جدول خالی که کاربر خودش اندازه اش را انتخاب می کند
 * و اسامی را روی خانه ها می نویسد. کلید گروه «MANUAL_TABLE_AGE__عنوان» است؛
 * از همان مسیر groupByCategory/generateGroupDraw داده واقعی می رود.
 */
export const MANUAL_TABLE_AGE = 'جدول های دستی'

export function isManualGroupId(groupId: string): boolean {
  return groupId.startsWith(`${MANUAL_TABLE_AGE}__`)
}

/**
 * رده سنی وزن های باران مدال — هر وزن به چند جدول ۴ نفره (و باقیمانده ۳ یا ۲
 * نفره) می شکن که هم مربی ها از هم جدا بمانند و هم همه مدال بگیرند. کلید هر
 * جدول «باران مدال__عنوان وزن · جدول N» است.
 */
export const MEDAL_RAIN_AGE = 'باران مدال'

export function isMedalRainGroupId(groupId: string): boolean {
  return groupId.startsWith(`${MEDAL_RAIN_AGE}__`)
}

/** متادیتای یک جدول باران مدال — زمین و ساعت مشترک وزن، روی سربرگ چاپ می نشیند */
export interface MedalRainPoolInfo {
  /** عنوان وزن بدون پسوند جدول — «۵۴-» */
  weightTitle: string
  /** شماره این جدول در وزن — از ۱ */
  poolIndex: number
  /** این وزن با مسابقه رده بندی ساخته شده است */
  bronze: boolean
  matLabel: string
  attendTime: string
  /** شناسه شرکت کننده های همین جدول — برای حذف دقیق */
  participantIds: string[]
}

/** یک ردیف ورودی باران مدال — هنرجو با مربی اش */
export interface MedalRainPoolInput {
  fullName: string
  coachName: string
}

/** متادیتای یک جدول دستی — زمین و ساعت روی سربرگ چاپ می نشیند */
export interface ManualTableInfo {
  /** اندازه برگه: ۲/۴/۸/۱۶/۳۲/۶۴ — همه خانه ها شرکت کننده اند (نام ممکن است خالی باشد) */
  size: number
  matLabel: string
  attendTime: string
  /** شناسه شرکت کننده های همین جدول — برای حذف دقیق */
  participantIds: string[]
}

interface TournamentState {
  page: PageName
  fileName: string | null
  importedAt: string | null
  participants: Participant[]
  issues: ImportIssue[]
  draws: Record<string, GroupDraw>
  selectedGroupId: string | null
  exportJob: ExportJob | null
  meta: TournamentMeta
  matchNumberOverrides: MatchNumberOverrides
  settingsOpen: boolean
  /** برنامه زمین ها: بازه های زمانی و وزن های هر زمین */
  scheduleSessions: ScheduleSession[]
  /** جدول های دستی خالی — کلید = شناسه گروه */
  manualTables: Record<string, ManualTableInfo>
  /** جدول های باران مدال — کلید = شناسه گروه هر جدول */
  medalRainTables: Record<string, MedalRainPoolInfo>
  /**
   * کمربند دستی هر جدول — مثلا «سبز و آبی» — برای همه انواع جدول (اکسل،
   * دستی، باران مدال) و به شکل یک بج کوچک کنار عنوان وزن روی سربرگ برگه.
   * مقدار خام همان تایپ کاربر است (بدون trim) تا تایپ فاصله در ورودی روان بماند.
   */
  tableBeltLabels: Record<string, string>
  /**
   * کمربند هر بازه زمانی — مثل ساعت: یک بار کنار ساعت بازه انتخاب می شود و
   * روی همه جدول های همان بازه می نشیند؛ جدولی که کمربند خودش را داشته باشد
   * همان را نشان می دهد (کمربند جدول بر کمربند بازه مقدم است).
   */
  sessionBeltLabels: Record<string, string>

  importRoster: (fileName: string, roster: ParsedRoster) => void
  clearAll: () => void
  openGroups: () => void
  openImport: () => void
  openBracket: (groupId: string) => void
  moveParticipant: (groupId: string, fromSlotId: string, toSlotId: string) => void
  undoMove: (groupId: string) => void
  resetGroupLayout: (groupId: string) => void
  startExportJob: (job: ExportJob) => void
  finishExportJob: () => void
  exportGroupPdf: (groupId: string) => void
  /** PNG export straight from a group card on the groups page */
  exportGroupImage: (groupId: string) => void
  updateMeta: (patch: Partial<TournamentMeta>) => void
  setMatchNumber: (groupId: string, matchId: string, value: string | null) => void
  resetMatchNumbers: (groupId: string) => void
  setSettingsOpen: (open: boolean) => void

  openSchedule: () => void
  addScheduleSession: () => void
  removeScheduleSession: (sessionId: string) => void
  updateScheduleSession: (sessionId: string, patch: Partial<Pick<ScheduleSession, 'timeFrom' | 'timeTo'>>) => void
  addScheduleMat: (sessionId: string) => void
  removeScheduleMat: (sessionId: string, matId: string) => void
  updateScheduleMat: (sessionId: string, matId: string, patch: Partial<Pick<ScheduleMat, 'label'>>) => void
  /** جابه جایی ترتیب زمین ها — روی ترتیب شماره گذاری اثر می گذارد */
  moveScheduleMat: (sessionId: string, matId: string, direction: -1 | 1) => void
  /** وزن را به زمین اضافه می کند — اگر جای دیگری باشد جابه جا می شود */
  toggleScheduleGroup: (sessionId: string, matId: string, groupId: string) => void
  /** وزن را به زمین مقصد می برد — از هر زمین/بازه ای که باشد برداشته می شود */
  moveScheduleGroup: (sessionId: string, matId: string, groupId: string) => void
  /**
   * قرعه کشی دوباره یک وزن — همان هنرجوها با چیدمان تازه؛ قواعد جدا ماندن
   * مربی ها و اولویت استراحت سر جایش است. جدول های دستی قرعه ندارند.
   */
  redrawGroup: (groupId: string) => void
  /**
   * قرعه کشی دوباره همه جدول های واقعی و باران مدال با تنظیمات فعلی قرعه —
   * برای وقتی که نوع قرعه کشی یا چیدمان استراحت از تنظیمات عوض می شود.
   * جدول های دستی که اسامی تایپی دارند دست نمی خورند و شماره های دستی هم
   * می مانند (ساختار برگه ها عوض نمی شود).
   */
  redrawAllRealGroups: () => void

  /** ساخت جدول دستی خالی — همان مسیر قرعه کشی داده واقعی */
  createManualTable: (input: { size: number; title: string; matLabel: string; attendTime: string }) => void
  /** زمین و ساعت یک جدول دستی */
  updateManualTableInfo: (groupId: string, patch: Partial<Pick<ManualTableInfo, 'matLabel' | 'attendTime'>>) => void
  /** حذف کامل جدول دستی با شرکت کننده هایش */
  removeManualTable: (groupId: string) => void
  /** نوشتن نام/مربی روی یک شرکت کننده — جدول های دستی */
  updateParticipant: (participantId: string, patch: Partial<Pick<Participant, 'fullName' | 'coachName'>>) => void
  /**
   * افزودن هنرجوی تازه به یک جدول — بسته به نوع جدول:
   *  • جدول دستی → اولین خانه بی نام پر می شود (ساختار ثابت می ماند)؛
   *  • خانه استراحت آزاد → هنرجو همان جا می نشیند و بقیه چیدمان و شماره ها
   *    دست نمی خورند؛
   *  • جدول پر و واقعی → برگه به اندازه بعدی بزرگ می شود و قرعه از نو چیده
   *    می شود (شماره های دستی همان جدول پاک می شوند)؛
   *  • جدول باران مدال ۴ نفره رشد نمی کند — «full» برمی گردد.
   * مقدار برگشتی: placed (در استراحت/خانه خالی نشست) · grown (برگه بزرگ شد)
   * · full (جایی نبود) · unknown (جدول پیدا نشد یا نام خالی بود).
   */
  addParticipantToGroup: (
    groupId: string,
    input: { fullName: string; coachName: string },
    /** اگر داده شود، هنرجو دقیقا در همین خانه استراحت می نشیند */
    targetSlotId?: string,
  ) => 'placed' | 'grown' | 'full' | 'unknown'
  /**
   * حذف کامل یک هنرجو از جدولش — خانه اش «استراحت» می شود و از فهرست
   * هنرجوها و شناسه های جدول باران مدال پاک می شود؛ تاریخچه واگرد هم بی نام
   * او بازنویسی می شود تا با واگرد دوباره زنده نشود. در جدول دستی خانه ها
   * ثابت اند و فقط نام و مربی خالی می شود. اگر جدول بی هنرجو بماند، کل
   * جدول (و رد آن در برنامه زمین ها) حذف می شود.
   */
  removeParticipant: (groupId: string, participantId: string) => void

  /**
   * ساخت جدول های باران مدال — چند جدول ۴/۳/۲ نفره از فهرست هنرجوها؛
   * چیدمان قبلا در پیش نمایش انجام و سواپ شده و همینجا ثبت می شود.
   * «replace» داده فعلی را کامل جایگزین می کند (مسیر داده نمونه).
   */
  createMedalRainTables: (input: {
    title: string
    matLabel: string
    attendTime: string
    bronze: boolean
    pools: MedalRainPoolInput[][]
    replace?: boolean
    fileName?: string
  }) => void
  /** زمین و ساعت یک جدول باران مدال */
  updateMedalRainInfo: (groupId: string, patch: Partial<Pick<MedalRainPoolInfo, 'matLabel' | 'attendTime'>>) => void
  /** حذف کامل یک جدول باران مدال با شرکت کننده هایش */
  removeMedalRainTable: (groupId: string) => void
  /**
   * کمربند دستی یک جدول — از select کمربندها یا تایپ دلخواه؛ مقدار خالی
   * یعنی پاک کردن. مقدار بدون trim ذخیره می شود تا تایپ فاصله در وسط/آخر
   * عبارت مثل «سبز و آبی » هرگز گم نشود.
   */
  setTableBeltLabel: (groupId: string, value: string) => void
  /**
   * کمربند یک بازه زمانی — روی همه جدول های همان بازه می نشیند (مثل ساعت
   * بازه)؛ مقدار خالی یعنی پاک کردن.
   */
  setSessionBeltLabel: (sessionId: string, value: string) => void
  /** تم بصری جدول ها — فقط ظاهر برگه ها عوض می شود، از تنظیمات */
  tableThemeId: TableThemeId
  setTableThemeId: (id: TableThemeId) => void
  /**
   * ظاهر بج شماره مسابقه — شکل (دایره/مربع گرد/مربع)، پر یا توخالی و رنگ دلخواه؛
   * انتخاب شخصی است و با importRoster/clearAll عوض نمی شود.
   */
  matchChipStyle: MatchChipStyle
  setMatchChipStyle: (style: MatchChipStyle) => void
  /**
   * اندازه بج شماره مسابقه — معمولی/درشت/خیلی درشت؛ انتخاب شخصی است و با
   * importRoster/clearAll عوض نمی شود.
   */
  matchChipSize: MatchChipSize
  setMatchChipSize: (size: MatchChipSize) => void
  /**
   * نمایش پلاک «قهرمان» زیر فینال — بوم قرعه، برگه چاپ و خروجی عکس/PDF؛
   * کلید فعال/غیرفعال از تنظیمات. انتخاب شخصی است و با ورود فهرست جدید عوض
   * نمی شود.
   */
  showChampion: boolean
  setShowChampion: (value: boolean) => void
  /**
   * طرح برگه — کلاسیک (ظاهر همیشگی) یا مدرن (سربرگ ریبون دار و جدول با نوار
   * لبه بالا)؛ انتخاب شخصی است و با ورود فهرست جدید عوض نمی شود. تم های رنگی
   * روی هر دو طرح یک جا می نشینند — طرح ساختار است، تم رنگ.
   */
  sheetLayout: SheetLayoutId
  setSheetLayout: (layout: SheetLayoutId) => void
  /**
   * نوع قرعه کشی — جداسازی هم تیمی ها (پیش فرض؛ دو هنرجوی یک مربی دو طرف
   * جدول، سه نفر: دو نفر در نیمه نهایی و استراحت با مربی پرشمار) یا کاملا
   * تصادفی (فیش ها بُر می خورد). انتخاب شخصی است؛ با تغییرش همه قرعه های
   * واقعی و باران مدال از نو چیده می شود — جدول های دستی دست نمی خورند.
   */
  drawTypeId: DrawTypeId
  setDrawTypeId: (id: DrawTypeId) => void
  /**
   * چیدمان استراحت — آینه ای دو طرف (پیش فرض؛ تقسیم چپ و راست حول وسط هر
   * نیمه) یا همیشه زیر اسم (استراحت در هر جفت خانه پایین، اسم بالا). با
   * تغییرش مثل نوع قرعه همه جدول های واقعی از نو چیده می شوند.
   */
  byePlacementId: ByePlacementId
  setByePlacementId: (id: ByePlacementId) => void
  /**
   * اکثریت استراحت ها — فقط در چیدمان «همیشه زیر اسم»؛ سمت ای که استراحت
   * های اضافی (پنجم به بعد) می گیرند: پیش فرض راست (۵ استراحت: ۲ چپ و ۳
   * راست) و سمت چپ (۵ استراحت: ۳ چپ و ۲ راست). با تغییرش مثل بقیه انتخاب
   * های قرعه همه جدول های واقعی از نو چیده می شوند.
   */
  byeMajorityId: ByeMajorityId
  setByeMajorityId: (id: ByeMajorityId) => void
}

const historyLimit = 40

/** گزینه های قرعه کشی از تنظیمات فعلی — به generateGroupDraw پاس داده می شود */
function drawOptions(
  state: { drawTypeId: DrawTypeId; byePlacementId: ByePlacementId; byeMajorityId: ByeMajorityId },
  bronze = false,
): { bronze: boolean; drawType: DrawTypeId; byePlacement: ByePlacementId; byeMajority: ByeMajorityId } {
  return {
    bronze,
    drawType: state.drawTypeId,
    byePlacement: state.byePlacementId,
    byeMajority: state.byeMajorityId,
  }
}

function buildDraws(
  participants: Participant[],
  options: { drawType?: DrawTypeId; byePlacement?: ByePlacementId; byeMajority?: ByeMajorityId } = {},
): Record<string, GroupDraw> {
  const participantsById = Object.fromEntries(participants.map((p) => [p.id, p]))
  return Object.fromEntries(
    groupByCategory(participants).map((group) => [
      group.id,
      generateGroupDraw(group, participantsById, tournamentRules, options),
    ]),
  )
}

export const useTournament = create<TournamentState>()(
  persist(
    (set, get) => ({
      page: 'import',
      fileName: null,
      importedAt: null,
      participants: [],
      issues: [],
      draws: {},
      selectedGroupId: null,
      exportJob: null,
      meta: defaultMeta,
      matchNumberOverrides: {},
      settingsOpen: false,
      scheduleSessions: [],
      manualTables: {},
      medalRainTables: {},
      tableBeltLabels: {},
      sessionBeltLabels: {},
      // تم ظاهری یک انتخاب شخصی است — با ورود فهرست جدید عوض نمی شود
      tableThemeId: 'classic' as TableThemeId,

      setTableThemeId: (id) => set({ tableThemeId: id }),
      // ظاهر شماره هم انتخاب شخصی است — با ورود فهرست جدید دست نمی خورد
      matchChipStyle: defaultMatchChipStyle,
      setMatchChipStyle: (style) => set({ matchChipStyle: normalizeMatchChipStyle(style) }),
      // اندازه شماره هم انتخاب شخصی است
      matchChipSize: defaultMatchChipSize,
      setMatchChipSize: (size) => set({ matchChipSize: normalizeMatchChipSize(size) }),
      // پلاک قهرمان به طور پیش فرض روشن است
      showChampion: true,
      setShowChampion: (value) => set({ showChampion: value }),
      // طرح برگه پیش فرض کلاسیک است — ظاهر همیشگی دست نخورده می ماند
      sheetLayout: 'classic' as SheetLayoutId,
      setSheetLayout: (layout) => set({ sheetLayout: normalizeSheetLayoutId(layout) }),
      // نوع قرعه کشی پیش فرض جداسازی هم تیمی ها است — همان رفتار همیشگی
      drawTypeId: 'coachSeeded' as DrawTypeId,
      setDrawTypeId: (id) => {
        const next = normalizeDrawTypeId(id)
        if (next === get().drawTypeId) return
        set({ drawTypeId: next })
        get().redrawAllRealGroups()
      },
      // چیدمان استراحت پیش فرض آینه ای دو طرف است — همان رفتار همیشگی
      byePlacementId: 'mirror' as ByePlacementId,
      setByePlacementId: (id) => {
        const next = normalizeByePlacementId(id)
        if (next === get().byePlacementId) return
        set({ byePlacementId: next })
        get().redrawAllRealGroups()
      },
      // اکثریت استراحت ها پیش فرض سمت راست است — همان رفتار همیشگی
      byeMajorityId: 'right' as ByeMajorityId,
      setByeMajorityId: (id) => {
        const next = normalizeByeMajorityId(id)
        if (next === get().byeMajorityId) return
        set({ byeMajorityId: next })
        get().redrawAllRealGroups()
      },

      importRoster: (fileName, roster) =>
        set({
          fileName,
          participants: roster.participants,
          issues: roster.issues,
          draws: buildDraws(roster.participants, drawOptions(get())),
          importedAt: new Date().toISOString(),
          page: 'groups',
          selectedGroupId: null,
          // a fresh roster is a fresh start: previous hand-written numbers,
          // the previous mat plan and the old manual tables all die
          matchNumberOverrides: {},
          scheduleSessions: [],
          manualTables: {},
          medalRainTables: {},
          tableBeltLabels: {},
          sessionBeltLabels: {},
        }),

      clearAll: () =>
        set({
          fileName: null,
          importedAt: null,
          participants: [],
          issues: [],
          draws: {},
          selectedGroupId: null,
          page: 'import',
          exportJob: null,
          matchNumberOverrides: {},
          scheduleSessions: [],
          manualTables: {},
          medalRainTables: {},
          tableBeltLabels: {},
          sessionBeltLabels: {},
        }),

      openGroups: () => set({ page: 'groups' }),
      openImport: () => set({ page: 'import' }),
      openSchedule: () => set({ page: 'schedule' }),

      openBracket: (groupId) => set({ page: 'bracket', selectedGroupId: groupId }),

      moveParticipant: (groupId, fromSlotId, toSlotId) => {
        const draw = get().draws[groupId]
        if (!draw) return
        const nextAssignments = applySlotSwap(draw.assignments, fromSlotId, toSlotId)
        if (!nextAssignments) return

        // اگر استراحت با هنرجو عوض شده باشد، مسابقه ای که بی کار شده شماره
        // دستی اش پاک می شود و همان شماره به مسابقه ای می رود که واقعی شد —
        // شماره همیشه دنبال مسابقه واقعی می ماند
        const reconciled = reconcileMatchNumberOverrides(
          draw.structure,
          draw.assignments,
          nextAssignments,
          get().matchNumberOverrides[groupId] ?? {},
          fromSlotId,
          toSlotId,
        )

        set({
          ...(reconciled
            ? {
                matchNumberOverrides: {
                  ...get().matchNumberOverrides,
                  [groupId]: reconciled,
                },
              }
            : {}),
          draws: {
            ...get().draws,
            [groupId]: {
              ...draw,
              assignments: nextAssignments,
              history: [...draw.history.slice(-historyLimit + 1), draw.assignments],
            },
          },
        })
      },

      undoMove: (groupId) => {
        const draw = get().draws[groupId]
        if (!draw || draw.history.length === 0) return
        const previous = draw.history[draw.history.length - 1]
        set({
          draws: {
            ...get().draws,
            [groupId]: {
              ...draw,
              assignments: previous,
              history: draw.history.slice(0, -1),
            },
          },
        })
      },

      resetGroupLayout: (groupId) => {
        const draw = get().draws[groupId]
        if (!draw) return
        set({
          draws: {
            ...get().draws,
            [groupId]: {
              ...draw,
              assignments: { ...draw.initialAssignments },
              history: [...draw.history.slice(-historyLimit + 1), draw.assignments],
            },
          },
        })
      },

      startExportJob: (job) => set({ exportJob: job }),
      finishExportJob: () => set({ exportJob: null }),

      exportGroupPdf: (groupId) =>
        set({ selectedGroupId: groupId, exportJob: { kind: 'pdf', scope: 'single', groupId } }),

      exportGroupImage: (groupId) =>
        set({ selectedGroupId: groupId, exportJob: { kind: 'image', scope: 'single', groupId } }),

      updateMeta: (patch) =>
        set({ meta: { ...get().meta, ...patch } }),

      setMatchNumber: (groupId, matchId, value) => {
        const overrides = get().matchNumberOverrides
        const groupOverrides = { ...(overrides[groupId] ?? {}) }
        // استاندارد ذخیره سازی رقم انگلیسی است؛ نمایش همه جا با toFaDigits رقم فارسی می شود
        const text = toEnDigits((value ?? '').trim()).slice(0, 4)
        if (!text) {
          delete groupOverrides[matchId]
        } else {
          groupOverrides[matchId] = text
        }
        set({ matchNumberOverrides: { ...overrides, [groupId]: groupOverrides } })
      },

      resetMatchNumbers: (groupId) => {
        const overrides = { ...get().matchNumberOverrides }
        delete overrides[groupId]
        set({ matchNumberOverrides: overrides })
      },

      setSettingsOpen: (open) => set({ settingsOpen: open }),

      addScheduleSession: () => {
        const session: ScheduleSession = {
          id: createId('session'),
          timeFrom: '',
          timeTo: '',
          mats: [{ id: createId('mat'), label: 'زمین ۱', groupIds: [] }],
        }
        set({ scheduleSessions: [...get().scheduleSessions, session] })
      },

      removeScheduleSession: (sessionId) => {
        // کمربند بازه هم با بازه می میرد
        const sessionBelts = { ...get().sessionBeltLabels }
        delete sessionBelts[sessionId]
        set({
          scheduleSessions: get().scheduleSessions.filter((s) => s.id !== sessionId),
          sessionBeltLabels: sessionBelts,
        })
      },

      updateScheduleSession: (sessionId, patch) =>
        set({
          scheduleSessions: get().scheduleSessions.map((session) =>
            session.id === sessionId ? { ...session, ...patch } : session,
          ),
        }),

      addScheduleMat: (sessionId) =>
        set({
          scheduleSessions: get().scheduleSessions.map((session) => {
            if (session.id !== sessionId) return session
            const mat: ScheduleMat = {
              id: createId('mat'),
              label: `زمین ${toFaDigits(session.mats.length + 1)}`,
              groupIds: [],
            }
            return { ...session, mats: [...session.mats, mat] }
          }),
        }),

      removeScheduleMat: (sessionId, matId) =>
        set({
          scheduleSessions: get().scheduleSessions.map((session) =>
            session.id === sessionId
              ? { ...session, mats: session.mats.filter((mat) => mat.id !== matId) }
              : session,
          ),
        }),

      updateScheduleMat: (sessionId, matId, patch) =>
        set({
          scheduleSessions: get().scheduleSessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  mats: session.mats.map((mat) => (mat.id === matId ? { ...mat, ...patch } : mat)),
                }
              : session,
          ),
        }),

      toggleScheduleGroup: (sessionId, matId, groupId) => {
        const sessions = get().scheduleSessions
        const alreadySomewhere = sessions.some((session) =>
          session.mats.some((mat) => mat.groupIds.includes(groupId)),
        )
        set({
          scheduleSessions: sessions.map((session) => {
            if (session.id !== sessionId) {
              // moving: strip the weight from every other mat
              if (!alreadySomewhere) return session
              return {
                ...session,
                mats: session.mats.map((mat) => ({
                  ...mat,
                  groupIds: mat.groupIds.filter((id) => id !== groupId),
                })),
              }
            }
            return {
              ...session,
              mats: session.mats.map((mat) => {
                if (mat.id !== matId) {
                  return { ...mat, groupIds: mat.groupIds.filter((id) => id !== groupId) }
                }
                const without = mat.groupIds.filter((id) => id !== groupId)
                return alreadySomewhere
                  ? { ...mat, groupIds: without }
                  : { ...mat, groupIds: [...without, groupId] }
              }),
            }
          }),
        })
      },

      moveScheduleMat: (sessionId, matId, direction) =>
        set({
          scheduleSessions: get().scheduleSessions.map((session) => {
            if (session.id !== sessionId) return session
            const mats = [...session.mats]
            const index = mats.findIndex((mat) => mat.id === matId)
            const target = index + direction
            if (index < 0 || target < 0 || target >= mats.length) return session
            ;[mats[index], mats[target]] = [mats[target], mats[index]]
            return { ...session, mats }
          }),
        }),

      moveScheduleGroup: (sessionId, matId, groupId) =>
        set({
          scheduleSessions: get().scheduleSessions.map((session) => ({
            ...session,
            mats: session.mats.map((mat) => {
              const without = mat.groupIds.filter((id) => id !== groupId)
              return session.id === sessionId && mat.id === matId
                ? { ...mat, groupIds: [...without, groupId] }
                : { ...mat, groupIds: without }
            }),
          })),
        }),

      redrawGroup: (groupId) => {
        const draw = get().draws[groupId]
        if (!draw || isManualGroupId(groupId)) return
        const participantsById: Record<string, Participant> = {}
        for (const participant of get().participants) participantsById[participant.id] = participant
        const members = draw.group.participantIds
          .map((id) => participantsById[id])
          .filter((participant): participant is Participant => Boolean(participant))
        if (members.length === 0) return
        // بُر زدن فیشر-یتس — چون generateGroupDraw ورودی را بر اساس sourceRow
        // مرتب می کند، ترتیب تازه با بازشمردن sourceRow موقت تزریق می شود؛
        // قواعد جدا ماندن مربی ها و اولویت استراحت سر جایشان می مانند
        const shuffled = [...members]
        for (let index = shuffled.length - 1; index > 0; index -= 1) {
          const swap = Math.floor(Math.random() * (index + 1))
          ;[shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]]
        }
        const renumbered = shuffled.map((participant, index) => ({
          ...participant,
          sourceRow: index,
        }))
        const pool = { ...participantsById }
        for (const participant of renumbered) pool[participant.id] = participant
        const bronze = Boolean(get().medalRainTables[groupId]?.bronze)
        const next = generateGroupDraw(
          { ...draw.group, participantIds: renumbered.map((participant) => participant.id) },
          pool,
          tournamentRules,
          drawOptions(get(), bronze),
        )
        set({ draws: { ...get().draws, [groupId]: next } })
      },

      redrawAllRealGroups: () => {
        const participantsById: Record<string, Participant> = {}
        for (const participant of get().participants) participantsById[participant.id] = participant
        const current = get().draws
        const next: Record<string, GroupDraw> = {}
        let touched = false
        for (const [groupId, draw] of Object.entries(current)) {
          // جدول های دستی اسامی تایپی دارند — ساختار و نام ها دست نمی خورد
          if (isManualGroupId(groupId)) {
            next[groupId] = draw
            continue
          }
          const members = draw.group.participantIds
            .map((id) => participantsById[id])
            .filter((participant): participant is Participant => Boolean(participant))
          if (members.length === 0) {
            next[groupId] = draw
            continue
          }
          touched = true
          next[groupId] = generateGroupDraw(
            draw.group,
            participantsById,
            tournamentRules,
            drawOptions(get(), Boolean(get().medalRainTables[groupId]?.bronze)),
          )
        }
        if (touched) set({ draws: next })
      },

      createManualTable: ({ size, title, matLabel, attendTime }) => {
        const baseTitle = title.trim() || 'بدون عنوان'
        // عنوان تکراری جدول جدید نمی سازد — پسوند شماره دار می گیرد
        let weightLabel = baseTitle
        let copy = 2
        while (get().draws[`${MANUAL_TABLE_AGE}__${weightLabel}`]) {
          weightLabel = `${baseTitle} ${toFaDigits(copy)}`
          copy += 1
        }
        const groupId = `${MANUAL_TABLE_AGE}__${weightLabel}`
        const participantIds = Array.from({ length: size }, () => createId('participant'))
        const baseRow =
          get().participants.reduce((max, participant) => Math.max(max, participant.sourceRow), 0) + 1
        const created: Participant[] = participantIds.map((id, index) => ({
          id,
          fullName: '',
          coachName: '',
          ageCategory: MANUAL_TABLE_AGE,
          weightCategory: weightLabel,
          weightKg: '',
          sourceRow: baseRow + index,
        }))
        const participantsById: Record<string, Participant> = {}
        for (const participant of [...get().participants, ...created]) {
          participantsById[participant.id] = participant
        }
        const group: CategoryGroup = {
          id: groupId,
          ageCategory: MANUAL_TABLE_AGE,
          weightCategory: weightLabel,
          participantIds,
        }
        const draw = generateGroupDraw(group, participantsById, tournamentRules, drawOptions(get()))
        set({
          participants: [...get().participants, ...created],
          draws: { ...get().draws, [groupId]: draw },
          manualTables: {
            ...get().manualTables,
            [groupId]: {
              size,
              matLabel: matLabel.trim(),
              attendTime: attendTime.trim(),
              participantIds,
            },
          },
          page: 'bracket',
          selectedGroupId: groupId,
        })
      },

      updateManualTableInfo: (groupId, patch) => {
        const info = get().manualTables[groupId]
        if (!info) return
        set({
          manualTables: { ...get().manualTables, [groupId]: { ...info, ...patch } },
        })
      },

      removeManualTable: (groupId) => {
        const info = get().manualTables[groupId]
        if (!info) return
        const removedIds = new Set(info.participantIds)
        const overrides = { ...get().matchNumberOverrides }
        delete overrides[groupId]
        const wasSelected = get().selectedGroupId === groupId
        set({
          participants: get().participants.filter((participant) => !removedIds.has(participant.id)),
          draws: Object.fromEntries(
            Object.entries(get().draws).filter(([id]) => id !== groupId),
          ),
          manualTables: Object.fromEntries(
            Object.entries(get().manualTables).filter(([id]) => id !== groupId),
          ),
          matchNumberOverrides: overrides,
          selectedGroupId: wasSelected ? null : get().selectedGroupId,
          page: wasSelected ? 'groups' : get().page,
        })
      },

      updateParticipant: (participantId, patch) =>
        set({
          participants: get().participants.map((participant) =>
            participant.id === participantId ? { ...participant, ...patch } : participant,
          ),
        }),

      addParticipantToGroup: (groupId, input, targetSlotId) => {
        const draw = get().draws[groupId]
        const fullName = input.fullName.trim()
        if (!draw || !fullName) return 'unknown'

        // ————— جدول دستی: اولین خانه بی نام پر می شود، ساختار ثابت می ماند
        const manualInfo = get().manualTables[groupId]
        if (manualInfo) {
          const participantsById = new Map(get().participants.map((p) => [p.id, p]))
          const empty = manualInfo.participantIds
            .map((id) => participantsById.get(id))
            .find((participant) => participant && participant.fullName.trim() === '')
          if (!empty) return 'full'
          get().updateParticipant(empty.id, {
            fullName,
            coachName: input.coachName.trim(),
          })
          return 'placed'
        }

        const sourceRow =
          get().participants.reduce((max, participant) => Math.max(max, participant.sourceRow), 0) + 1
        const created: Participant = {
          id: createId('participant'),
          fullName,
          coachName: input.coachName.trim(),
          ageCategory: draw.group.ageCategory,
          weightCategory: draw.group.weightCategory,
          weightKg: '',
          sourceRow,
        }
        const participants = [...get().participants, created]
        const group: CategoryGroup = {
          ...draw.group,
          participantIds: [...draw.group.participantIds, created.id],
        }

        // ————— نشستن روی خانه استراحت: نه ساختار عوض می شود نه بقیه چیدمان
        const isFreeRest = (slotId: string) => draw.assignments[slotId]?.kind === 'bye'
        const targetRest =
          targetSlotId && isFreeRest(targetSlotId)
            ? targetSlotId
            : Object.keys(draw.assignments).find((slotId) => isFreeRest(slotId))
        if (targetRest) {
          const occupant: SlotOccupant = { kind: 'participant', participantId: created.id }
          const assignments: SlotAssignments = { ...draw.assignments, [targetRest]: occupant }
          // «چیدمان اولیه» هم به روز می شود تا بازنشانی، هنرجوی تازه را نیاورد
          const initialAssignments: SlotAssignments = {
            ...draw.initialAssignments,
            [targetRest]: occupant,
          }
          // اگر استراحت ساختاری پر شد، شمارنده استراحت سربرگ هم باید کم شود
          const structure = draw.structure.restSlotIds.includes(targetRest)
            ? {
                ...draw.structure,
                restSlotIds: draw.structure.restSlotIds.filter((id) => id !== targetRest),
              }
            : draw.structure
          set({
            participants,
            draws: {
              ...get().draws,
              [groupId]: {
                ...draw,
                group,
                structure,
                assignments,
                initialAssignments,
                history: [
                  ...draw.history.slice(-historyLimit + 1),
                  draw.assignments,
                ],
              },
            },
          })
          return 'placed'
        }

        // ————— جدول باران مدال: ظرفیت ۴ نفره ثابت است — رشد ندارد
        const medalInfo = get().medalRainTables[groupId]
        if (medalInfo) {
          if (group.participantIds.length >= 4) return 'full'
          // جدول های ۲/۳ نفره باران مدال تا ۴ نفر رشد می کنند — قرعه از نو
          const participantsById: Record<string, Participant> = {}
          for (const participant of participants) participantsById[participant.id] = participant
          const bronze = medalInfo.bronze && group.participantIds.length === 4
          const next = generateGroupDraw(group, participantsById, tournamentRules, drawOptions(get(), bronze))
          set({
            participants,
            draws: { ...get().draws, [groupId]: next },
          })
          return 'grown'
        }

        // ————— جدول واقعی پر است: برگه به اندازه بعدی بزرگ می شود — قرعه از نو
        const participantsById: Record<string, Participant> = {}
        for (const participant of participants) participantsById[participant.id] = participant
        const next = generateGroupDraw(group, participantsById, tournamentRules, drawOptions(get()))
        // ساختار عوض شده — شماره های دستی این جدول دیگر معنا ندارند
        const overrides = { ...get().matchNumberOverrides }
        delete overrides[groupId]
        set({
          participants,
          draws: { ...get().draws, [groupId]: next },
          matchNumberOverrides: overrides,
        })
        return 'grown'
      },

      removeParticipant: (groupId, participantId) => {
        const draw = get().draws[groupId]
        if (!draw || !draw.group.participantIds.includes(participantId)) return

        // ————— جدول دستی: خانه ها ثابت اند — فقط نام و مربی پاک می شود
        if (get().manualTables[groupId]) {
          get().updateParticipant(participantId, { fullName: '', coachName: '' })
          return
        }

        // هر خانه ای که این هنرجو در آن نشسته — در چیدمان فعلی، چیدمان اولیه
        // و همه لحظه های تاریخچه واگرد — بی نام و به خانه استراحت بدل می شود
        const neutralize = (assignments: SlotAssignments): SlotAssignments => {
          let changed = false
          const next: SlotAssignments = {}
          for (const [slotId, occupant] of Object.entries(assignments)) {
            if (occupant.kind === 'participant' && occupant.participantId === participantId) {
              next[slotId] = { kind: 'bye' }
              changed = true
            } else {
              next[slotId] = occupant
            }
          }
          return changed ? next : assignments
        }

        const assignments = neutralize(draw.assignments)
        const initialAssignments = neutralize(draw.initialAssignments)
        const history = draw.history.map(neutralize)
        const group = {
          ...draw.group,
          participantIds: draw.group.participantIds.filter((id) => id !== participantId),
        }
        // خانه هایی که با این حذف استراحت شدند و ساختاری نبودند — به شمارنده
        // استراحت سربرگ اضافه می شوند تا آمار برگه راست بگوید
        const grownRestSlots = Object.entries(assignments)
          .filter(
            ([slotId, occupant]) =>
              occupant.kind === 'bye' && !draw.structure.restSlotIds.includes(slotId),
          )
          .map(([slotId]) => slotId)
        const structure = grownRestSlots.length
          ? { ...draw.structure, restSlotIds: [...draw.structure.restSlotIds, ...grownRestSlots] }
          : draw.structure

        const participants = get().participants.filter(
          (participant) => participant.id !== participantId,
        )

        // ————— جدول بی هنرجو شد: کل جدول جمع می شود
        if (group.participantIds.length === 0) {
          const overrides = { ...get().matchNumberOverrides }
          delete overrides[groupId]
          const wasSelected = get().selectedGroupId === groupId
          set({
            participants,
            draws: Object.fromEntries(
              Object.entries(get().draws).filter(([id]) => id !== groupId),
            ),
            medalRainTables: Object.fromEntries(
              Object.entries(get().medalRainTables).filter(([id]) => id !== groupId),
            ),
            matchNumberOverrides: overrides,
            // رد وزن مرده از برنامه زمین ها هم برداشته می شود
            scheduleSessions: get().scheduleSessions.map((session) => ({
              ...session,
              mats: session.mats.map((mat) => ({
                ...mat,
                groupIds: mat.groupIds.filter((id) => id !== groupId),
              })),
            })),
            ...(wasSelected ? { selectedGroupId: null, page: 'groups' as const } : {}),
          })
          return
        }

        const medalInfo = get().medalRainTables[groupId]
        set({
          participants,
          draws: {
            ...get().draws,
            [groupId]: { ...draw, group, structure, assignments, initialAssignments, history },
          },
          medalRainTables: medalInfo
            ? {
                ...get().medalRainTables,
                [groupId]: {
                  ...medalInfo,
                  participantIds: medalInfo.participantIds.filter(
                    (id) => id !== participantId,
                  ),
                },
              }
            : get().medalRainTables,
        })
      },

      createMedalRainTables: ({ title, matLabel, attendTime, bronze, pools, replace, fileName }) => {
        const validPools = pools
          .map((pool) =>
            pool
              .filter((row) => row.fullName.trim().length > 0)
              .map((row) => ({ fullName: row.fullName.trim(), coachName: row.coachName.trim() })),
          )
          .filter((pool) => pool.length > 0)
        if (validPools.length === 0) return

        const baseTitle = title.trim() || 'بدون عنوان'
        // عنوان تکراری وزن باران مدال پسوند شماره دار می گیرد
        const takenTitles = new Set(
          replace ? [] : Object.values(get().medalRainTables).map((info) => info.weightTitle),
        )
        let weightLabel = baseTitle
        let copy = 2
        while (takenTitles.has(weightLabel)) {
          weightLabel = `${baseTitle} ${toFaDigits(copy)}`
          copy += 1
        }

        const baseParticipants = replace ? [] : get().participants
        const baseRow =
          baseParticipants.reduce((max, participant) => Math.max(max, participant.sourceRow), 0) + 1

        let rowCursor = baseRow
        const createdParticipants: Participant[] = []
        const poolSpecs = validPools.map((pool, poolIndex) => {
          const weightCategory = `${weightLabel} · جدول ${toFaDigits(poolIndex + 1)}`
          const groupId = `${MEDAL_RAIN_AGE}__${weightCategory}`
          const participantIds = pool.map(() => createId('participant'))
          const poolParticipants: Participant[] = pool.map((row, index) => ({
            id: participantIds[index],
            fullName: row.fullName,
            coachName: row.coachName,
            ageCategory: MEDAL_RAIN_AGE,
            weightCategory,
            weightKg: '',
            sourceRow: rowCursor++,
          }))
          createdParticipants.push(...poolParticipants)
          return { groupId, weightCategory, participantIds, poolParticipants }
        })

        const participantsById: Record<string, Participant> = {}
        for (const participant of [...baseParticipants, ...createdParticipants]) {
          participantsById[participant.id] = participant
        }

        const newDraws: Record<string, GroupDraw> = {}
        const newInfos: Record<string, MedalRainPoolInfo> = {}
        for (const spec of poolSpecs) {
          const group: CategoryGroup = {
            id: spec.groupId,
            ageCategory: MEDAL_RAIN_AGE,
            weightCategory: spec.weightCategory,
            participantIds: spec.participantIds,
          }
          // چیدمان پیش نمایش باران مدال با sourceRow تزریق شده است — نوع قرعه
          // باید همان جداسازی بماند تا سواپ های پیش نمایش به هم نریزد
          newDraws[spec.groupId] = generateGroupDraw(group, participantsById, tournamentRules, {
            ...drawOptions(get(), bronze),
            drawType: 'coachSeeded',
          })
          newInfos[spec.groupId] = {
            weightTitle: weightLabel,
            poolIndex: poolSpecs.indexOf(spec) + 1,
            bronze,
            matLabel: matLabel.trim(),
            attendTime: attendTime.trim(),
            participantIds: spec.participantIds,
          }
        }

        set({
          participants: [...baseParticipants, ...createdParticipants],
          draws: replace ? newDraws : { ...get().draws, ...newDraws },
          medalRainTables: replace ? newInfos : { ...get().medalRainTables, ...newInfos },
          ...(replace
            ? {
                fileName: fileName ?? null,
                importedAt: new Date().toISOString(),
                issues: [],
                matchNumberOverrides: {},
                scheduleSessions: [],
                manualTables: {},
              }
            : {}),
          page: 'bracket',
          selectedGroupId: poolSpecs[0]?.groupId ?? null,
        })
      },

      updateMedalRainInfo: (groupId, patch) => {
        const info = get().medalRainTables[groupId]
        if (!info) return
        set({
          medalRainTables: { ...get().medalRainTables, [groupId]: { ...info, ...patch } },
        })
      },

      // مقدار خام ذخیره می شود — trim فقط هنگام نمایش (belts.ts). اگر این جا
      // trim می شد، تایپ فاصله آخر عبارت مثل «سبز و آبی » هر لحظه پاک می شد
      // و کاربر هرگز نمی توانست فاصله بدهد.
      setTableBeltLabel: (groupId, value) => {
        const next = { ...get().tableBeltLabels }
        if (value.trim()) next[groupId] = value
        else delete next[groupId]
        set({ tableBeltLabels: next })
      },

      setSessionBeltLabel: (sessionId, value) => {
        const next = { ...get().sessionBeltLabels }
        if (value.trim()) next[sessionId] = value
        else delete next[sessionId]
        set({ sessionBeltLabels: next })
      },

      removeMedalRainTable: (groupId) => {
        const info = get().medalRainTables[groupId]
        if (!info) return
        const removedIds = new Set(info.participantIds)
        const overrides = { ...get().matchNumberOverrides }
        delete overrides[groupId]
        const wasSelected = get().selectedGroupId === groupId
        set({
          participants: get().participants.filter((participant) => !removedIds.has(participant.id)),
          draws: Object.fromEntries(
            Object.entries(get().draws).filter(([id]) => id !== groupId),
          ),
          medalRainTables: Object.fromEntries(
            Object.entries(get().medalRainTables).filter(([id]) => id !== groupId),
          ),
          matchNumberOverrides: overrides,
          selectedGroupId: wasSelected ? null : get().selectedGroupId,
          page: wasSelected ? 'groups' : get().page,
        })
      },
    }),
    {
      name: 'kyorugi-draw-board-v1',
      version: 19,
      migrate: (persisted) => {
        // pdfJob/imageJob of older versions collapse into the single exportJob
        const legacy = { ...(persisted ?? {}) } as Record<string, unknown>
        delete legacy.pdfJob
        delete legacy.imageJob
        const state = legacy as Partial<TournamentState>
        // v7: weightKg joins the participant record — old rosters get an empty
        // value; the per-session restart switch dies because numbering now
        // ALWAYS restarts per mat (هر زمین از ۱)
        // v9: باران مدال — جدول ها و مسابقه رده بندی شان بعد از بازسازی قرعه برمی گردند
        // v10: قالب عنوان وزن ها — ذخیره های قدیمی پیش فرض را می گیرند
        //      (meta در پایین با defaultMeta ادغام می شود)
        // v11: کمربند دستی هر جدول — ذخیره های قدیمی خالی شروع می کنند
        //      v12: تم جدول ها — ذخیره های قدیمی کلاسیک شروع می کنند
        //      v13: ظاهر شماره مسابقه — ذخیره های قدیمی دایره پر همراه تم
        //      v14: اندازه بج شماره — ذخیره های قدیمی معمولی
        //      v15: کمربند بازه زمانی + کمربند جدول دیگر trim نمی شود
        //           (باگ «نمی گذارد فاصله بدهم»)
        //      v16: کلید نمایش پلاک قهرمان — ذخیره های قدیمی روشن شروع می کنند
        //      v17: طرح برگه (کلاسیک/مدرن) — ذخیره های قدیمی کلاسیک شروع می کنند
        //      v18: نوع قرعه کشی و چیدمان استراحت — ذخیره های قدیمی با همان
        //           رفتار همیشگی شروع می کنند (جداسازی هم تیمی ها + آینه ای)
        //      v19: اکثریت استراحت ها (راست/چپ در چیدمان «همیشه زیر اسم») —
        //           ذخیره های قدیمی سمت راست شروع می کنند
        const participants: Participant[] = (state.participants ?? []).map((participant) => ({
          ...participant,
          weightKg: participant.weightKg ?? '',
        }))
        const medalRainTables: Record<string, MedalRainPoolInfo> =
          state.medalRainTables && typeof state.medalRainTables === 'object'
            ? state.medalRainTables
            : {}
        const drawTypeId = normalizeDrawTypeId(state.drawTypeId)
        const byePlacementId = normalizeByePlacementId(state.byePlacementId)
        const byeMajorityId = normalizeByeMajorityId(state.byeMajorityId)
        const draws = buildDraws(participants, {
          drawType: drawTypeId,
          byePlacement: byePlacementId,
          byeMajority: byeMajorityId,
        })
        for (const [groupId, info] of Object.entries(medalRainTables)) {
          const draw = draws[groupId]
          if (draw && info.bronze) {
            draws[groupId] = { ...draw, structure: attachBronzeMatch(draw.structure) }
          }
        }
        return {
          ...({
            page: 'import',
            fileName: null,
            importedAt: null,
            participants: [],
            issues: [],
            draws: {},
            selectedGroupId: null,
            exportJob: null,
            ...state,
            meta: { ...defaultMeta, ...(state.meta ?? {}) },
          } as TournamentState),
          draws,
          matchNumberOverrides: {},
          scheduleSessions: Array.isArray(state.scheduleSessions) ? state.scheduleSessions : [],
          manualTables:
            state.manualTables && typeof state.manualTables === 'object'
              ? state.manualTables
              : {},
          medalRainTables,
          tableBeltLabels:
            state.tableBeltLabels && typeof state.tableBeltLabels === 'object'
              ? state.tableBeltLabels
              : {},
          sessionBeltLabels:
            state.sessionBeltLabels && typeof state.sessionBeltLabels === 'object'
              ? state.sessionBeltLabels
              : {},
          tableThemeId: isTableThemeId(state.tableThemeId) ? state.tableThemeId : 'classic',
          matchChipStyle: normalizeMatchChipStyle(state.matchChipStyle),
          matchChipSize: normalizeMatchChipSize(state.matchChipSize),
          showChampion: state.showChampion !== false,
          sheetLayout: normalizeSheetLayoutId(state.sheetLayout),
          drawTypeId,
          byePlacementId,
          byeMajorityId,
        }
      },
      partialize: (state) => ({
        page: state.page,
        fileName: state.fileName,
        importedAt: state.importedAt,
        participants: state.participants,
        issues: state.issues,
        draws: state.draws,
        selectedGroupId: state.selectedGroupId,
        meta: state.meta,
        matchNumberOverrides: state.matchNumberOverrides,
        scheduleSessions: state.scheduleSessions,
        manualTables: state.manualTables,
        medalRainTables: state.medalRainTables,
        tableBeltLabels: state.tableBeltLabels,
        sessionBeltLabels: state.sessionBeltLabels,
        tableThemeId: state.tableThemeId,
        matchChipStyle: state.matchChipStyle,
        matchChipSize: state.matchChipSize,
        showChampion: state.showChampion,
        sheetLayout: state.sheetLayout,
        drawTypeId: state.drawTypeId,
        byePlacementId: state.byePlacementId,
        byeMajorityId: state.byeMajorityId,
      }),
    },
  ),
)
