import { useEffect } from 'react'
import { ChevronRight, Info, Printer, RotateCcw, Trophy, Undo2 } from 'lucide-react'
import { useTournament } from '../../store/tournamentStore.ts'
import { Button } from '../../components/Button.tsx'
import { beltColorFor } from '../../lib/beltColor.ts'
import { groupTitle } from '../../lib/formatFa.ts'
import { findSoloParticipant } from '../../lib/soloDraw.ts'
import { BracketCanvas } from './BracketCanvas.tsx'

export function BracketPage() {
  const draw = useTournament((state) =>
    state.selectedGroupId ? state.draws[state.selectedGroupId] : undefined,
  )
  const participants = useTournament((state) => state.participants)
  const openGroups = useTournament((state) => state.openGroups)
  const undoMove = useTournament((state) => state.undoMove)
  const resetGroupLayout = useTournament((state) => state.resetGroupLayout)
  const startPdfJob = useTournament((state) => state.startPdfJob)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (draw) undoMove(draw.groupId)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [draw, undoMove])

  useEffect(() => {
    if (!draw) openGroups()
  }, [draw, openGroups])

  if (!draw) return null

  const belt = beltColorFor(draw.groupId)
  const canUndo = draw.history.length > 0
  const solo =
    draw.structure.roundCount === 0
      ? findSoloParticipant(
          draw,
          new Map(participants.map((participant) => [participant.id, participant])),
        )
      : null

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="subtle" onClick={openGroups} aria-label="بازگشت به گروه‌ها">
            <ChevronRight size={16} />
            گروه‌ها
          </Button>
          <span
            aria-hidden
            className="h-9 w-1.5 rounded-full"
            style={{ backgroundColor: belt.hex }}
          />
          <div>
            <h1 className="font-display text-2xl leading-7 text-ink-900">
              {groupTitle(draw.group.ageCategory, draw.group.weightCategory)}
            </h1>
            <p className="text-xs text-muted">قرعه حذفی تک‌حذفی — قابل ویرایش دستی</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="subtle" onClick={() => undoMove(draw.groupId)} disabled={!canUndo}>
            <Undo2 size={16} />
            واگرد
          </Button>
          <Button variant="subtle" onClick={() => resetGroupLayout(draw.groupId)}>
            <RotateCcw size={16} />
            چیدمان اولیه
          </Button>
          <Button onClick={() => startPdfJob('single')}>
            <Printer size={16} />
            خروجی PDF
          </Button>
        </div>
      </header>

      {draw.structure.roundCount === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-line bg-surface px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-turf">
            <Trophy size={24} className="text-mat-600" />
          </span>
          {solo ? (
            <>
              <p className="font-display text-3xl text-ink-900">{solo.fullName}</p>
              <p className="text-sm text-muted">مربی: {solo.coachName}</p>
            </>
          ) : (
            <p className="text-sm font-bold text-ink-900">این گروه بدون شرکت‌کننده است.</p>
          )}
          <p className="max-w-md text-sm leading-7 text-ink-800">
            تنها شرکت‌کنندهٔ این دستهٔ وزنی همین یک نفر است؛ بدون برگزاری مسابقه، به‌طور خودکار در
            رتبهٔ نخست این وزن قرار می‌گیرد.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-4 flex items-center gap-2 text-xs leading-5 text-muted">
            <Info size={14} className="shrink-0" />
            کارت هر شرکت‌کننده را بکشید و روی خانهٔ دیگری رها کنید تا جای دو نفر عوض شود. خانهٔ
            «استراحت» یعنی آن شرکت‌کننده در دور اول بازی ندارد.
          </p>
          <BracketCanvas draw={draw} />
        </>
      )}
    </div>
  )
}
