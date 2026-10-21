import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  ExternalLink,
  FileDown,
  ImageDown,
  Info,
  LayoutGrid,
  List,
  Plus,
  Printer,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import type { GroupDraw, Participant } from '../../core/types.ts'
import { FitText } from '../../components/FitText.tsx'
import {
  scheduleSideLabel,
  seqRangeLabel,
  sheetScheduleNote,
  winnerLabelPending,
  type BuiltSchedule,
  type ScheduleMat,
  type ScheduledMat,
  type ScheduledSession,
  type ScheduleSession,
} from '../../core/schedule/schedule.ts'
import { useTournament, type TournamentMeta } from '../../store/tournamentStore.ts'
import { useScheduleModel } from '../../lib/hooks.ts'
import { Button } from '../../components/Button.tsx'
import { Segmented } from '../../components/Segmented.tsx'
import { EmptyState } from '../../components/EmptyState.tsx'
import { BusyOverlay } from '../../components/ExportChrome.tsx'
import { OFFSCREEN_MOUNT_STYLE } from '../../components/offscreenMount.ts'
import { toEnDigits, toFaDigits, groupTitle, renderWeightTitle } from '../../lib/formatFa.ts'
import { roundLabel } from '../../lib/roundLabels.ts'
import { beltColorFor } from '../../lib/beltColor.ts'
import { compareByWeightLabel } from '../../lib/weightSorting.ts'
import { realMatchCount, groupOptionLabel } from '../../lib/drawStats.ts'
import { sideTheme } from '../bracket/sideColors.ts'
import { coachRowsOf } from '../../lib/coachRows.ts'
import { CoachRoster } from '../bracket/CoachRoster.tsx'
import { ScheduleSheet } from './ScheduleSheet.tsx'
import { exportScheduleBundlePdf, exportScheduleImage, exportScheduleToPdf } from './exportSchedule.ts'
import { BracketSheet } from '../pdf/BracketSheet.tsx'
import { exportImageFromElement, imageBaseName } from '../pdf/exportGroupImage.ts'

