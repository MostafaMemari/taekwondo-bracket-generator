import { useTournament } from '../../store/tournamentStore.ts'
import { BracketSheet } from './BracketSheet.tsx'
import { faDate } from '../../lib/formatFa.ts'

export function PrintPreviewPage() {
  const draws = useTournament((state) => state.draws)
  const participants = useTournament((state) => state.participants)
  const fileName = useTournament((state) => state.fileName)

  const participantsById = new Map(participants.map((participant) => [participant.id, participant]))
  const drawList = Object.values(draws)
  const dateText = faDate(new Date())

  return (
    <div className="flex flex-col items-center gap-8 bg-ink-800 px-6 py-8">
      <p className="rounded-lg bg-surface px-4 py-2 text-sm text-muted">
        پیش‌نمایش برگه‌های چاپ — {drawList.length} برگه
      </p>
      {drawList.map((draw, index) => (
        <div key={draw.groupId} className="shadow-2xl">
          <BracketSheet
            draw={draw}
            participantsById={participantsById}
            index={index}
            total={drawList.length}
            dateText={dateText}
            sourceName={fileName ?? '—'}
          />
        </div>
      ))}
    </div>
  )
}
