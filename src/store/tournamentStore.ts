import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { tournamentRules } from '../config/tournamentRules.ts'
import { applySlotSwap } from '../core/bracket/applySlotSwap.ts'
import { generateGroupDraw } from '../core/bracket/generateGroupDraw.ts'
import { attachBronzeMatch } from '../core/bracket/medalRain.ts'
import { groupByCategory } from '../core/grouping/groupByCategory.ts'
import { type ScheduleMat, type ScheduleSession } from '../core/schedule/schedule.ts'
import { createId } from '../core/id.ts'
import { toEnDigits, toFaDigits } from '../lib/formatFa.ts'
import type {
  CategoryGroup,
  GroupDraw,
  ImportIssue,
  Participant,
  ParsedRoster,
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
}

export const defaultMeta: TournamentMeta = {
  title: '',
  subtitle: '',
  logoDataUrl: null,
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

  /** ساخت جدول دستی خالی — همان مسیر قرعه کشی داده واقعی */
  createManualTable: (input: { size: number; title: string; matLabel: string; attendTime: string }) => void
  /** زمین و ساعت یک جدول دستی */
  updateManualTableInfo: (groupId: string, patch: Partial<Pick<ManualTableInfo, 'matLabel' | 'attendTime'>>) => void
  /** حذف کامل جدول دستی با شرکت کننده هایش */
  removeManualTable: (groupId: string) => void
  /** نوشتن نام/مربی روی یک شرکت کننده — جدول های دستی */
  updateParticipant: (participantId: string, patch: Partial<Pick<Participant, 'fullName' | 'coachName'>>) => void

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
}

const historyLimit = 40

function buildDraws(participants: Participant[]): Record<string, GroupDraw> {
  const participantsById = Object.fromEntries(participants.map((p) => [p.id, p]))
  return Object.fromEntries(
    groupByCategory(participants).map((group) => [
      group.id,
      generateGroupDraw(group, participantsById, tournamentRules),
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

      importRoster: (fileName, roster) =>
        set({
          fileName,
          participants: roster.participants,
          issues: roster.issues,
          draws: buildDraws(roster.participants),
          importedAt: new Date().toISOString(),
          page: 'groups',
          selectedGroupId: null,
          // a fresh roster is a fresh start: previous hand-written numbers,
          // the previous mat plan and the old manual tables all die
          matchNumberOverrides: {},
          scheduleSessions: [],
          manualTables: {},
          medalRainTables: {},
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

        set({
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

      removeScheduleSession: (sessionId) =>
        set({ scheduleSessions: get().scheduleSessions.filter((s) => s.id !== sessionId) }),

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
        const draw = generateGroupDraw(group, participantsById, tournamentRules)
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
          newDraws[spec.groupId] = generateGroupDraw(group, participantsById, tournamentRules, {
            bronze,
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
      version: 9,
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
        const participants: Participant[] = (state.participants ?? []).map((participant) => ({
          ...participant,
          weightKg: participant.weightKg ?? '',
        }))
        const medalRainTables: Record<string, MedalRainPoolInfo> =
          state.medalRainTables && typeof state.medalRainTables === 'object'
            ? state.medalRainTables
            : {}
        const draws = buildDraws(participants)
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
      }),
    },
  ),
)
