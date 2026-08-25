import { useMemo } from 'react'
import { FileDown, Upload } from 'lucide-react'
import type { GroupDraw } from '../../core/types.ts'
import { useTournament } from '../../store/tournamentStore.ts'
import { Button } from '../../components/Button.tsx'
import { toFaDigits } from '../../lib/formatFa.ts'
import { compareByWeightLabel } from '../../lib/weightSorting.ts'
import { findSoloParticipant } from '../../lib/soloDraw.ts'
import { GroupCard } from './GroupCard.tsx'

interface AgeSection {
  ageCategory: string
  draws: GroupDraw[]
  participantCount: number
}

function buildAgeSections(draws: GroupDraw[]): AgeSection[] {
  const grouped = new Map<string, GroupDraw[]>()
  for (const draw of draws) {
    const list = grouped.get(draw.group.ageCategory) ?? []
    list.push(draw)
    grouped.set(draw.group.ageCategory, list)
  }
  return Array.from(grouped, ([ageCategory, sectionDraws]) => ({
    ageCategory,
    participantCount: sectionDraws.reduce((sum, draw) => sum + draw.group.participantIds.length, 0),
    draws: [...sectionDraws].sort((a, b) =>
      compareByWeightLabel(a.group.weightCategory, b.group.weightCategory),
    ),
  }))
}

export function GroupsPage() {
  const draws = useTournament((state) => state.draws)
  const participants = useTournament((state) => state.participants)
  const openBracket = useTournament((state) => state.openBracket)
  const openImport = useTournament((state) => state.openImport)
  const startPdfJob = useTournament((state) => state.startPdfJob)

  const sections = useMemo(() => buildAgeSections(Object.values(draws)), [draws])
  const participantsById = useMemo(
    () => new Map(participants.map((participant) => [participant.id, participant])),
    [participants],
  )

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink-900">گروه‌های مسابقات</h1>
          <p className="mt-2 text-sm text-muted">
            {toFaDigits(sections.length)} ردهٔ سنی • {toFaDigits(sections.reduce((sum, section) => sum + section.draws.length, 0))} گروه •{' '}
            {toFaDigits(participants.length)} شرکت‌کننده
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="subtle" onClick={openImport}>
            <Upload size={16} />
            بارگذاری فایل جدید
          </Button>
          <Button onClick={() => startPdfJob('all')} disabled={sections.length === 0}>
            <FileDown size={16} />
            خروجی PDF همه گروه‌ها
          </Button>
        </div>
      </header>

      <div className="space-y-10">
        {sections.map((section) => (
          <section key={section.ageCategory} aria-label={section.ageCategory}>
            <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-line pb-2">
              <h2 className="font-display text-2xl text-ink-900">{section.ageCategory}</h2>
              <span className="rounded-full bg-turf px-3 py-1 text-xs font-medium text-muted">
                {toFaDigits(section.draws.length)} وزن • {toFaDigits(section.participantCount)} شرکت‌کننده
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.draws.map((draw) => (
                <GroupCard
                  key={draw.groupId}
                  draw={draw}
                  solo={findSoloParticipant(draw, participantsById) ?? undefined}
                  onOpen={() => openBracket(draw.groupId)}
                />
              ))}
            </div>
          </section>
        ))}
        {sections.length === 0 && (
          <p className="rounded-xl border border-dashed border-line-strong bg-surface px-6 py-12 text-center text-sm text-muted">
            هنوز گروهی ساخته نشده است؛ یک فایل اکسل بارگذاری کنید.
          </p>
        )}
      </div>
    </div>
  )
}
