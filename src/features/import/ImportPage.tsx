import { useMemo, useState, type ComponentType, type ReactNode } from 'react'
import {
  AlertTriangle,
  CalendarRange,
  ChevronRight,
  Download,
  FileDown,
  FileSpreadsheet,
  ImageDown,
  LayoutGrid,
  Medal,
  PencilRuler,
  Plus,
  Printer,
  Sparkles,
  Trophy,
} from 'lucide-react'
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
import { faDate, toFaDigits } from '../../lib/formatFa.ts'
import { openBracketFromNav } from '../../lib/bracketNav.ts'
import sampleXlsxB64 from 'virtual:sample-xlsx'
import { Button } from '../../components/Button.tsx'
import { ManualTableModal } from '../manual/ManualTableModal.tsx'
import { MedalRainModal } from '../medal-rain/MedalRainModal.tsx'
import { ColumnMappingStep } from './ColumnMappingStep.tsx'
import { FileDropzone } from './FileDropzone.tsx'
import { RosterPreviewTable } from './RosterPreviewTable.tsx'

const SAMPLE_XLSX_URL =
  'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + sampleXlsxB64

interface ActionCardProps {
  icon: ComponentType<{ size?: number | string; className?: string }>
  title: string
  desc: string
  children?: ReactNode
}

