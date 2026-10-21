import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { GroupDraw } from '../../core/types.ts'
import { useTournament } from '../../store/tournamentStore.ts'
import { toFaDigits } from '../../lib/formatFa.ts'
import { effectiveMatchNumbers } from '../../core/schedule/schedule.ts'
import { BracketSheet } from './BracketSheet.tsx'
import { exportDrawsToPdf } from './exportDrawsToPdf.ts'
import { exportImageFromElement, imageBaseName } from './exportGroupImage.ts'
import { renderWeightTitle } from '../../lib/formatFa.ts'
import { BusyOverlay } from '../../components/ExportChrome.tsx'
import { OFFSCREEN_MOUNT_STYLE } from '../../components/offscreenMount.ts'

/**
 * رانه واحد همه کارهای خروجی از صفحه های اصلی (گروه ها، قرعه، پیش نمایش چاپ):
 * یک کار «PDF» یا «عکس» را از store می گیرد، برگه هایش را آفسکرین مونت می کند،
 * می گیرد و دانلود می کند. عکس = برگه تلگرامی بدون جدول نتایج؛ PDF = برگه
 * کامل چاپی. قبلا دو رانه کپیِ هم برای این کار وجود داشت.
 */
export function ExportStage() {
  const exportJob = useTournament((state) => state.exportJob)
  const draws = useTournament((state) => state.draws)
  const selectedGroupId = useTournament((state) => state.selectedGroupId)

  if (!exportJob) return null

  const targetGroupId = exportJob.groupId ?? selectedGroupId
  const targetDraws: GroupDraw[] =
    exportJob.scope === 'all'
      ? Object.values(draws)
      : targetGroupId && draws[targetGroupId]
        ? [draws[targetGroupId]]
        : []

  if (targetDraws.length === 0) return null

  return createPortal(
    <ExportCapture
      key={targetDraws.map((draw) => draw.groupId).join('|')}
      draws={targetDraws}
      kind={exportJob.kind}
    />,
    document.body,
  )
}

function ExportCapture({ draws, kind }: { draws: GroupDraw[]; kind: 'pdf' | 'image' }) {
  const finishExportJob = useTournament((state) => state.finishExportJob)
  const participants = useTournament((state) => state.participants)
  const drawsRecord = useTournament((state) => state.draws)
  const scheduleSessions = useTournament((state) => state.scheduleSessions)
  const matchNumberOverrides = useTournament((state) => state.matchNumberOverrides)
  const manualTables = useTournament((state) => state.manualTables)
  const medalRainTables = useTournament((state) => state.medalRainTables)
  const meta = useTournament((state) => state.meta)
  const [hasError, setHasError] = useState(false)

  const participantsById = useMemo(
    () => new Map(participants.map((participant) => [participant.id, participant])),
    [participants],
  )
  const matchNumbers = useMemo(
    () =>
      effectiveMatchNumbers(
        scheduleSessions,
        drawsRecord,
        participantsById,
        matchNumberOverrides,
      ),
    [scheduleSessions, drawsRecord, participantsById, matchNumberOverrides],
  )

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        await document.fonts.ready
        if (kind === 'pdf') {
          await exportDrawsToPdf(draws.length, meta.title)
        } else {
          const base = imageBaseName(meta.title)
          for (let index = 0; index < draws.length; index += 1) {
            const element = document.getElementById(`pdf-sheet-${index}`)
            if (!element) throw new Error(`image sheet ${index} not found`)
            const draw = draws[index]
            await exportImageFromElement(
              element,
              `${base} — ${renderWeightTitle(meta.sheetTitleFormat, {
                ageCategory: draw.group.ageCategory,
                weightCategory: draw.group.weightCategory,
                tournamentTitle: meta.title,
              })}`,
            )
            // مرورگر دانلودهای پشت سرهم را محدود می کند
            await new Promise((resolve) => window.setTimeout(resolve, 350))
          }
        }
        if (!cancelled) finishExportJob()
      } catch {
        if (!cancelled) setHasError(true)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [draws, finishExportJob, kind, meta])

  return (
    <>
      <div aria-hidden style={OFFSCREEN_MOUNT_STYLE}>
        {draws.map((draw, index) => {
          // زمین و ساعت: جدول دستی یا جدول باران مدال
          const info = manualTables[draw.groupId] ?? medalRainTables[draw.groupId]
          return (
            <BracketSheet
              key={draw.groupId}
              draw={draw}
              participantsById={participantsById}
              meta={meta}
              index={index}
              variant={kind === 'image' ? 'image' : 'print'}
              matchNumbers={matchNumbers}
              matLabel={info?.matLabel || undefined}
              attendTime={info?.attendTime || undefined}
            />
          )
        })}
      </div>

      {hasError ? (
        createPortal(
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
              <p className="font-bold text-hogu-600">
                {kind === 'pdf' ? 'ساخت PDF ناموفق بود.' : 'ساخت تصویر ناموفق بود.'}
              </p>
              <button
                className="mt-3 rounded-lg border border-line-strong px-4 py-1.5 text-sm font-medium hover:border-mat-600"
                onClick={finishExportJob}
              >
                بستن
              </button>
            </div>
          </div>,
          document.body,
        )
      ) : (
        <BusyOverlay
          message={
            kind === 'pdf'
              ? 'در حال ساخت فایل PDF…'
              : `در حال ساخت تصویر${draws.length > 1 ? ` ها (${toFaDigits(draws.length)} گروه)` : ''}…`
          }
        />
      )}
    </>
  )
}
