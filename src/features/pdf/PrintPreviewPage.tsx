import { useTournament } from '../../store/tournamentStore.ts'
import { useScheduleModel } from '../../lib/hooks.ts'
import { BracketSheet } from './BracketSheet.tsx'
import { PrintToolbar } from './PrintToolbar.tsx'
import { toFaDigits } from '../../lib/formatFa.ts'
import { beltDisplayValue } from '../../lib/belts.ts'

interface PrintPreviewPageProps {
  /** 'all' or a groupId */
  scope: string
}

export function PrintPreviewPage({ scope }: PrintPreviewPageProps) {
  const draws = useTournament((state) => state.draws)
  const manualTables = useTournament((state) => state.manualTables)
  const medalRainTables = useTournament((state) => state.medalRainTables)
  const tableBeltLabels = useTournament((state) => state.tableBeltLabels)
  const startExportJob = useTournament((state) => state.startExportJob)
  const exportGroupPdf = useTournament((state) => state.exportGroupPdf)
  const { participantsById, matchNumbers } = useScheduleModel()

  const allDraws = Object.values(draws)
  const drawList = scope === 'all' ? allDraws : allDraws.filter((draw) => draw.groupId === scope)
  const meta = useTournament((state) => state.meta)

  return (
    <div className="print-root flex flex-col items-center gap-8 bg-ink-800 px-6 py-8">
      <PrintToolbar
        summary={`پیش نمایش چاپ — ${toFaDigits(drawList.length)} برگه در قطع A4 افقی`}
        onDownloadPdf={() =>
          scope === 'all'
            ? startExportJob({ kind: 'pdf', scope: 'all', groupId: null })
            : exportGroupPdf(scope)
        }
      />

      {drawList.map((draw, index) => {
        // زمین و ساعت: جدول دستی یا جدول باران مدال؛ کمربند: برای همه جدول ها
        const info = manualTables[draw.groupId] ?? medalRainTables[draw.groupId]
        // برگه خودش صفحه های A4 را رندر می کند (برگه های بلند چند صفحه می شوند)
        return (
          <BracketSheet
            key={draw.groupId}
            draw={draw}
            participantsById={participantsById}
            meta={meta}
            index={index}
            matchNumbers={matchNumbers}
            matLabel={info?.matLabel || undefined}
            attendTime={info?.attendTime || undefined}
            beltLabel={beltDisplayValue(tableBeltLabels[draw.groupId]) || undefined}
          />
        )
      })}
    </div>
  )
}
