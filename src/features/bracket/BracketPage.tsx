import { useEffect, useState } from 'react'
import {
  ChevronRight,
  Image as ImageIcon,
  Info,
  Printer,
  RotateCcw,
  Settings2,
  Shuffle,
  Trophy,
  Undo2,
  Users,
} from 'lucide-react'
import { useTournament, isManualGroupId } from '../../store/tournamentStore.ts'
import { useScheduleModel } from '../../lib/hooks.ts'
import { Button } from '../../components/Button.tsx'
import { beltColorFor } from '../../lib/beltColor.ts'
import { groupTitle } from '../../lib/formatFa.ts'
import { findSoloParticipant } from '../../lib/soloDraw.ts'
import { BracketCanvas } from './BracketCanvas.tsx'
import { CoachPanel } from './CoachPanel.tsx'

const headerFieldClass =
  'rounded-lg border border-line-strong bg-white px-2 py-1 text-xs font-medium text-ink-900 outline-none transition-colors focus:border-mat-600 placeholder:font-normal placeholder:text-slate-400'

export function BracketPage() {
  const draw = useTournament((state) =>
    state.selectedGroupId ? state.draws[state.selectedGroupId] : undefined,
  )
  const openGroups = useTournament((state) => state.openGroups)
  const undoMove = useTournament((state) => state.undoMove)
  const resetGroupLayout = useTournament((state) => state.resetGroupLayout)
  const startExportJob = useTournament((state) => state.startExportJob)
  const setSettingsOpen = useTournament((state) => state.setSettingsOpen)
  const redrawGroup = useTournament((state) => state.redrawGroup)
  const manualTables = useTournament((state) => state.manualTables)
  const updateManualTableInfo = useTournament((state) => state.updateManualTableInfo)
  const medalRainTables = useTournament((state) => state.medalRainTables)
  const updateMedalRainInfo = useTournament((state) => state.updateMedalRainInfo)
  // the coach drawer floats OVER the canvas (closed by default) — the bracket
  // always keeps the full page width, even for 16/32 sheets
  const [coachPanelOpen, setCoachPanelOpen] = useState(false)

  // مدل زنده برنامه: نقشه شرکت کننده ها و شماره های زنده مسابقه ها
  const { participantsById, matchNumbers } = useScheduleModel()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (draw) undoMove(draw.groupId)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [draw, undoMove])

  useEffect(() => {
    if (!draw) openGroups()
  }, [draw, openGroups])

  if (!draw) return null

  const belt = beltColorFor(draw.groupId)
  const canUndo = draw.history.length > 0
  const solo =
    draw.structure.roundCount === 0 ? findSoloParticipant(draw, participantsById) : null
  const manualInfo = manualTables[draw.groupId]
  const medalInfo = medalRainTables[draw.groupId]
  const tableInfo = manualInfo ?? medalInfo

  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="subtle" onClick={openGroups} aria-label="بازگشت به گروه ها">
            <ChevronRight size={16} />
            گروه ها
          </Button>
          <span
            aria-hidden
            className="h-9 w-1.5 rounded-full"
            style={{ backgroundColor: belt.hex }}
          />
          <div>
            <h1 className="font-display text-2xl leading-7 text-ink-900">
              {groupTitle(draw.group.ageCategory, draw.group.weightCategory)}
            </h1>
            <p className="text-xs text-muted">تخته قرعه حذفی — چیدمان دستی با کشیدن کارت ها</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={coachPanelOpen ? 'primary' : 'subtle'}
            onClick={() => setCoachPanelOpen((open) => !open)}
            aria-pressed={coachPanelOpen}
            title="فهرست مربی ها و هنرجوهای این گروه به همراه برچسب استراحت ها — به صورت پنل شناور روی جدول"
          >
            <Users size={16} />
            مربی ها و هنرجوها
          </Button>
          <Button
            variant="subtle"
            onClick={() => setSettingsOpen(true)}
            title="عنوان و لوگوی سراسری مسابقات — برای همه جدول ها"
          >
            <Settings2 size={16} />
            تنظیمات سراسری
          </Button>
          <Button variant="subtle" onClick={() => undoMove(draw.groupId)} disabled={!canUndo}>
            <Undo2 size={16} />
            واگرد
          </Button>
          <Button variant="subtle" onClick={() => resetGroupLayout(draw.groupId)}>
            <RotateCcw size={16} />
            چیدمان اولیه
          </Button>
          {!isManualGroupId(draw.groupId) && (
            <Button
              variant="subtle"
              onClick={() => {
                if (
                  window.confirm(
                    'قرعه این جدول دوباره کشیده شود؟ چیدمان فعلی جای خود را به قرعه جدید می دهد.',
                  )
                ) {
                  redrawGroup(draw.groupId)
                }
              }}
              title="همان هنرجوها با چیدمان تازه — قواعد جدا ماندن مربی ها و اولویت استراحت سر جایش است"
            >
              <Shuffle size={16} />
              قرعه کشی دوباره
            </Button>
          )}
          <Button
            variant="subtle"
            onClick={() => {
              window.location.hash = `#pdf-preview/${draw.groupId}`
            }}
          >
            <Printer size={16} />
            چاپ / پیش نمایش
          </Button>
          <Button
            onClick={() => startExportJob({ kind: 'pdf', scope: 'single', groupId: draw.groupId })}
          >
            خروجی PDF
          </Button>
          <Button
            variant="subtle"
            onClick={() => startExportJob({ kind: 'image', scope: 'single', groupId: draw.groupId })}
            title="دانلود تصویر PNG این جدول برای ارسال در تلگرام — بدون جدول نتایج نهایی"
          >
            <ImageIcon size={16} />
            خروجی عکس
          </Button>
        </div>
      </header>

      {draw.structure.roundCount === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-line bg-surface px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-turf">
            <Trophy size={24} className="text-mat-600" />
          </span>
          {solo ? (
            <>
              <p className="font-display text-3xl text-ink-900">{solo.fullName}</p>
              <p className="text-sm text-muted">مربی: {solo.coachName}</p>
            </>
          ) : (
            <p className="text-sm font-bold text-ink-900">این گروه بدون شرکت کننده است.</p>
          )}
          <p className="max-w-md text-sm leading-7 text-ink-800">
            تنها شرکت کننده این دسته وزنی همین یک نفر است؛ بدون برگزاری مسابقه، به طور خودکار در
            رتبه نخست این وزن قرار می گیرد.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tableInfo ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-surface px-4 py-3">
              <p className="text-sm font-bold text-ink-900">
                {manualInfo ? 'چیدمان دستی' : 'باران مدال'}
              </p>
              <label className="flex items-center gap-1.5 text-xs text-muted">
                زمین
                <input
                  value={tableInfo.matLabel}
                  onChange={(event) =>
                    manualInfo
                      ? updateManualTableInfo(draw.groupId, { matLabel: event.target.value })
                      : updateMedalRainInfo(draw.groupId, { matLabel: event.target.value })
                  }
                  placeholder="مثلا زمین ۱"
                  maxLength={20}
                  className={`${headerFieldClass} w-28`}
                />
              </label>
              <label className="flex items-center gap-1.5 text-xs text-muted">
                ساعت
                <input
                  value={tableInfo.attendTime}
                  onChange={(event) =>
                    manualInfo
                      ? updateManualTableInfo(draw.groupId, { attendTime: event.target.value })
                      : updateMedalRainInfo(draw.groupId, { attendTime: event.target.value })
                  }
                  placeholder="مثلا ۸:۰۰"
                  maxLength={12}
                  className={`${headerFieldClass} w-20`}
                />
              </label>
              <p className="text-xs leading-5 text-muted">
                {manualInfo
                  ? 'روی هر خانه کلیک کن تا نام هنرجو و مربی را بنویسی؛ با کشیدن کارت ها جای دو نفر را عوض کن. زمین و ساعت روی سربرگ چاپ می نشیند.'
                  : 'چیدمان باران مدال ثبت شده؛ با کشیدن کارت ها جای دو نفر را عوض کن. زمین و ساعت روی سربرگ چاپ می نشیند.'}
              </p>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-xs leading-5 text-muted">
              <Info size={14} className="shrink-0" />
              اگر «برنامه ریزی زمین ها» ساخته باشد، شماره هر مسابقه خودش روی دایره کنار باکسش
              می نشیند؛ با کلیک روی دایره می توانید آن را دستی عوض کنید. کارت را بکشید و رها کنید
              تا جای دو نفر عوض شود.
            </p>
          )}
          <div className="relative">
            <BracketCanvas draw={draw} matchNumbers={matchNumbers} />
            {coachPanelOpen && (
              <CoachPanel
                draw={draw}
                participantsById={participantsById}
                onClose={() => setCoachPanelOpen(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
