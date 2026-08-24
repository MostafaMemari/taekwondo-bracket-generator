import { FileDown, Upload } from 'lucide-react'
import { useTournament } from '../../store/tournamentStore.ts'
import { Button } from '../../components/Button.tsx'
import { toFaDigits } from '../../lib/formatFa.ts'
import { GroupCard } from './GroupCard.tsx'

export function GroupsPage() {
  const draws = useTournament((state) => state.draws)
  const participantCount = useTournament((state) => state.participants.length)
  const openBracket = useTournament((state) => state.openBracket)
  const openImport = useTournament((state) => state.openImport)
  const startPdfJob = useTournament((state) => state.startPdfJob)

  const drawList = Object.values(draws)

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink-900">گروه‌های مسابقات</h1>
          <p className="mt-2 text-sm text-muted">
            {toFaDigits(drawList.length)} گروه • {toFaDigits(participantCount)} شرکت‌کننده
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="subtle" onClick={openImport}>
            <Upload size={16} />
            بارگذاری فایل جدید
          </Button>
          <Button onClick={() => startPdfJob('all')} disabled={drawList.length === 0}>
            <FileDown size={16} />
            خروجی PDF همه گروه‌ها
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {drawList.map((draw) => (
          <GroupCard key={draw.groupId} draw={draw} onOpen={() => openBracket(draw.groupId)} />
        ))}
      </div>
    </div>
  )
}
