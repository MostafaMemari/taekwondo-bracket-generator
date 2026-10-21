import { useMemo, useState } from 'react'
import { ClipboardPaste, Medal, Plus, Shuffle, Trash2, Trophy, X } from 'lucide-react'
import { useTournament } from '../../store/tournamentStore.ts'
import { toFaDigits } from '../../lib/formatFa.ts'
import { Button } from '../../components/Button.tsx'
import { FitText } from '../../components/FitText.tsx'
import {
  medalRainPoolSizes,
  splitMedalRainPools,
  type MedalRainPool,
} from '../../core/bracket/medalRain.ts'

const fieldClass =
  'w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-sm font-medium text-ink-900 outline-none transition-colors focus:border-mat-600 placeholder:font-normal placeholder:text-slate-400'

interface RowDraft {
  key: string
  fullName: string
  coachName: string
}

let rowSeq = 0
function blankRow(): RowDraft {
  rowSeq += 1
  return { key: `row-${rowSeq}`, fullName: '', coachName: '' }
}

/** «نام - مربی» یا «نام ، مربی» یا با تب — هر خط یک هنرجو */
function parseRosterLine(text: string): { fullName: string; coachName: string } {
  const dash = text.match(/^(.+?)\s+[-\u2010-\u2015]\s+(.+)$/)
  if (dash) return { fullName: dash[1].trim(), coachName: dash[2].trim() }
  const comma = text.split(/\s*[\u060C,]\s*/)
  if (comma.length >= 2 && comma[0].trim()) {
    return { fullName: comma[0].trim(), coachName: comma.slice(1).join(' ').trim() }
  }
  return { fullName: text.trim(), coachName: '' }
}

interface MedalRainModalProps {
  open: boolean
  onClose: () => void
}

/**
 * پنجره «باران مدال» — وزن را می دهی و برنامه هنرجوها را بین چند جدول ۴ نفره
 * (نیمه نهایی و فینال، با رده بندی) پخش می کند؛ هم مربی ها از هم جدا می مانند
 * و هم همه مدال می گیرند. چیدمان اول پیش نمایش دارد و با کلیک روی دو هنرجو
 * جای آنها سواپ می شود.
 */
