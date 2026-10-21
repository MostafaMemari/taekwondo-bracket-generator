import { useState } from 'react'
import { AlertTriangle, Download, Medal, PencilRuler, Plus, Sparkles } from 'lucide-react'
import {
  readSheetMatrix,
  type ColumnSelection,
  type SheetMatrix,
} from '../../core/excel/columnMapping.ts'
import { parseMappedSheet } from '../../core/excel/parseRosterWorkbook.ts'
import type { ParsedRoster } from '../../core/types.ts'
import {
  SAMPLE_PRESETS,
  buildMedalRainRows,
  buildSampleRoster,
  sampleFileName,
  type SamplePreset,
} from '../../core/sample/sampleRoster.ts'
import { splitMedalRainPools } from '../../core/bracket/medalRain.ts'
import { useTournament } from '../../store/tournamentStore.ts'
import { toFaDigits } from '../../lib/formatFa.ts'
import sampleXlsxB64 from 'virtual:sample-xlsx'
import { Button } from '../../components/Button.tsx'
import { ManualTableModal } from '../manual/ManualTableModal.tsx'
import { MedalRainModal } from '../medal-rain/MedalRainModal.tsx'
import { ColumnMappingStep } from './ColumnMappingStep.tsx'
import { FileDropzone } from './FileDropzone.tsx'
import { RosterPreviewTable } from './RosterPreviewTable.tsx'

const SAMPLE_XLSX_URL =
  'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + sampleXlsxB64

export function ImportPage() {
  const importRoster = useTournament((state) => state.importRoster)
  const createMedalRainTables = useTournament((state) => state.createMedalRainTables)
  const participantCount = useTournament((state) => state.participants.length)
  const groupCount = useTournament((state) => Object.keys(state.draws).length)
  const hasData = participantCount > 0
  const [pendingSheet, setPendingSheet] = useState<SheetMatrix | null>(null)
  const [pending, setPending] = useState<ParsedRoster | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [manualOpen, setManualOpen] = useState(false)
  const [medalRainOpen, setMedalRainOpen] = useState(false)

  async function handleFile(file: File) {
    setError('')
    try {
      const buffer = await file.arrayBuffer()
      const matrix = await readSheetMatrix(buffer)
      if (!matrix) {
        setError('ردیف سرستون ها در فایل پیدا نشد؛ ساختار فایل را بررسی کنید.')
        return
      }
      setFileName(file.name)
      setPendingSheet(matrix)
    } catch {
      setError('خواندن فایل ممکن نشد. فایل اکسل معتبر است؟')
    }
  }

  function loadPreset(preset: SamplePreset) {
    if (hasData && !window.confirm('داده های فعلی با نمونه جدید جایگزین شود؟')) return
    if (preset.medalRain) {
      createMedalRainTables({
        title: '۵۴-',
        matLabel: 'زمین ۱',
        attendTime: '۸:۰۰',
        bronze: true,
        pools: splitMedalRainPools(buildMedalRainRows(preset.sizes[0])).map((pool) =>
          pool.athletes.map((athlete) => ({
            fullName: athlete.fullName,
            coachName: athlete.coachName,
          })),
        ),
        replace: true,
        fileName: sampleFileName(preset),
      })
      return
    }
    importRoster(sampleFileName(preset), buildSampleRoster(preset))
  }

  function handleMappingConfirm(selection: ColumnSelection) {
    if (!pendingSheet) return
    setPending(parseMappedSheet(pendingSheet, selection))
    setPendingSheet(null)
  }

  function confirmImport() {
    if (!pending || pending.participants.length === 0) return
    importRoster(fileName, pending)
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl text-ink-900">بارگذاری فایل اکسل</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          پس از انتخاب فایل، ستون های آن را به فیلدهای برنامه متصل می کنید. هر ردیف یک شرکت کننده
          است و ترکیب «رده سنی + وزن» یک گروه جداگانه می سازد.
        </p>
      </header>

      {error && (
        <p className="mb-5 rounded-lg border border-hogu-100 bg-hogu-100 px-4 py-3 text-sm text-hogu-700">
          {error}
        </p>
      )}

      {pendingSheet ? (
        <ColumnMappingStep
          matrix={pendingSheet}
          fileName={fileName}
          onCancel={() => setPendingSheet(null)}
          onConfirm={handleMappingConfirm}
        />
      ) : pending ? (
        <div className="space-y-5">
          <RosterPreviewTable participants={pending.participants} issues={pending.issues} />
          {pending.participants.length === 0 && (
            <p className="flex items-center gap-2 rounded-lg border border-hogu-100 bg-hogu-100 px-4 py-3 text-sm text-hogu-700">
              <AlertTriangle size={16} />
              هیچ ردیف کاملی پیدا نشد؛ فایل را بررسی و اصلاح کنید.
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button onClick={confirmImport} disabled={pending.participants.length === 0}>
              تأیید و مشاهده گروه ها
            </Button>
            <Button variant="subtle" onClick={() => setPending(null)}>
              انصراف
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <FileDropzone onFile={handleFile} />
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
                <Medal size={16} className="text-mat-600" />
                باران مدال
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                همه مدال می گیرند — هنرجوها با مربی شان را می دهی و برنامه بین چند جدول ۴ نفره
                (نیمه نهایی و فینال و رده بندی) پخش می شود؛ هم مربی ها از هم جدا می مانند.
              </p>
            </div>
            <Button variant="subtle" onClick={() => setMedalRainOpen(true)}>
              <Plus size={16} />
              چیدمان باران مدال
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
                <PencilRuler size={16} className="text-mat-600" />
                جدول دستی
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                بدون فایل اکسل، جدول خالی ۲ تا ۶۴ نفره بساز؛ اسامی و مربی ها را روی خانه ها
                می نویسی و زمین و ساعت خودت می دهی.
              </p>
            </div>
            <Button variant="subtle" onClick={() => setManualOpen(true)}>
              <Plus size={16} />
              جدول خالی بساز
            </Button>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
                <Sparkles size={16} className="text-mat-600" />
                امتحان با داده نمونه
              </p>
              {hasData && (
                <p className="text-[11px] text-muted">
                  داده فعلی: {toFaDigits(participantCount)} هنرجو در {toFaDigits(groupCount)} گروه —
                  نمونه جایگزین آن می شود
                </p>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {SAMPLE_PRESETS.map((preset, index) => (
                <button
                  key={preset.id}
                  onClick={() => loadPreset(preset)}
                  title={preset.hint}
                  className={
                    index === 0
                      ? 'rounded-lg bg-mat-600 px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-mat-700'
                      : 'rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm font-medium text-ink-800 transition-colors hover:border-mat-600'
                  }
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-muted">
              جدول های ۲ و ۴ و ۸ و ۱۶ و ۳۲ و ۶۴ نفره — هر اندازه را جدا امتحان کن، یا «همه
              انواع» را یکجا ببین. نمونه های «باران مدال» هم چند جدول ۴ نفره با رده بندی می سازند.
            </p>
          </div>
          <a
            href={SAMPLE_XLSX_URL}
            download="sample-registration.xlsx"
            className="inline-flex items-center gap-2 text-sm font-medium text-mat-600 hover:text-mat-700"
          >
            <Download size={16} />
            دانلود قالب اکسل نمونه
          </a>
        </div>
      )}
      <ManualTableModal open={manualOpen} onClose={() => setManualOpen(false)} />
      <MedalRainModal open={medalRainOpen} onClose={() => setMedalRainOpen(false)} />
    </div>
  )
}