/** کارت بخش داشبورد — آیکون + عنوان + توضیح واقعی وضعیت + دکمه های عمل */
function ActionCard({ icon: Icon, title, desc, children }: ActionCardProps) {
  return (
    <div className="flex h-full flex-col justify-between gap-3 rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="min-w-0">
        <p className="flex items-center gap-2.5 text-sm font-bold text-ink-900">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-mat-50 text-mat-600">
            <Icon size={16} aria-hidden />
          </span>
          {title}
        </p>
        <p className="mt-2.5 text-xs leading-5 text-muted">{desc}</p>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

export function ImportPage() {
  const importRoster = useTournament((state) => state.importRoster)
  const createMedalRainTables = useTournament((state) => state.createMedalRainTables)
  const participants = useTournament((state) => state.participants)
  const draws = useTournament((state) => state.draws)
  const issueCount = useTournament((state) => state.issues.length)
  const fileName = useTournament((state) => state.fileName)
  const importedAt = useTournament((state) => state.importedAt)
  const sessionCount = useTournament((state) => state.scheduleSessions.length)
  const openGroups = useTournament((state) => state.openGroups)
  const openSchedule = useTournament((state) => state.openSchedule)
  const startExportJob = useTournament((state) => state.startExportJob)

  const participantCount = participants.length
  const hasData = participantCount > 0
  const [pendingSheet, setPendingSheet] = useState<SheetMatrix | null>(null)
  const [pending, setPending] = useState<ParsedRoster | null>(null)
  const [pendingFileName, setPendingFileName] = useState('')
  const [error, setError] = useState('')
  const [manualOpen, setManualOpen] = useState(false)
  const [medalRainOpen, setMedalRainOpen] = useState(false)
  // داشبورد (وقتی داده هست) یا جریان ورود اطلاعات — ورود تازه با خود کاربر شروع می شود
  const [importMode, setImportMode] = useState(false)
  const showImportFlow = !hasData || importMode

  const drawList = useMemo(() => Object.values(draws), [draws])
  const ageCategoryCount = useMemo(
    () => new Set(participants.map((participant) => participant.ageCategory)).size,
    [participants],
  )

  async function handleFile(file: File) {
    setError('')
    try {
      const buffer = await file.arrayBuffer()
      const matrix = await readSheetMatrix(buffer)
      if (!matrix) {
        setError('ردیف سرستون ها در فایل پیدا نشد؛ ساختار فایل را بررسی کنید.')
        return
      }
      setPendingFileName(file.name)
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
    importRoster(pendingFileName, pending)
  }

  /* ———— جریان ورود اطلاعات: بدون داده، یا با انتخاب صریح «بارگذاری جدید» ———— */
  if (showImportFlow) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        {importMode && (
          <Button variant="ghost" className="mb-4" onClick={() => setImportMode(false)}>
            <ChevronRight size={16} aria-hidden />
            بازگشت به داشبورد
          </Button>
        )}
        <header className="mb-8">
          <h1 className="font-display text-3xl text-ink-900">
            {importMode ? 'بارگذاری فایل اکسل جدید' : 'بارگذاری فایل اکسل'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            {importMode
              ? 'فایل تازه همه داده ها، قرعه ها، برنامه زمین ها و تنظیم های وزن های فعلی را از نو می سازد.'
              : 'پس از انتخاب فایل، ستون های آن را به فیلدهای برنامه متصل می کنید. هر ردیف یک شرکت کننده است و ترکیب «رده سنی + وزن» یک گروه جداگانه می سازد.'}
          </p>
        </header>

        {error && (
          <p
            role="alert"
            className="mb-5 flex items-center gap-2 rounded-lg border border-hogu-100 bg-hogu-100 px-4 py-3 text-sm text-hogu-700"
          >
            <AlertTriangle size={16} aria-hidden />
            {error}
          </p>
        )}

        {pendingSheet ? (
          <ColumnMappingStep
            matrix={pendingSheet}
            fileName={pendingFileName}
            onCancel={() => setPendingSheet(null)}
            onConfirm={handleMappingConfirm}
          />
        ) : pending ? (
          <div className="space-y-5">
            <RosterPreviewTable participants={pending.participants} issues={pending.issues} />
            {pending.participants.length === 0 && (
              <p
                role="alert"
                className="flex items-center gap-2 rounded-lg border border-hogu-100 bg-hogu-100 px-4 py-3 text-sm text-hogu-700"
              >
                <AlertTriangle size={16} aria-hidden />
                هیچ ردیف کاملی پیدا نشد؛ فایل را بررسی و اصلاح کنید.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
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
            <a
              href={SAMPLE_XLSX_URL}
              download="sample-registration.xlsx"
              className="inline-flex items-center gap-2 text-sm font-medium text-mat-600 hover:text-mat-700"
            >
              <Download size={16} aria-hidden />
              دانلود قالب اکسل نمونه
            </a>
            <div className="grid gap-3 sm:grid-cols-2">
              <ActionCard
                icon={Medal}
                title="باران مدال"
                desc="همه مدال می گیرند — هنرجوها با مربی شان را می دهی و برنامه بین چند جدول ۴ نفره (نیمه نهایی و فینال و رده بندی) پخش می شود؛ هم مربی ها از هم جدا می مانند."
              >
                <Button variant="subtle" onClick={() => setMedalRainOpen(true)}>
                  <Plus size={16} aria-hidden />
                  چیدمان باران مدال
                </Button>
              </ActionCard>
              <ActionCard
                icon={PencilRuler}
                title="جدول دستی"
                desc="بدون فایل اکسل، جدول خالی ۲ تا ۶۴ نفره بساز؛ اسامی و مربی ها را روی خانه ها می نویسی و زمین و ساعت خودت می دهی."
              >
                <Button variant="subtle" onClick={() => setManualOpen(true)}>
                  <Plus size={16} aria-hidden />
                  جدول خالی بساز
                </Button>
              </ActionCard>
            </div>
            <ActionCard
              icon={Sparkles}
              title="امتحان با داده نمونه"
              desc="جدول های ۲ و ۴ و ۸ و ۱۶ و ۳۲ و ۶۴ نفره — هر اندازه را جدا امتحان کن، یا «همه انواع» را یکجا ببین. نمونه های «باران مدال» هم چند جدول ۴ نفره با رده بندی می سازند."
            >
              <div className="flex w-full flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
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
                {hasData && (
                  <p className="text-[11px] text-muted">
                    داده فعلی: {toFaDigits(participantCount)} هنرجو در {toFaDigits(drawList.length)} گروه —
                    نمونه جایگزین آن می شود
                  </p>
                )}
              </div>
            </ActionCard>
          </div>
        )}
        <ManualTableModal open={manualOpen} onClose={() => setManualOpen(false)} />
        <MedalRainModal open={medalRainOpen} onClose={() => setMedalRainOpen(false)} />
      </div>
    )
  }

  /* ———— داشبورد: وضعیت واقعی مسابقه و دسترسی سریع به بخش ها ———— */
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6 sm:mb-8">
        <h1 className="font-display text-3xl text-ink-900">داشبورد مسابقات</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          وضعیت فعلی داده ها و دسترسی سریع به بخش های قرعه کشی؛ ورود داده تازه از بخش «مدیریت داده
          ها» انجام می شود.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          {fileName && (
            <span
              className="max-w-full truncate rounded-full border border-line bg-surface px-3 py-1 text-muted"
              title={fileName}
            >
              فایل: {fileName}
            </span>
          )}
          {importedAt && (
            <span className="rounded-full border border-line bg-surface px-3 py-1 text-muted">
              ورود: {faDate(new Date(importedAt))}
            </span>
          )}
          {issueCount > 0 && (
            <span
              className="rounded-full border border-hogu-100 bg-hogu-100 px-3 py-1 font-medium text-hogu-700"
              title="ردیف هایی که در آخرین ورود کامل نبودند"
            >
              {toFaDigits(issueCount)} ردیف ناقص در آخرین ورود
            </span>
          )}
        </div>
      </header>

      <section aria-label="بخش های مسابقات">
        <div className="grid gap-3 sm:grid-cols-2">
          <ActionCard
            icon={LayoutGrid}
            title="گروه ها"
            desc={`${toFaDigits(drawList.length)} گروه وزنی در ${toFaDigits(ageCategoryCount)} رده سنی — ${toFaDigits(participantCount)} شرکت کننده`}
          >
            <Button variant="subtle" onClick={openGroups}>
              مشاهده گروه ها
            </Button>
          </ActionCard>
          <ActionCard
            icon={Trophy}
            title="قرعه و جدول مسابقات"
            desc="قرعه همه گروه ها کشیده شده است؛ چیدمان دستی، انتقال استراحت و شماره گذاری مسابقه ها روی تخته قرعه انجام می شود."
          >
            <Button variant="subtle" onClick={openBracketFromNav}>
              باز کردن تخته قرعه
            </Button>
          </ActionCard>
          <ActionCard
            icon={CalendarRange}
            title="برنامه زمین ها"
            desc={
              sessionCount > 0
                ? `${toFaDigits(sessionCount)} بازه زمانی ساخته شده — بازه ها، زمین ها و شماره گذاری مسابقه ها`
                : 'هنوز بازه زمانی ساخته نشده — با ساخت بازه ها، مسابقه ها بین زمین ها برنامه ریزی و شماره گذاری می شوند.'
            }
          >
            <Button variant="subtle" onClick={openSchedule}>
              برنامه ریزی زمین ها
            </Button>
          </ActionCard>
          <ActionCard
            icon={Printer}
            title="چاپ و خروجی ها"
            desc="برگه های چاپی A4 همه وزن ها با یک پیش نمایش، و خروجی PDF یا عکس تلگرامی برای ارسال سریع."
          >
            <Button
              variant="subtle"
              onClick={() => {
                window.location.hash = '#pdf-preview'
              }}
              title="پیش نمایش چاپ همه جدول ها"
            >
              <Printer size={16} aria-hidden />
              چاپ / پیش نمایش
            </Button>
            <Button
              variant="subtle"
              onClick={() => startExportJob({ kind: 'image', scope: 'all', groupId: null })}
              disabled={drawList.length === 0}
              title="دانلود عکس PNG همه جدول ها — بدون جدول نتایج، مناسب تلگرام"
            >
              <ImageDown size={16} aria-hidden />
              عکس همه
            </Button>
            <Button
              onClick={() => startExportJob({ kind: 'pdf', scope: 'all', groupId: null })}
              disabled={drawList.length === 0}
            >
              <FileDown size={16} aria-hidden />
              PDF همه
            </Button>
          </ActionCard>
        </div>
      </section>

      <section aria-label="مدیریت داده ها" className="mt-8">
        <h2 className="mb-3 font-display text-xl text-ink-900">مدیریت داده ها</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <ActionCard
            icon={FileSpreadsheet}
            title="فایل اکسل جدید"
            desc="فایل تازه همه داده ها و قرعه های فعلی را از نو می سازد."
          >
            <Button variant="subtle" onClick={() => setImportMode(true)}>
              بارگذاری فایل
            </Button>
          </ActionCard>
          <ActionCard
            icon={Medal}
            title="باران مدال"
            desc="چند جدول ۴ نفره با رده بندی؛ هم مربی ها از هم جدا می مانند."
          >
            <Button variant="subtle" onClick={() => setMedalRainOpen(true)}>
              <Plus size={16} aria-hidden />
              چیدمان باران مدال
            </Button>
          </ActionCard>
          <ActionCard
            icon={PencilRuler}
            title="جدول دستی"
            desc="جدول خالی ۲ تا ۶۴ نفره؛ اسامی را خودت روی خانه ها می نویسی."
          >
            <Button variant="subtle" onClick={() => setManualOpen(true)}>
              <Plus size={16} aria-hidden />
              جدول خالی بساز
            </Button>
          </ActionCard>
        </div>
      </section>

      <ManualTableModal open={manualOpen} onClose={() => setManualOpen(false)} />
      <MedalRainModal open={medalRainOpen} onClose={() => setMedalRainOpen(false)} />
    </div>
  )
}
