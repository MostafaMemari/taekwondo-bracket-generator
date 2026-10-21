import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { GroupDraw } from '../../core/types.ts'
import { useTournament } from '../../store/tournamentStore.ts'
import { toFaDigits } from '../../lib/formatFa.ts'
import { effectiveMatchNumbers } from '../../core/schedule/schedule.ts'
import { BracketSheet } from './BracketSheet.tsx'
import { exportDrawsToPdf } from './exportDrawsToPdf.ts'
import { exportSheetsAsA4Images } from './exportGroupImage.ts'
import { renderWeightTitle } from '../../lib/formatFa.ts'
import { tableThemeById } from '../../lib/tableThemes.ts'
import { beltDisplayValue } from '../../lib/belts.ts'
import { BusyOverlay } from '../../components/ExportChrome.tsx'
import { OFFSCREEN_MOUNT_STYLE } from '../../components/offscreenMount.ts'

/** نام فایل خروجی یک وزن — فقط از قالب عنوان؛ عنوان مسابقات فقط با {عنوان} می آید */
function weightFileName(
  meta: ReturnType<typeof useTournament.getState>['meta'],
  draw: GroupDraw,
): string {
  return renderWeightTitle(meta.sheetTitleFormat, {
    ageCategory: draw.group.ageCategory,
    weightCategory: draw.group.weightCategory,
    tournamentTitle: meta.title,
  })
}

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
  const tableBeltLabels = useTournament((state) => state.tableBeltLabels)

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
      tableBeltLabels={tableBeltLabels}
    />,
    document.body,
  )
}

function ExportCapture({
  draws,
  kind,
  tableBeltLabels,
}: {
  draws: GroupDraw[]
  kind: 'pdf' | 'image'
  tableBeltLabels: Record<string, string>
}) {
  const finishExportJob = useTournament((state) => state.finishExportJob)
  const participants = useTournament((state) => state.participants)
  const drawsRecord = useTournament((state) => state.draws)
  const scheduleSessions = useTournament((state) => state.scheduleSessions)
  const matchNumberOverrides = useTournament((state) => state.matchNumberOverrides)
  const manualTables = useTournament((state) => state.manualTables)
  const medalRainTables = useTournament((state) => state.medalRainTables)
  const meta = useTournament((state) => state.meta)
  // پس زمینه بیرون برگه در خروجی عکس/PDF — همرنگ تم جدول
  const tableThemeId = useTournament((state) => state.tableThemeId)
  const backdrop = tableThemeById(tableThemeId).canvasBg
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
          // نام فایل: یک جدول = قالب عنوان همان وزن؛ همه جدول ها = عنوان مسابقات
          const fileBase =
            draws.length === 1
              ? weightFileName(meta, draws[0])
              : meta.title.trim() || 'قرعه کشی مسابقات تکواندو'
          await exportDrawsToPdf(draws.length, fileBase, backdrop)
        } else {
          await exportSheetsAsA4Images(
            draws.map((_, index) => index),
            (index) => weightFileName(meta, draws[index]),
            backdrop,
          )
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
  }, [draws, finishExportJob, kind, meta, backdrop])

  return (
    <>
      <div aria-hidden style={OFFSCREEN_MOUNT_STYLE}>
        {draws.map((draw, index) => {
          // زمین و ساعت: جدول دستی یا جدول باران مدال؛ کمربند: برای همه جدول ها
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
              beltLabel={beltDisplayValue(tableBeltLabels[draw.groupId]) || undefined}
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
