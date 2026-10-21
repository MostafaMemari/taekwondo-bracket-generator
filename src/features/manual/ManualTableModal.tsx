import { useState } from 'react'
import { X } from 'lucide-react'
import { useTournament } from '../../store/tournamentStore.ts'
import { toFaDigits } from '../../lib/formatFa.ts'
import { Button } from '../../components/Button.tsx'

/** اندازه های قابل انتخاب جدول دستی — به توان ۲ */
const SIZES = [2, 4, 8, 16, 32, 64]

function roundCountOf(size: number): number {
  return Math.round(Math.log2(size))
}

const fieldClass =
  'w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-sm font-medium text-ink-900 outline-none transition-colors focus:border-mat-600 placeholder:font-normal placeholder:text-slate-400'

interface ManualTableModalProps {
  open: boolean
  onClose: () => void
}

/**
 * پنجره «جدول دستی»: اندازه جدول خالی را انتخاب می کنی، اگر خواستی عنوان وزن
 * و زمین و ساعت می دهی و جدول خالی ساخته می شود. اسامی بعدا روی خود خانه های
 * بوم نوشته می شوند — زمین و ساعت هر وقت خواستی از بالای صفحه قرعه عوض می شود.
 */
export function ManualTableModal({ open, onClose }: ManualTableModalProps) {
  const createManualTable = useTournament((state) => state.createManualTable)
  const [size, setSize] = useState(8)
  const [title, setTitle] = useState('')
  const [matLabel, setMatLabel] = useState('')
  const [attendTime, setAttendTime] = useState('')

  if (!open) return null

  function create() {
    createManualTable({ size, title, matLabel, attendTime })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 px-4"
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-ink-900">جدول دستی</h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              جدول خالی می سازد؛ اسامی و مربی ها را خودت روی خانه ها می نویسی.
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

        <p className="mt-4 text-xs font-bold text-ink-800">نوع جدول</p>
        <div className="mt-2 grid grid-cols-6 gap-1.5">
          {SIZES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSize(value)}
              title={`${value} نفره`}
              aria-pressed={size === value}
              className={
                value === size
                  ? 'rounded-lg bg-mat-600 py-2 text-sm font-bold text-white transition-colors'
                  : 'rounded-lg border border-line-strong bg-surface py-2 text-sm font-medium text-ink-800 transition-colors hover:border-mat-600'
              }
            >
              {toFaDigits(value)}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-muted">
          جدول {toFaDigits(size)} نفره — {toFaDigits(size - 1)} مسابقه در{' '}
          {toFaDigits(roundCountOf(size))} دور
        </p>

        <div className="mt-4 grid gap-3">
          <label className="block">
            <span className="text-xs font-bold text-ink-800">عنوان وزن (اختیاری)</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="مثلا ۵۴-"
              maxLength={40}
              className={`${fieldClass} mt-1.5`}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
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
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button onClick={create}>ساخت جدول {toFaDigits(size)} نفره</Button>
          <Button variant="subtle" onClick={onClose}>
            انصراف
          </Button>
        </div>
      </div>
    </div>
  )
}
