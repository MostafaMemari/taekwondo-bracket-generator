import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { GroupDraw } from '../../core/types.ts'
import { useTournament } from '../../store/tournamentStore.ts'
import { faDate } from '../../lib/formatFa.ts'
import { BracketSheet } from './BracketSheet.tsx'
import { exportDrawsToPdf } from './exportDrawsToPdf.ts'

export function PdfStage() {
  const pdfJob = useTournament((state) => state.pdfJob)
  const draws = useTournament((state) => state.draws)
  const selectedGroupId = useTournament((state) => state.selectedGroupId)

  if (!pdfJob) return null

  const selectedDraws =
    pdfJob === 'all'
      ? Object.values(draws)
      : selectedGroupId && draws[selectedGroupId]
        ? [draws[selectedGroupId]]
        : []

  return createPortal(
    <PdfCapture
      key={selectedDraws.map((draw) => draw.groupId).join('|')}
      draws={selectedDraws}
    />,
    document.body,
  )
}

function PdfCapture({ draws }: { draws: GroupDraw[] }) {
  const finishPdfJob = useTournament((state) => state.finishPdfJob)
  const participants = useTournament((state) => state.participants)
  const fileName = useTournament((state) => state.fileName)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        await document.fonts.ready
        await exportDrawsToPdf(draws.length)
        if (!cancelled) finishPdfJob()
      } catch {
        if (!cancelled) setHasError(true)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [draws, finishPdfJob])

  const participantsById = new Map(participants.map((participant) => [participant.id, participant]))
  const dateText = faDate(new Date())

  return (
    <>
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: -12000,
          width: 0,
          height: 0,
          overflow: 'visible',
        }}
      >
        {draws.map((draw, index) => (
          <BracketSheet
            key={draw.groupId}
            draw={draw}
            participantsById={participantsById}
            index={index}
            total={draws.length}
            dateText={dateText}
            sourceName={fileName ?? '—'}
          />
        ))}
      </div>

      {createPortal(
        <div
          dir="rtl"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(10, 20, 36, 0.72)',
          }}
        >
          <div className="rounded-xl bg-surface px-8 py-6 text-center shadow-xl">
            {hasError ? (
              <>
                <p className="font-bold text-hogu-600">ساخت PDF ناموفق بود.</p>
                <button
                  className="mt-3 rounded-lg border border-line-strong px-4 py-1.5 text-sm font-medium hover:border-mat-600"
                  onClick={finishPdfJob}
                >
                  بستن
                </button>
              </>
            ) : (
              <>
                <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-line border-t-mat-600" />
                <p className="mt-3 text-sm font-medium text-ink-900">در حال ساخت فایل PDF…</p>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