export function SchedulePage() {
  const draws = useTournament((state) => state.draws)
  const meta = useTournament((state) => state.meta)
  const scheduleSessions = useTournament((state) => state.scheduleSessions)
  const openGroups = useTournament((state) => state.openGroups)
  const addScheduleSession = useTournament((state) => state.addScheduleSession)
  const removeScheduleSession = useTournament((state) => state.removeScheduleSession)
  const updateScheduleSession = useTournament((state) => state.updateScheduleSession)
  const addScheduleMat = useTournament((state) => state.addScheduleMat)
  const removeScheduleMat = useTournament((state) => state.removeScheduleMat)
  const updateScheduleMat = useTournament((state) => state.updateScheduleMat)
  const toggleScheduleGroup = useTournament((state) => state.toggleScheduleGroup)
  const moveScheduleMat = useTournament((state) => state.moveScheduleMat)
  const matchNumberOverrides = useTournament((state) => state.matchNumberOverrides)

  // دو نمای صفحه برنامه ریزی: «برنامه» (ویرایشگر بازه/زمین) و «جدولی»
  // (برگه های قرعه وزن های داخل برنامه، به ترتیب زمین بندی)
  const [view, setView] = useState<'plan' | 'tables'>('plan')
  const [exporting, setExporting] = useState<null | 'png' | 'pdf' | 'png-tables' | 'pdf-tables' | 'sheet-image'>(null)
  // تب فعال «حالت جدولی» — برای خروجی جداگانه هر زمین بالای صفحه نگه داشته می شود
  const [activeTabKey, setActiveTabKey] = useState<string | null>(null)
  // برگه ای که دکمه «خروجی عکس» خودش را زده — آفسکرین مونت و PNG می شود
  const [imageSheet, setImageSheet] = useState<ScheduledSheetInfo | null>(null)

  const drawList = useMemo(() => Object.values(draws), [draws])

  // مدل زنده برنامه — یک بار buildSchedule و سه نقشه شماره از همان
  const { participantsById, built, matchNumbers, manualNumbers, planNumbers } = useScheduleModel()

  const assigned = useMemo(() => new Set(built.assignedGroupIds), [built])

  const { available, zeroMatch } = useMemo(() => {
    const ageOrder = new Map(drawList.map((draw, index) => [draw.group.ageCategory, index]))
    const byOrder = (a: GroupDraw, b: GroupDraw) =>
      (ageOrder.get(a.group.ageCategory) ?? 0) - (ageOrder.get(b.group.ageCategory) ?? 0) ||
      compareByWeightLabel(a.group.weightCategory, b.group.weightCategory)
    return {
      available: drawList
        .filter((draw) => !assigned.has(draw.groupId) && realMatchCount(draw) > 0)
        .sort(byOrder),
      zeroMatch: drawList
        .filter((draw) => !assigned.has(draw.groupId) && realMatchCount(draw) === 0)
        .sort(byOrder),
    }
  }, [drawList, assigned])

  const unassignedLabels = useMemo(
    () =>
      drawList
        .filter((draw) => !assigned.has(draw.groupId) && realMatchCount(draw) > 0)
        .map((draw) => groupOptionLabel(draw)),
    [drawList, assigned],
  )

  // شماره های تکراری بین شماره مؤثر (دستی روی برنامه مقدم است) — چون شماره گذاری
  // هر زمین مستقل است، مقایسه فقط داخل همان زمین معنا دارد
  const duplicateNumbers = useMemo(() => {
    const counts = new Map<string, number>()
    for (const scheduledSession of built.sessions) {
      for (const scheduledMat of scheduledSession.mats) {
        for (const weight of scheduledMat.weights) {
          for (const match of weight.matches) {
            const manual = matchNumberOverrides[weight.groupId]?.[match.matchId]
            const raw = manual && manual.trim() ? manual : String(match.seq)
            const digits = toEnDigits(raw).replace(/\D/g, '')
            const base = digits || raw.trim()
            const key = `${scheduledSession.session.id}/${scheduledMat.mat.id}/${base}`
            counts.set(key, (counts.get(key) ?? 0) + 1)
          }
        }
      }
    }
    return [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key.split('/').pop() ?? key)
  }, [built, matchNumberOverrides])

  /** برگه های جدولی وزن های داخل برنامه — به ترتیب بازه زمانی و زمین */
  const scheduledTabs = useMemo(() => {
    const tabs: ScheduledTab[] = []
    built.sessions.forEach((scheduled, sessionIndex) => {
      scheduled.mats.forEach((mat) => {
        const sheets: ScheduledSheetInfo[] = []
        mat.weights.forEach((weight) => {
          const draw = draws[weight.groupId]
          if (!draw) return
          sheets.push({
            groupId: weight.groupId,
            draw,
            note: sheetScheduleNote(mat.mat.label, scheduled.session),
            matLabel: mat.mat.label,
            attendTime: scheduled.session.timeFrom,
          })
        })
        if (sheets.length === 0) return
        const multiSession = built.sessions.length > 1
        tabs.push({
          key: `${scheduled.session.id}/${mat.mat.id}`,
          label: multiSession
            ? `${mat.mat.label} — بازه ${toFaDigits(sessionIndex + 1)}`
            : mat.mat.label,
          matchCount: mat.matchCount,
          sheets,
        })
      })
    })
    return tabs
  }, [built, draws])

  const scheduledSheets = useMemo(
    () => scheduledTabs.flatMap((tab) => tab.sheets),
    [scheduledTabs],
  )

  /** برگه های تب فعال «حالت جدولی» — خروجی عکس/PDF بالای صفحه همین ها را می گیرد */
  const activeTabSheets = useMemo(() => {
    if (scheduledTabs.length <= 1) return scheduledSheets
    const active = scheduledTabs.find((tab) => tab.key === activeTabKey)
    return active ? active.sheets : scheduledSheets
  }, [scheduledTabs, scheduledSheets, activeTabKey])

  // off-screen sheet mount for the PNG / PDF export jobs
  useEffect(() => {
    if (!exporting) return
    let cancelled = false
    void (async () => {
      try {
        await document.fonts.ready
        if (exporting === 'png') {
          await exportScheduleImage(meta.title)
        } else if (exporting === 'pdf') {
          await exportScheduleToPdf(meta.title)
        } else if (exporting === 'pdf-tables') {
          await exportScheduleBundlePdf(meta.title, 'tables')
        } else if (exporting === 'png-tables') {
          const base = imageBaseName(meta.title)
          for (let index = 0; index < activeTabSheets.length; index += 1) {
            if (cancelled) return
            // the off-screen sheets mount with ids pdf-sheet-0..n (the visible
            // previews of the tables view use 1000+ so the ids never clash)
            const element = document.getElementById(`pdf-sheet-${index}`)
            if (!element) throw new Error('export sheet not found')
            const sheet = activeTabSheets[index]
            await exportImageFromElement(
              element,
              `${base} — ${renderWeightTitle(meta.sheetTitleFormat, {
                ageCategory: sheet.draw.group.ageCategory,
                weightCategory: sheet.draw.group.weightCategory,
                tournamentTitle: meta.title,
              })}`,
            )
            // مرورگر دانلودهای پشت سرهم را محدود می کند
            await new Promise((resolve) => window.setTimeout(resolve, 350))
          }
        } else if (exporting === 'sheet-image' && imageSheet) {
          const element = document.getElementById('pdf-sheet-5000')
          if (!element) throw new Error('single export sheet not found')
          await exportImageFromElement(
            element,
            `${imageBaseName(meta.title)} — ${renderWeightTitle(meta.sheetTitleFormat, {
              ageCategory: imageSheet.draw.group.ageCategory,
              weightCategory: imageSheet.draw.group.weightCategory,
              tournamentTitle: meta.title,
            })}`,
          )
        }
      } catch (error) {
        // keep the UI clean — but leave a trace for diagnostics
        console.error('schedule export failed', error)
      }
      if (!cancelled) {
        setExporting(null)
        setImageSheet(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [exporting, meta, activeTabSheets, imageSheet])

  const exportDisabled = scheduleSessions.length === 0 || built.totalMatches === 0

  return (
    <div className={view === 'tables' ? 'mx-auto w-full max-w-[1200px] px-6 py-10' : 'mx-auto w-full max-w-6xl px-6 py-10'}>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="subtle" onClick={openGroups} aria-label="بازگشت به گروه ها">
            <ChevronRight size={16} />
            گروه ها
          </Button>
          <div>
            <h1 className="font-display text-2xl leading-7 text-ink-900">برنامه ریزی زمین ها</h1>
            <p className="text-xs text-muted">
              بازه زمانی بسازید، وزن ها را بین زمین ها تقسیم کنید و شماره مسابقه ها خودکار بنشیند
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            ariaLabel="نمای صفحه برنامه ریزی"
            activeKey={view}
            onChange={setView}
            items={[
              { key: 'plan', label: 'حالت برنامه', icon: List },
              { key: 'tables', label: 'حالت جدولی', icon: LayoutGrid },
            ]}
          />
          <Button
            variant="subtle"
            disabled={exportDisabled}
            onClick={() => {
              window.location.hash = view === 'tables' ? '#schedule-print?mode=tables' : '#schedule-print?mode=plan'
            }}
          >
            <Printer size={16} />
            چاپ / پیش نمایش
          </Button>
          <Button
            variant="subtle"
            disabled={exportDisabled}
            onClick={() => setExporting(view === 'tables' ? 'png-tables' : 'png')}
          >
            <ImageDown size={16} />
            خروجی عکس
          </Button>
          <Button
            variant="subtle"
            disabled={exportDisabled}
            onClick={() => setExporting(view === 'tables' ? 'pdf-tables' : 'pdf')}
          >
            <FileDown size={16} />
            خروجی PDF
          </Button>
        </div>
      </header>

      {view === 'plan' && (
        <>
          <p className="mb-4 flex items-start gap-2 rounded-xl border border-mat-100 bg-mat-50 px-4 py-3 text-xs leading-6 text-ink-800">
            <Info size={15} className="mt-1 shrink-0 text-mat-600" />
            <span>
              شماره گذاری هر زمین مستقل است و از ۱ شروع می شود: در هر زمین اول دورِ اولِ همه وزن ها —
              از جدول پرمسابقه تر به کم مسابقه تر — شماره می خورد، بعد دوباره از جدول اول دورِ دوم و
              به همین ترتیب تا فینال؛ پس فینال ها همیشه آخرین شماره های همان زمین را می گیرند.
              شماره ها زنده روی دایره های برگه های قرعه هم می نشیند و برای تغییر دستی کافی است روی
              شماره هر مسابقه در همین صفحه، در «حالت جدولی» یا روی دایره داخل خود جدول کلیک کنید —
              شماره دستی همیشه بر برنامه مقدم است.
            </span>
          </p>

          {scheduleSessions.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="هنوز بازه ای ساخته نشده است"
              action={
                <Button onClick={addScheduleSession}>
                  <Plus size={16} />
                  افزودن اولین بازه زمانی
                </Button>
              }
            >
              مثلاً یک بازه «۸:۰۰ تا ۱۰:۰۰» بسازید، وزن های دلخواه را به زمین ۱ و زمین ۲ بدهید؛
              برنامه و شماره مسابقه ها همان جا ساخته می شود. برای بازه بعدی روز (مثلاً ۱۰ تا ۱۲)
              یک بازه جدید اضافه کنید.
            </EmptyState>
          ) : (
            <div className="space-y-5">
              {scheduleSessions.map((session, index) => {
                const scheduled = built.sessions.find((item) => item.session.id === session.id)
                return (
                  <SessionEditor
                    key={session.id}
                    session={session}
                    index={index}
                    scheduled={scheduled}
                    draws={draws}
                    built={built}
                    available={available}
                    zeroMatch={zeroMatch}
                    manualNumbers={manualNumbers}
                    onRemoveSession={() => {
                      const hasMatches = (scheduled?.matchCount ?? 0) > 0
                      if (!hasMatches || window.confirm('این بازه و زمین هایش حذف شود؟')) {
                        removeScheduleSession(session.id)
                      }
                    }}
                    onTimeChange={(patch) => updateScheduleSession(session.id, patch)}
                    onAddMat={() => addScheduleMat(session.id)}
                    onRemoveMat={(matId) => removeScheduleMat(session.id, matId)}
                    onMatLabel={(matId, label) => updateScheduleMat(session.id, matId, { label })}
                    onToggleGroup={(matId, groupId) => toggleScheduleGroup(session.id, matId, groupId)}
                    onMoveMat={(matId, direction) => moveScheduleMat(session.id, matId, direction)}
                  />
                )
              })}
              <Button variant="subtle" onClick={addScheduleSession} className="w-full border-dashed">
                <Plus size={16} />
                افزودن بازه زمانی جدید
              </Button>
            </div>
          )}
        </>
      )}

      {view === 'tables' && (
        <TablesView
          scheduledTabs={scheduledTabs}
          scheduledSheets={scheduledSheets}
          participantsById={participantsById}
          meta={meta}
          matchNumbers={matchNumbers}
          planNumbers={planNumbers}
          activeKey={activeTabKey}
          onActiveKeyChange={setActiveTabKey}
          onGoPlan={() => setView('plan')}
          onExportSheetImage={(sheet) => {
            setImageSheet(sheet)
            setExporting('sheet-image')
          }}
        />
      )}

      {unassignedLabels.length > 0 && (
        <p className="mt-6 rounded-xl border border-gold-600/30 bg-gold-50 px-4 py-3 text-xs leading-6 text-ink-800">
          خارج از برنامه (به هیچ زمینی اختصاص نیافته): {unassignedLabels.join(' • ')}
        </p>
      )}

      {duplicateNumbers.length > 0 && (
        <p className="mt-3 rounded-xl border border-gold-600/30 bg-gold-50 px-4 py-3 text-xs leading-6 text-ink-800">
          توجه: شماره {duplicateNumbers.map((key) => toFaDigits(key)).join('، ')} بیش از یک بار به کار
          رفته است — شماره های دستی را بازبینی کنید تا هیچ دو مسابقه ای هم شماره نشوند.
        </p>
      )}

      {exporting &&
        createPortal(
          <>
          {exporting === 'png-tables' || exporting === 'pdf-tables' || exporting === 'sheet-image' ? (
              <div id="sched-bracket-export" aria-hidden style={OFFSCREEN_MOUNT_STYLE}>
                {exporting === 'sheet-image' && imageSheet ? (
                  <BracketSheet
                    key={imageSheet.groupId}
                    draw={imageSheet.draw}
                    participantsById={participantsById}
                    meta={meta}
                    index={5000}
                    variant="image"
                    matchNumbers={matchNumbers}
                    matLabel={imageSheet.matLabel}
                    attendTime={imageSheet.attendTime}
                  />
                ) : (
                  activeTabSheets.map((sheet, index) => (
                    <BracketSheet
                      key={sheet.groupId}
                      draw={sheet.draw}
                      participantsById={participantsById}
                      meta={meta}
                      index={index}
                      variant={exporting === 'pdf-tables' ? 'print' : 'image'}
                      matchNumbers={matchNumbers}
                      matLabel={sheet.matLabel}
                      attendTime={sheet.attendTime}
                    />
                  ))
                )}
              </div>
            ) : (
              <div aria-hidden style={OFFSCREEN_MOUNT_STYLE}>
                <ScheduleSheet
                  schedule={built}
                  meta={meta}
                  unassignedLabels={unassignedLabels}
                  manualNumbers={manualNumbers}
                />
              </div>
            )}
            <BusyOverlay
              message={
                exporting === 'png'
                  ? 'در حال ساخت تصویر برنامه…'
                  : exporting === 'pdf'
                    ? 'در حال ساخت فایل PDF…'
                    : exporting === 'pdf-tables'
                      ? 'در حال ساخت فایل PDF جدول ها…'
                      : exporting === 'sheet-image'
                        ? 'در حال ساخت تصویر این جدول…'
                        : `در حال ساخت تصویرها (${toFaDigits(activeTabSheets.length)} جدول)…`
              }
            />
          </>,
          document.body,
        )}
    </div>
  )
}

interface ScheduledSheetInfo {
  groupId: string
  draw: GroupDraw
  note: string
  matLabel: string
  attendTime: string
}

interface ScheduledTab {
  key: string
  label: string
  matchCount: number
  sheets: ScheduledSheetInfo[]
}

interface TablesViewProps {
  scheduledTabs: ScheduledTab[]
  /** ترتیب سراسری برگه ها (همان ترتیب چاپ) — برای برچسب «جدول N» */
  scheduledSheets: ScheduledSheetInfo[]
  participantsById: Map<string, Participant>
  meta: TournamentMeta
  matchNumbers: Map<string, string>
  planNumbers: Map<string, string>
  /** تب فعال — در صفحه بالاتر نگه داشته می شود تا خروجی های بالای صفحه هم همان زمین را بگیرند */
  activeKey: string | null
  onActiveKeyChange: (key: string) => void
  onGoPlan: () => void
  onExportSheetImage: (sheet: ScheduledSheetInfo) => void
}

/**
 * نمای «جدولی»: برگه های قرعه وزن های داخل برنامه — به ترتیب بازه زمانی و
 * زمین، همان طور که چاپ می شوند — با شماره های زنده و بج های درشت «زمین/ساعت»
 * روی سربرگ. وقتی بیش از یک زمین در کار باشد، تب ها جابه جایی بین زمین ها را
 * ممکن می کنند (تب «همه» هم همه برگه ها را پشت سرهم نشان می دهد). دایره شماره
 * هر مسابقه همین جا قابل ویرایش است و بالای هر جدول دو دکمه سریع هست: خروجی
 * عکس همان جدول و فهرست مربی ها و هنرجوهای همان وزن.
 */
function TablesView({
  scheduledTabs,
  scheduledSheets,
  participantsById,
  meta,
  matchNumbers,
  planNumbers,
  activeKey,
  onActiveKeyChange,
  onGoPlan,
  onExportSheetImage,
}: TablesViewProps) {
  // نوار مربی های هر برگه — همیشه حداکثر یکی باز است
  const [coachOpenFor, setCoachOpenFor] = useState<string | null>(null)

  if (scheduledSheets.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="جدولی برای نمایش نیست"
        action={
          <Button onClick={onGoPlan}>
            <List size={16} />
            رفتن به حالت برنامه
          </Button>
        }
      >
        در «حالت برنامه» بازه زمانی بسازید و وزن ها را به زمین ها بدهید؛ آن وقت جدول های
        قرعه همان وزن ها — به ترتیب بازه و زمین و با شماره های زنده — این جا زیر هم می آیند.
      </EmptyState>
    )
  }

  const showTabs = scheduledTabs.length > 1
  const tabBar: ScheduledTab[] = showTabs
    ? [
        {
          key: 'all',
          label: 'همه',
          matchCount: scheduledTabs.reduce((sum, tab) => sum + tab.matchCount, 0),
          sheets: scheduledSheets,
        },
        ...scheduledTabs,
      ]
    : scheduledTabs
  const active = tabBar.find((tab) => tab.key === activeKey) ?? tabBar[0]
  const visibleSheets = active.key === 'all' ? scheduledSheets : active.sheets

  // شماره سراسری هر برگه برای برچسب «جدول N» — مستقل از تب فعال، همان ترتیب چاپ
  const sheetOrdinal = new Map<string, number>()
  scheduledSheets.forEach((sheet, index) => sheetOrdinal.set(sheet.groupId, index))

  return (
    <div className="space-y-6">
      <p className="flex items-start gap-2 rounded-xl border border-mat-100 bg-mat-50 px-4 py-3 text-xs leading-6 text-ink-800">
        <Info size={15} className="mt-1 shrink-0 text-mat-600" />
        <span>
          این ها همان جدول های قرعه وزن های داخل برنامه اند — به ترتیب بازه زمانی و زمین، با
          شماره های زنده مسابقه ها و بج درشت «زمین» و «ساعت» روی سربرگ هر برگه. شماره هر مسابقه
          همین جا هم قابل ویرایش است: روی دایره شماره کلیک کنید، عدد دستی بزنید و Enter بزنید
          (Escape یا پاک کردن یعنی بازگشت به شماره برنامه). دکمه «خروجی عکس» کنار هر جدول، تصویر
          PNG همان برگه را جدا می دهد؛ اگر زمین ها چند تا باشند، خروجی های بالای صفحه فقط برگه های
          تب فعال را می گیرند.
        </span>
      </p>

      {showTabs && (
        <Segmented
          ariaLabel="انتخاب زمین در حالت جدولی"
          activeKey={active.key}
          onChange={onActiveKeyChange}
          items={tabBar.map((tab) => ({
            key: tab.key,
            label: tab.label,
            badge: toFaDigits(tab.matchCount),
          }))}
        />
      )}

      {visibleSheets.map((sheet) => {
        const belt = beltColorFor(sheet.groupId)
        const ordinal = (sheetOrdinal.get(sheet.groupId) ?? 0) + 1
        const coachOpen = coachOpenFor === sheet.groupId
        const rows = coachRowsOf(sheet.draw, participantsById)
        return (
          <div
            key={sheet.groupId}
            className="rounded-2xl border border-line bg-surface p-3 shadow-sm"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2 px-1">
              <span className="rounded-md bg-ink-900 px-2 py-0.5 text-[11px] font-bold text-white">
                جدول {toFaDigits(ordinal)}
              </span>
              <BeltDot hex={belt.hex} needsBorder={belt.needsBorder} />
              <span className="text-sm font-bold text-ink-900">
                {renderWeightTitle(meta.sheetTitleFormat, {
                  ageCategory: sheet.draw.group.ageCategory,
                  weightCategory: sheet.draw.group.weightCategory,
                  tournamentTitle: meta.title,
                })}
              </span>
              <span className="text-[11px] text-muted">{sheet.note}</span>
              <span className="flex-1" />
              <SheetChipButton
                onClick={() => setCoachOpenFor(coachOpen ? null : sheet.groupId)}
                pressed={coachOpen}
                title="هر مربی چند هنرجو در این وزن دارد — با وزن هر هنرجو"
              >
                <Users size={13} />
                مربی ها و هنرجوها
              </SheetChipButton>
              <SheetChipButton
                onClick={() => onExportSheetImage(sheet)}
                title="دانلود تصویر PNG همین جدول — مناسب تلگرام"
              >
                <ImageDown size={13} />
                خروجی عکس
              </SheetChipButton>
              <SheetChipButton
                onClick={() => {
                  window.location.hash = `#pdf-preview/${sheet.groupId}`
                }}
                title="پیش نمایش چاپ و خروجی های همین جدول"
              >
                <ExternalLink size={13} />
                چاپ این جدول
              </SheetChipButton>
            </div>

            {coachOpen && (
              <div className="mb-3 rounded-xl border border-line bg-turf px-3 py-2.5">
                <CoachRoster
                  rows={rows}
                  layout="strip"
                  emptyText="هنرجویی برای این وزن ثبت نشده است."
                />
              </div>
            )}

            <div data-sched-bracket className="flex justify-center overflow-auto">
              <BracketSheet
                draw={sheet.draw}
                participantsById={participantsById}
                meta={meta}
                index={999 + ordinal}
                matchNumbers={matchNumbers}
                planNumbers={planNumbers}
                editableNumbers
                matLabel={sheet.matLabel}
                attendTime={sheet.attendTime}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** مربع رنگی کوچک کنار نام وزن — رنگ کمربندی گروه، با خط دور برای رنگ روشن */
function BeltDot({ hex, needsBorder }: { hex: string; needsBorder?: boolean }) {
  return (
    <span
      aria-hidden
      className="size-2.5 rounded-[3px]"
      style={{
        backgroundColor: hex,
        boxShadow: needsBorder ? 'inset 0 0 0 1px #b9c5d6' : undefined,
      }}
    />
  )
}

/** دکمه کوچک متنی نوار بالای هر جدول در حالت جدولی */
function SheetChipButton({
  onClick,
  pressed,
  title,
  children,
}: {
  onClick: () => void
  pressed?: boolean
  title: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-mat-700 transition-colors hover:bg-turf"
      title={title}
    >
      {children}
    </button>
  )
}

interface SessionEditorProps {
  session: ScheduleSession
  index: number
  scheduled: ScheduledSession | undefined
  draws: Record<string, GroupDraw>
  built: BuiltSchedule
  available: GroupDraw[]
  zeroMatch: GroupDraw[]
  manualNumbers: Map<string, string>
  onRemoveSession: () => void
  onTimeChange: (patch: { timeFrom?: string; timeTo?: string }) => void
  onAddMat: () => void
  onRemoveMat: (matId: string) => void
  onMatLabel: (matId: string, label: string) => void
  onToggleGroup: (matId: string, groupId: string) => void
  onMoveMat: (matId: string, direction: -1 | 1) => void
}

function SessionEditor({
  session,
  index,
  scheduled,
  draws,
  built,
  available,
  zeroMatch,
  manualNumbers,
  onRemoveSession,
  onTimeChange,
  onAddMat,
  onRemoveMat,
  onMatLabel,
  onToggleGroup,
  onMoveMat,
}: SessionEditorProps) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-ink-900 px-2.5 py-1 text-xs font-bold text-white">
          بازه {toFaDigits(index + 1)}
        </span>
        <Clock size={14} className="text-muted" />
        <input
          value={session.timeFrom}
          onChange={(event) => onTimeChange({ timeFrom: event.target.value })}
          placeholder="از — ۸:۰۰"
          className="w-28 rounded-lg border border-line bg-turf px-2.5 py-1.5 text-center text-sm text-ink-900 placeholder:text-muted/60 focus:border-mat-600 focus:bg-surface focus:outline-none"
        />
        <span className="text-xs text-muted">تا</span>
        <input
          value={session.timeTo}
          onChange={(event) => onTimeChange({ timeTo: event.target.value })}
          placeholder="۱۰:۰۰"
          className="w-24 rounded-lg border border-line bg-turf px-2.5 py-1.5 text-center text-sm text-ink-900 placeholder:text-muted/60 focus:border-mat-600 focus:bg-surface focus:outline-none"
        />
        <span aria-hidden className="mx-1 h-5 w-px bg-line" />
        <span className="text-xs text-muted">
          {(scheduled?.matchCount ?? 0) > 0 && `${toFaDigits(scheduled?.matchCount ?? 0)} مسابقه`}
        </span>
        <span className="flex-1" />
        <button
          onClick={onRemoveSession}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-hogu-100 hover:text-hogu-600"
          title="حذف این بازه"
        >
          <Trash2 size={14} />
          حذف بازه
        </button>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {session.mats.map((mat, matIndex) => (
          <MatEditor
            key={mat.id}
            mat={mat}
            scheduledMat={scheduled?.mats.find((item) => item.mat.id === mat.id)}
            draws={draws}
            built={built}
            available={available}
            zeroMatch={zeroMatch}
            manualNumbers={manualNumbers}
            canRemove={session.mats.length > 1}
            canMoveUp={matIndex > 0}
            canMoveDown={matIndex < session.mats.length - 1}
            onMove={(direction) => onMoveMat(mat.id, direction)}
            onRemove={() => onRemoveMat(mat.id)}
            onLabel={(value) => onMatLabel(mat.id, value)}
            onToggleGroup={(groupId) => onToggleGroup(mat.id, groupId)}
          />
        ))}
      </div>

      <button
        onClick={onAddMat}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong px-3 py-2 text-xs font-medium text-muted transition-colors hover:border-mat-600 hover:text-mat-700"
      >
        <Plus size={14} />
        افزودن زمین
      </button>
    </div>
  )
}

interface MatEditorProps {
  mat: ScheduleMat
  scheduledMat: ScheduledMat | undefined
  draws: Record<string, GroupDraw>
  built: BuiltSchedule
  available: GroupDraw[]
  zeroMatch: GroupDraw[]
  manualNumbers: Map<string, string>
  canRemove: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
  onLabel: (value: string) => void
  onToggleGroup: (groupId: string) => void
}

function MatEditor({
  mat,
  scheduledMat,
  draws,
  built,
  available,
  zeroMatch,
  manualNumbers,
  canRemove,
  canMoveUp,
  canMoveDown,
  onMove,
  onRemove,
  onLabel,
  onToggleGroup,
}: MatEditorProps) {
  return (
    <div className="rounded-lg border border-line bg-turf p-3">
      <div className="flex items-center gap-2">
        <span className="flex flex-col">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={!canMoveUp}
            aria-label="این زمین را بالاتر ببر — ترتیب شماره گذاری جلو می افتد"
            title="این زمین را بالاتر ببر — شماره گذاری اش جلو می افتد"
            className="text-muted transition-colors hover:text-mat-700 disabled:pointer-events-none disabled:opacity-25"
          >
            <ChevronUp size={13} />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={!canMoveDown}
            aria-label="این زمین را پایین تر ببر — ترتیب شماره گذاری عقب می افتد"
            title="این زمین را پایین تر ببر — شماره گذاری اش عقب می افتد"
            className="text-muted transition-colors hover:text-mat-700 disabled:pointer-events-none disabled:opacity-25"
          >
            <ChevronDown size={13} />
          </button>
        </span>
        <input
          value={mat.label}
          onChange={(event) => onLabel(event.target.value)}
          className="w-28 rounded-md border border-line bg-surface px-2 py-1 text-sm font-bold text-ink-900 focus:border-mat-600 focus:outline-none"
        />
        <span className="text-[11px] text-muted">
          {seqRangeLabel(scheduledMat?.firstSeq ?? null, scheduledMat?.lastSeq ?? null)}
          {(scheduledMat?.matchCount ?? 0) > 0 && ` • ${toFaDigits(scheduledMat?.matchCount ?? 0)} مسابقه`}
        </span>
        <span className="flex-1" />
        <button
          onClick={onRemove}
          disabled={!canRemove}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-hogu-100 hover:text-hogu-600 disabled:pointer-events-none disabled:opacity-35"
          title={canRemove ? 'حذف این زمین' : 'حداقل یک زمین لازم است'}
        >
          <Trash2 size={13} />
          حذف زمین
        </button>
      </div>

      {(mat.groupIds.length > 0 || available.length > 0 || zeroMatch.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {mat.groupIds.map((groupId) => {
            const draw = draws[groupId]
            if (!draw) return null
            return (
              <span
                key={groupId}
                className="flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-medium text-ink-800"
              >
                {toFaDigits(draw.group.ageCategory)} {toFaDigits(draw.group.weightCategory)}
                <button
                  onClick={() => onToggleGroup(groupId)}
                  className="text-muted transition-colors hover:text-hogu-600"
                  title="برداشتن این وزن از زمین"
                >
                  <X size={12} />
                </button>
              </span>
            )
          })}
          <select
            value=""
            onChange={(event) => {
              if (event.target.value) onToggleGroup(event.target.value)
              event.target.value = ''
            }}
            className="rounded-full border border-dashed border-line-strong bg-surface px-2.5 py-0.5 text-[11px] font-medium text-muted focus:border-mat-600 focus:outline-none"
          >
            <option value="">+ افزودن وزن…</option>
            {available.map((draw) => (
              <option key={draw.groupId} value={draw.groupId}>
                {groupOptionLabel(draw)}
              </option>
            ))}
            {zeroMatch.map((draw) => (
              <option key={draw.groupId} disabled>
                {groupTitle(draw.group.ageCategory, draw.group.weightCategory)} (بدون مسابقه)
              </option>
            ))}
          </select>
        </div>
      )}

      {(scheduledMat?.weights.length ?? 0) === 0 ? (
        <p className="mt-2 text-[11px] leading-5 text-muted">
          هنوز وزنی انتخاب نشده — با «افزودن وزن» مسابقه های این زمین شماره می خورند.
        </p>
      ) : (
        <div className="mt-1">
          {scheduledMat?.weights.map((weight) => (
            <div key={weight.groupId}>
              <div className="flex items-center gap-1.5 pb-1 pt-2">
                <BeltDot
                  hex={beltColorFor(weight.groupId).hex}
                  needsBorder={beltColorFor(weight.groupId).needsBorder}
                />
                <span className="text-[11.5px] font-bold text-ink-900">
                  {groupTitle(weight.ageCategory, weight.weightCategory)}
                </span>
                <span className="text-[10px] text-muted">({toFaDigits(weight.matchCount)} مسابقه)</span>
              </div>
              {weight.matches.map((match) => {
                const isFinal = !match.bronze && match.round === weight.roundCount
                return (
                  <div
                    key={match.matchId}
                    className="grid grid-cols-[34px_86px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1 border-b border-[#eef2f7] py-[3px]"
                  >
                    <SeqBadge
                      groupId={weight.groupId}
                      matchId={match.matchId}
                      autoSeq={match.seq}
                      isFinal={isFinal}
                    />
                    <FitText
                      text={match.bronze ? 'رده بندی' : roundLabel(match.round, weight.roundCount)}
                      baseSize={10}
                      minSize={7.5}
                      className="text-muted"
                    />
                    <SideCell
                      text={scheduleSideLabel(match.chong, weight.groupId, built.seqByKey, manualNumbers)}
                      accent={sideTheme.chong.accent}
                    />
                    <SideCell
                      text={scheduleSideLabel(match.hong, weight.groupId, built.seqByKey, manualNumbers)}
                      accent={sideTheme.hong.accent}
                    />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SideCell({ text, accent }: { text: string; accent: string }) {
  const pending = winnerLabelPending(text)
  return (
    <span className="flex min-w-0 items-center gap-1">
      <span aria-hidden className="size-[7px] shrink-0 rounded-[2px]" style={{ backgroundColor: accent }} />
      <FitText
        text={text}
        baseSize={pending ? 10 : 11}
        minSize={7.5}
        className={pending ? 'font-medium text-ink-500' : 'font-semibold text-ink-900'}
      />
    </span>
  )
}

/**
 * شماره قابل ویرایش هر مسابقه در فهرست برنامه: پیش فرض شماره خودکار برنامه را
 * نشان می دهد؛ با کلیک، به یک ورودی کوچک تبدیل می شود و عدد دستی جایگزین می کند
 * (در localStorage ذخیره می شود و روی دایره خودِ جدول هم همان دیده می شود).
 * پاک کردن ورودی و ثبت آن = بازگشت به شماره برنامه. حلقه کهربایی یعنی دستی.
 * رنگ بج (طلایی فینال / سرمه ای) از «matchChipTone» مشترک می آید.
 */
function SeqBadge({
  groupId,
  matchId,
  autoSeq,
  isFinal,
}: {
  groupId: string
  matchId: string
  autoSeq: number
  isFinal: boolean
}) {
  const override = useTournament((state) => state.matchNumberOverrides[groupId]?.[matchId])
  const setMatchNumber = useTournament((state) => state.setMatchNumber)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const manual = override !== undefined && override.trim() !== ''
  // نمایش همیشه رقم فارسی است؛ در حین ویرایش همان تایپ شده دیده می شود
  const display = manual ? toFaDigits(override) : toFaDigits(autoSeq)

  function commit() {
    setMatchNumber(groupId, matchId, draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        maxLength={4}
        dir="ltr"
        inputMode="numeric"
        autoComplete="off"
        aria-label="شماره دستی مسابقه"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit()
          if (event.key === 'Escape') setEditing(false)
        }}
        className="h-[21px] w-[30px] rounded-full border border-mat-600 bg-surface text-center text-[10px] font-bold text-ink-900 caret-mat-600 outline-none"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(display)
        setEditing(true)
      }}
      title={
        manual
          ? `شماره دستی (برنامه: ${toFaDigits(autoSeq)}) — برای تغییر کلیک کنید`
          : `شماره برنامه — برای تغییر دستی کلیک کنید`
      }
      className={`flex size-[21px] items-center justify-center rounded-full text-[10px] font-bold text-white transition-transform hover:scale-110 ${
        isFinal ? 'bg-gradient-to-br from-amber-400 to-amber-600' : 'bg-ink-700'
      }`}
      style={manual ? { boxShadow: '0 0 0 2px #f59e0b' } : undefined}
    >
      {display}
    </button>
  )
}
