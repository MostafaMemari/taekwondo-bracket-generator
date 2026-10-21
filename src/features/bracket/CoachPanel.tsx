import { useMemo } from 'react'
import { Users, X } from 'lucide-react'
import type { GroupDraw, Participant } from '../../core/types.ts'
import { toFaDigits } from '../../lib/formatFa.ts'
import { coachRowsOf, slotIdOfParticipant } from '../../lib/coachRows.ts'
import { useTournament } from '../../store/tournamentStore.ts'
import { CoachRoster } from './CoachRoster.tsx'

interface CoachPanelProps {
  draw: GroupDraw
  participantsById: Map<string, Participant>
  onClose: () => void
}

/**
 * Floating drawer over the bracket (screen only — never printed): every coach
 * of this group with their athletes, sorted by the number of athletes. The
 * byes are tagged per athlete, so the organizer can check the draw rule at a
 * glance: the coach with the most athletes gets the rest priority first.
 *
 * It deliberately renders as an overlay — NOT beside the bracket — so the
 * canvas keeps the full page width even for 16/32 sheets; the user opens it
 * when needed and closes it with the ✕ button. فهرست مربی ها خودش «CoachRoster»
 * مشترک است — همان منبعی که نوار مربی های حالت جدولی هم استفاده می کند.
 */
export function CoachPanel({ draw, participantsById, onClose }: CoachPanelProps) {
  const rows = useMemo(
    () => coachRowsOf(draw, participantsById),
    [draw, participantsById],
  )
  const moveParticipant = useTournament((state) => state.moveParticipant)
  const restCount = draw.structure.restSlotIds.length

  /** تعویض جایگاه دو هنرجو — راه انتقال استراحت از یکی به دیگری */
  function handleSwap(participantAId: string, participantBId: string) {
    const slotA = slotIdOfParticipant(draw, participantAId)
    const slotB = slotIdOfParticipant(draw, participantBId)
    if (slotA && slotB && slotA !== slotB) moveParticipant(draw.groupId, slotA, slotB)
  }

  return (
    <aside className="animate-drawer-in absolute left-3 top-3 z-30 flex max-h-[calc(100%-1.5rem)] w-[320px] max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
      <header className="shrink-0 border-b border-line bg-turf px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-ink-900 text-white">
              <Users size={15} />
            </span>
            مربی ها و هنرجوها
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن پنل مربی ها"
            title="بستن"
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ink-900/5 hover:text-ink-900"
          >
            <X size={16} />
          </button>
        </div>
        <p className="mt-1.5 text-[11px] leading-5 text-muted">
          به ترتیب تعداد هنرجو — اولویت استراحت با مربیِ هنرجوهای بیشتر؛ با دکمه تعویض کنار هر
          هنرجو می توانی استراحت را دستی به هنرجوی دیگری بدهی
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <CoachRoster
          rows={rows}
          layout="drawer"
          emptyText="هنرجویی برای این وزن ثبت نشده است."
          onSwap={handleSwap}
        />
      </div>

      <footer className="flex shrink-0 items-center justify-between border-t border-line bg-turf px-4 py-2.5 text-[11px] text-muted">
        <span>استراحت های این جدول</span>
        <span className="rounded-full bg-white px-2 py-0.5 font-bold text-ink-900 shadow-sm">
          {toFaDigits(restCount)} نفر
        </span>
      </footer>
    </aside>
  )
}
