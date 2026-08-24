import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { tournamentRules } from '../config/tournamentRules.ts'
import { applySlotSwap } from '../core/bracket/applySlotSwap.ts'
import { generateGroupDraw } from '../core/bracket/generateGroupDraw.ts'
import { groupByCategory } from '../core/grouping/groupByCategory.ts'
import type { GroupDraw, ImportIssue, Participant, ParsedRoster } from '../core/types.ts'

export type PageName = 'import' | 'groups' | 'bracket'

export type PdfJobScope = 'single' | 'all'

interface TournamentState {
  page: PageName
  fileName: string | null
  importedAt: string | null
  participants: Participant[]
  issues: ImportIssue[]
  draws: Record<string, GroupDraw>
  selectedGroupId: string | null
  pdfJob: PdfJobScope | null

  importRoster: (fileName: string, roster: ParsedRoster) => void
  clearAll: () => void
  openGroups: () => void
  openImport: () => void
  openBracket: (groupId: string) => void
  moveParticipant: (groupId: string, fromSlotId: string, toSlotId: string) => void
  undoMove: (groupId: string) => void
  resetGroupLayout: (groupId: string) => void
  startPdfJob: (scope: PdfJobScope) => void
  finishPdfJob: () => void
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
      pdfJob: null,

      importRoster: (fileName, roster) =>
        set({
          fileName,
          participants: roster.participants,
          issues: roster.issues,
          draws: buildDraws(roster.participants),
          importedAt: new Date().toISOString(),
          page: 'groups',
          selectedGroupId: null,
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
          pdfJob: null,
        }),

      openGroups: () => set({ page: 'groups' }),
      openImport: () => set({ page: 'import' }),

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

      startPdfJob: (scope) => set({ pdfJob: scope }),
      finishPdfJob: () => set({ pdfJob: null }),
    }),
    {
      name: 'kyorugi-draw-board-v1',
      version: 1,
      partialize: (state) => ({
        page: state.page,
        fileName: state.fileName,
        importedAt: state.importedAt,
        participants: state.participants,
        issues: state.issues,
        draws: state.draws,
        selectedGroupId: state.selectedGroupId,
      }),
    },
  ),
)