export function MedalRainModal({ open, onClose }: MedalRainModalProps) {
  const createMedalRainTables = useTournament((state) => state.createMedalRainTables)
  const [title, setTitle] = useState('')
  const [matLabel, setMatLabel] = useState('')
  const [attendTime, setAttendTime] = useState('')
  const [bronze, setBronze] = useState(true)
  const [rows, setRows] = useState<RowDraft[]>([blankRow(), blankRow(), blankRow(), blankRow()])
  const [quickPaste, setQuickPaste] = useState('')
  const [quickPasteOpen, setQuickPasteOpen] = useState(false)
  const [pools, setPools] = useState<MedalRainPool[] | null>(null)
  const [selected, setSelected] = useState<{ pool: number; index: number } | null>(null)

  const filledRows = useMemo(
    () =>
      rows
        .filter((row) => row.fullName.trim().length > 0)
        .map((row) => ({ fullName: row.fullName.trim(), coachName: row.coachName.trim() })),
    [rows],
  )
  const sizes = medalRainPoolSizes(filledRows.length)
  const matchCount = sizes.reduce(
    (sum, size) => sum + size - 1 + (bronze && size === 4 ? 1 : 0),
    0,
  )
  const summary =
    filledRows.length === 0
      ? 'هنرجویی وارد نشده است'
      : `${toFaDigits(filledRows.length)} هنرجو → ${toFaDigits(sizes.length)} جدول (${sizes
          .map((size) => toFaDigits(size))
          .join(' + ')} نفره) • ${toFaDigits(matchCount)} مسابقه`

  function drawPools() {
    setPools(splitMedalRainPools(filledRows))
    setSelected(null)
  }

  function handleChipClick(pool: number, index: number) {
    if (!pools) return
    if (!selected) {
      setSelected({ pool, index })
      return
    }
    if (selected.pool === pool && selected.index === index) {
      setSelected(null)
      return
    }
    const next = pools.map((entry) => ({ ...entry, athletes: [...entry.athletes] }))
    const first = next[selected.pool].athletes[selected.index]
    next[selected.pool].athletes[selected.index] = next[pool].athletes[index]
    next[pool].athletes[index] = first
    setPools(next)
    setSelected(null)
  }

  function applyQuickPaste() {
    const parsed: RowDraft[] = []
    for (const line of quickPaste.split(/\n+/)) {
      const text = line.trim()
      if (!text) continue
      const { fullName, coachName } = parseRosterLine(text)
      if (!fullName) continue
      const row = blankRow()
      row.fullName = fullName
      row.coachName = coachName
      parsed.push(row)
    }
    if (parsed.length > 0) {
      setRows(parsed)
      setPools(null)
      setQuickPasteOpen(false)
      setQuickPaste('')
    }
  }

  function create() {
    const finalPools = (pools ?? splitMedalRainPools(filledRows)).map((pool) =>
      pool.athletes.map((athlete) => ({ fullName: athlete.fullName, coachName: athlete.coachName })),
    )
    if (finalPools.length === 0) return
    createMedalRainTables({ title, matLabel, attendTime, bronze, pools: finalPools })
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 px-4 py-6"
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-6 pb-4">
          <div>
            <h2 className="flex items-center gap-2 font-display text-2xl text-ink-900">
              <Medal size={22} className="text-mat-600" />
              باران مدال
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              همه مدال می گیرند — هنرجوها بین چند جدول ۴ نفره (نیمه نهایی و فینال) پخش می شوند و
              هم مربی ها به جدول های جدا می روند.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            title="بستن"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ink-900/5 hover:text-ink-900"
          >
            <X size={17} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-2">
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs font-bold text-ink-800">عنوان وزن</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="مثلا ۵۴-"
                maxLength={40}
                className={`${fieldClass} mt-1.5`}
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-ink-800">زمین (اختیاری)</span>
              <input
                value={matLabel}
                onChange={(event) => setMatLabel(event.target.value)}
                placeholder="مثلا زمین ۱"
                maxLength={20}
                className={`${fieldClass} mt-1.5`}
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-ink-800">ساعت (اختیاری)</span>
              <input
                value={attendTime}
                onChange={(event) => setAttendTime(event.target.value)}
                placeholder="مثلا ۸:۰۰"
                maxLength={12}
                className={`${fieldClass} mt-1.5`}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-ink-800">
              <input
                type="checkbox"
                checked={bronze}
                onChange={(event) => setBronze(event.target.checked)}
                className="size-4 accent-mat-600"
              />
              مبارزه رده بندی در جدول های ۴ نفره (هر هنرجو دو مبارزه)
            </label>
            <button
              type="button"
              onClick={() => setQuickPasteOpen((value) => !value)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-mat-600 transition-colors hover:bg-mat-50"
            >
              <ClipboardPaste size={14} />
              چسباندن سریع فهرست
            </button>
          </div>

          {quickPasteOpen && (
            <div className="rounded-xl border border-line bg-white p-3">
              <textarea
                value={quickPaste}
                onChange={(event) => setQuickPaste(event.target.value)}
                dir="rtl"
                rows={5}
                placeholder={'هر خط یک هنرجو:\nعلی احمدی - استاد رضایی\nمحمد کریمی ، استاد محمدی'}
                className={`${fieldClass} resize-y font-normal leading-6`}
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[11px] leading-4 text-muted">
                  نام و مربی را با خط تیره یا کاما جدا کن؛ مربی اختیاری است.
                </p>
                <Button variant="subtle" onClick={applyQuickPaste}>
                  افزودن فهرست
                </Button>
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold text-ink-800">
                هنرجوها و مربی ها — مربی اختیاری است
              </p>
              <button
                type="button"
                onClick={() => setRows((current) => [...current, blankRow()])}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-mat-600 transition-colors hover:bg-mat-50"
              >
                <Plus size={14} />
                افزودن هنرجو
              </button>
            </div>
            <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-line bg-white p-2.5">
              {rows.map((row, index) => (
                <div key={row.key} className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-center text-[11px] font-bold text-muted">
                    {toFaDigits(index + 1)}
                  </span>
                  <input
                    value={row.fullName}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((entry) =>
                          entry.key === row.key ? { ...entry, fullName: event.target.value } : entry,
                        ),
                      )
                    }
                    placeholder="نام هنرجو"
                    maxLength={60}
                    className={fieldClass}
                  />
                  <input
                    value={row.coachName}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((entry) =>
                          entry.key === row.key ? { ...entry, coachName: event.target.value } : entry,
                        ),
                      )
                    }
                    placeholder="نام مربی"
                    maxLength={40}
                    className={fieldClass}
                  />
                  <button
                    type="button"
                    onClick={() => setRows((current) => current.filter((entry) => entry.key !== row.key))}
                    aria-label="حذف هنرجو"
                    title="حذف این ردیف"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hogu-100 hover:text-hogu-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {rows.length === 0 && (
                <p className="py-4 text-center text-xs text-muted">
                  ردیفی نیست — با «افزودن هنرجو» شروع کن.
                </p>
              )}
            </div>
            <p className="mt-2 text-[11px] font-medium text-ink-700">{summary}</p>
          </div>

          {pools && pools.length > 0 && (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-ink-800">
                  پیش نمایش چیدمان — برای سواپ، روی دو هنرجو کلیک کن
                </p>
                <button
                  type="button"
                  onClick={drawPools}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-mat-600 transition-colors hover:bg-mat-50"
                >
                  <Shuffle size={14} />
                  قرعه جدید
                </button>
              </div>
              {selected && (
                <p className="mb-2 rounded-lg bg-mat-50 px-3 py-1.5 text-[11px] font-bold text-mat-700">
                  {pools[selected.pool]?.athletes[selected.index]?.fullName} انتخاب شد — حالا
                  هنرجوی دوم را کلیک کن
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {pools.map((pool, poolIndex) => (
                  <div key={poolIndex} className="rounded-xl border border-line bg-white p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-display text-base text-ink-900">
                        جدول {toFaDigits(poolIndex + 1)}
                      </p>
                      <span className="text-[11px] text-muted">
                        {toFaDigits(pool.athletes.length)} نفره
                      </span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {pool.athletes.map((athlete, index) => {
                        const isSelected =
                          selected?.pool === poolIndex && selected.index === index
                        return (
                          <button
                            key={`${poolIndex}-${index}`}
                            type="button"
                            onClick={() => handleChipClick(poolIndex, index)}
                            className={
                              isSelected
                                ? 'flex w-full items-center justify-between gap-2 rounded-lg border border-mat-600 bg-mat-50 px-2.5 py-1.5 text-right transition-colors'
                                : 'flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-right transition-colors hover:border-mat-600'
                            }
                          >
                            <span className="min-w-0 flex-1">
                              <FitText
                                text={athlete.fullName}
                                baseSize={12}
                                minSize={8.5}
                                className="font-bold text-ink-900"
                              />
                            </span>
                            {athlete.coachName && (
                              <span className="shrink-0 text-[10.5px] text-muted">
                                مربی: {athlete.coachName}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                    {pool.warnings.map((warning) => (
                      <p
                        key={warning}
                        className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10.5px] font-medium leading-4 text-amber-700"
                      >
                        {warning} — جدا کردن ممکن نبود
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 p-6 pt-4">
          <Button onClick={drawPools} disabled={filledRows.length === 0}>
            <Shuffle size={15} />
            چیدمان قرعه
          </Button>
          <Button onClick={create} disabled={filledRows.length === 0}>
            <Trophy size={15} />
            ساخت {toFaDigits(Math.max(sizes.length, 0))} جدول
          </Button>
          <Button variant="subtle" onClick={onClose}>
            انصراف
          </Button>
        </div>
      </div>
    </div>
  )
}
