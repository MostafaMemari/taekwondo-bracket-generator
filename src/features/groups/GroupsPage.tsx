import { useMemo, useState } from 'react'
import { CalendarRange, FileDown, ImageDown, Medal, PencilRuler, Printer } from 'lucide-react'
import type { GroupDraw } from '../../core/types.ts'
import { useTournament } from '../../store/tournamentStore.ts'
import { Button } from '../../components/Button.tsx'
import { toFaDigits } from '../../lib/formatFa.ts'
import { compareByWeightLabel } from '../../lib/weightSorting.ts'
import { findSoloParticipant } from '../../lib/soloDraw.ts'
import { ManualTableModal } from '../manual/ManualTableModal.tsx'
import { MedalRainModal } from '../medal-rain/MedalRainModal.tsx'
import { GroupRow } from './GroupRow.tsx'

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
  const openSchedule = useTournament((state) => state.openSchedule)
  const startExportJob = useTournament((state) => state.startExportJob)
  const [manualOpen, setManualOpen] = useState(false)
  const [medalRainOpen, setMedalRainOpen] = useState(false)

  const drawList = useMemo(() => Object.values(draws), [draws])
  const sections = useMemo(() => buildAgeSections(drawList), [drawList])
  const participantsById = useMemo(
    () => new Map(participants.map((participant) => [participant.id, participant])),
    [participants],
  )

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink-900">گروه های مسابقات</h1>
          <p className="mt-1.5 text-sm text-muted">
            {toFaDigits(sections.length)} رده سنی • {toFaDigits(drawList.length)} گروه •{' '}
            {toFaDigits(participants.length)} شرکت کننده
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="subtle"
            onClick={() => setMedalRainOpen(true)}
            title="همه مدال می گیرند — چند جدول ۴ نفره با رده بندی و جدا ماندن هم مربی ها"
          >
            <Medal size={16} />
            باران مدال
          </Button>
          <Button
            variant="subtle"
            onClick={() => setManualOpen(true)}
            title="جدول خالی ۲ تا ۶۴ نفره بساز و اسامی را خودت روی خانه ها بنویس"
          >
            <PencilRuler size={16} />
            جدول دستی
          </Button>
          <Button variant="subtle" onClick={openSchedule} title="بازه های زمانی، زمین ها و شماره گذاری خودکار مسابقه ها">
            <CalendarRange size={16} />
            برنامه ریزی زمین ها
          </Button>
          <Button variant="subtle" onClick={() => { window.location.hash = '#pdf-preview' }}>
            <Printer size={16} />
            چاپ / پیش نمایش
          </Button>
          <Button
            variant="subtle"
            onClick={() =>
              startExportJob({ kind: 'image', scope: 'all', groupId: null })
            }
            disabled={drawList.length === 0}
            title="دانلود عکس PNG همه جدول ها — بدون جدول نتایج، مناسب تلگرام"
          >
            <ImageDown size={16} />
            عکس همه گروه ها
          </Button>
          <Button
            onClick={() => startExportJob({ kind: 'pdf', scope: 'all', groupId: null })}
            disabled={drawList.length === 0}
          >
            <FileDown size={16} />
            PDF همه گروه ها
          </Button>
        </div>
      </header>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.ageCategory} aria-label={section.ageCategory}>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="font-display text-xl text-ink-900">{section.ageCategory}</h2>
              <span className="rounded-full border border-line bg-turf px-2.5 py-0.5 text-[11px] font-medium text-muted">
                {toFaDigits(section.draws.length)} وزن • {toFaDigits(section.participantCount)} شرکت کننده
              </span>
              <span aria-hidden className="h-px flex-1 bg-line" />
            </div>
            {/* شبکه کارت های وزن ها — هر وزن یک کارت فشرده با عکس/PDF کنار خودش */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {section.draws.map((draw) => (
                <GroupRow
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
            هنوز گروهی ساخته نشده است؛ یک فایل اکسل بارگذاری کنید یا جدول دستی بسازید.
          </p>
        )}
      </div>
      <ManualTableModal open={manualOpen} onClose={() => setManualOpen(false)} />
      <MedalRainModal open={medalRainOpen} onClose={() => setMedalRainOpen(false)} />
    </div>
  )
}
