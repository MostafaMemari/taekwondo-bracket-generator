import { useEffect, useMemo, useState } from 'react'
import { LayoutGrid, List, SquareStack } from 'lucide-react'
import { sheetScheduleNote } from '../../core/schedule/schedule.ts'
import { useTournament } from '../../store/tournamentStore.ts'
import { useScheduleModel } from '../../lib/hooks.ts'
import { groupTitle, toFaDigits } from '../../lib/formatFa.ts'
import { realMatchCount } from '../../lib/drawStats.ts'
import { ScheduleSheet } from './ScheduleSheet.tsx'
import { exportScheduleBundlePdf, type SchedulePrintMode } from './exportSchedule.ts'
import { BracketSheet } from '../pdf/BracketSheet.tsx'
import { PrintToolbar } from '../pdf/PrintToolbar.tsx'
import { Segmented } from '../../components/Segmented.tsx'
import type { GroupDraw } from '../../core/types.ts'

/** حالت فعال نوار سه حالته بالای صفحه چاپ برنامه */
const MODE_OPTIONS: Array<{ key: SchedulePrintMode; label: string; icon: typeof List }> = [
  { key: 'plan', label: 'فقط برنامه', icon: List },
  { key: 'tables', label: 'فقط جدول ها', icon: LayoutGrid },
  { key: 'both', label: 'هر دو', icon: SquareStack },
]

function readModeFromHash(): SchedulePrintMode {
  const query = window.location.hash.split('?')[1] ?? ''
  const value = new URLSearchParams(query).get('mode')
  return value === 'plan' || value === 'tables' ? value : 'both'
}

/**
 * پیش نمایش چاپ «برنامه مسابقات» — مسیر #schedule-print (و ‎#schedule-print?mode=…).
 * سه حالت دارد: برگه برنامه در قطع A4 عمودی، جدول های قرعه وزن های داخل برنامه
 * در قطع A4 افقی (به ترتیب بازه و زمین، با شماره های زنده)، یا هر دو با هم.
 * در حالت «هر دو» چاپ با named-page CSS انجام می شود: صفحات برنامه عمودی و
 * صفحات جدول ها افقی از یک دستور چاپ.
 */
export function SchedulePrintPage() {
  const draws = useTournament((state) => state.draws)
  const meta = useTournament((state) => state.meta)
  const [mode, setMode] = useState<SchedulePrintMode>(readModeFromHash)
  const [pdfBusy, setPdfBusy] = useState(false)
  const { participantsById, built, matchNumbers, manualNumbers } = useScheduleModel()

  const drawList = useMemo(() => Object.values(draws), [draws])

  /** جدول های قرعه وزن های داخل برنامه — به ترتیب بازه زمانی و زمین */
  const scheduledSheets = useMemo(() => {
    const list: Array<{
      groupId: string
      draw: GroupDraw
      note: string
      matLabel: string
      attendTime: string
    }> = []
    built.sessions.forEach((scheduled) => {
      scheduled.mats.forEach((mat) => {
        mat.weights.forEach((weight) => {
          const draw = draws[weight.groupId]
          if (!draw) return
          list.push({
            groupId: weight.groupId,
            draw,
            note: sheetScheduleNote(mat.mat.label, scheduled.session),
            matLabel: mat.mat.label,
            attendTime: scheduled.session.timeFrom,
          })
        })
      })
    })
    return list
  }, [built, draws])

  const unassignedLabels = useMemo(() => {
    const assigned = new Set(built.assignedGroupIds)
    return drawList
      .filter((draw) => !assigned.has(draw.groupId) && draw.structure.roundCount > 0)
      .map(
        (draw) =>
          `${groupTitle(draw.group.ageCategory, draw.group.weightCategory)} (${toFaDigits(realMatchCount(draw))} مسابقه)`,
      )
  }, [drawList, built.assignedGroupIds])

  const hasPlan = built.totalMatches > 0
  const hasTables = scheduledSheets.length > 0
  const exportDisabled = mode === 'tables' ? !hasTables : !hasPlan

  // print orientation:
  //   plan   → whole job portrait (the @page override below)
  //   tables → global landscape rule of index.css applies, nothing to inject
  //   both   → named pages: the schedule sheet flows on portrait pages while
  //            the bracket .print-page sheets keep the landscape default
  useEffect(() => {
    const style = document.createElement('style')
    if (mode === 'plan') {
      style.textContent = '@media print { @page { size: A4 portrait; margin: 0; } }'
    } else if (mode === 'both') {
      style.textContent = [
        '@media print {',
        '  @page { size: A4 landscape; margin: 0; }',
        '  @page schedule-portrait { size: A4 portrait; margin: 0; }',
        '  .schedule-sheet-wrap { page: schedule-portrait; }',
        '}',
      ].join('\n')
    }
    document.head.appendChild(style)
    return () => {
      style.remove()
    }
  }, [mode])

  async function onDownloadPdf() {
    if (pdfBusy) return
    setPdfBusy(true)
    try {
      await document.fonts.ready
      await exportScheduleBundlePdf(meta.title, mode)
    } catch {
      // ignore — user can retry
    }
    setPdfBusy(false)
  }

  const summary =
    mode === 'plan'
      ? `برنامه مسابقات — ${toFaDigits(built.totalMatches)} مسابقه در قطع A4 عمودی`
      : mode === 'tables'
        ? `جدول های قرعه — ${toFaDigits(scheduledSheets.length)} برگه در قطع A4 افقی`
        : `برنامه و جدول ها — ${toFaDigits(built.totalMatches)} مسابقه + ${toFaDigits(scheduledSheets.length)} جدول`

  return (
    <div className="schedule-print-root print-root flex flex-col items-center gap-8 bg-ink-800 px-6 py-8">
      <PrintToolbar
        summary={summary}
        onDownloadPdf={onDownloadPdf}
        downloadDisabled={exportDisabled}
        downloadBusy={pdfBusy}
        printDisabled={exportDisabled}
        leading={
          <Segmented
            items={MODE_OPTIONS}
            activeKey={mode}
            onChange={setMode}
            ariaLabel="حالت چاپ برنامه"
            onDark
          />
        }
      />

      {mode !== 'tables' && (
        <div className="schedule-sheet-wrap shadow-2xl">
          <ScheduleSheet
            schedule={built}
            meta={meta}
            unassignedLabels={unassignedLabels}
            manualNumbers={manualNumbers}
          />
        </div>
      )}

      {mode !== 'plan' &&
        (hasTables ? (
          scheduledSheets.map((sheet, index) => (
            // برگه خودش صفحه های A4 را رندر می کند (بلندها چند صفحه می شوند)
            <div key={sheet.groupId} data-sched-bracket>
              <BracketSheet
                draw={sheet.draw}
                participantsById={participantsById}
                meta={meta}
                index={index}
                matchNumbers={matchNumbers}
                matLabel={sheet.matLabel}
                attendTime={sheet.attendTime}
              />
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-gold-600/30 bg-gold-50 px-6 py-4 text-sm text-ink-800">
            هنوز وزنی در برنامه زمین ها قرار نگرفته است — در صفحه «برنامه ریزی زمین ها» وزن ها
            را به زمین ها بدهید تا جدول هایشان این جا بیاید.
          </p>
        ))}
    </div>
  )
}
