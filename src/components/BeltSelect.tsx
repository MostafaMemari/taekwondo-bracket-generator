import { useState } from 'react'
import { X } from 'lucide-react'
import { CUSTOM_BELT, beltPresets, isPresetBelt } from '../lib/belts.ts'

interface BeltSelectProps {
  /** کمربند فعلی — خام؛ رشته خالی یعنی هیچ */
  value: string
  onChange: (value: string) => void
  /** برچسب گزینه خالی — «—» پیش فرض؛ در حالت جدولی «همراه بازه» می شود */
  emptyLabel?: string
  ariaLabel?: string
  title?: string
  /** کوچک = نوار جدولی حالت جدولی؛ بزرگ = سربرگ بازه کنار ساعت ها */
  size?: 'sm' | 'md'
}

const selectClass =
  'rounded-lg border border-line-strong bg-white font-medium text-ink-900 outline-none transition-colors focus:border-mat-600'

/**
 * انتخاب کمربند با select — کمربندهای آماده تکواندو به ترتیب رشد + گزینه
 * «دلخواه…» که یک ورودی تایپ آزاد باز می کند (هر کمربندی که لیست نداشته باشد).
 * هر وقت کمربندی انتخاب شده باشد یک دکمه ✕ کنارش هست که پاکش می کند.
 */
export function BeltSelect({
  value,
  onChange,
  emptyLabel = '—',
  ariaLabel = 'انتخاب کمربند',
  title,
  size = 'sm',
}: BeltSelectProps) {
  // وقتی کاربر از select «دلخواه…» را برمی گزیند ولی هنوز متنی ننوشته،
  // ورودی تایپ آزاد باز می شود؛ انتخاب کمربند آماده این حالت را می بندد
  const [customMode, setCustomMode] = useState(false)
  const customActive = customMode || (value.trim() !== '' && !isPresetBelt(value))
  const pad = size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'

  return (
    <span className="inline-flex items-center gap-1" title={title}>
      <select
        aria-label={ariaLabel}
        value={customActive ? CUSTOM_BELT : value}
        onChange={(event) => {
          const next = event.target.value
          if (next === CUSTOM_BELT) {
            setCustomMode(true)
            return
          }
          setCustomMode(false)
          onChange(next)
        }}
        className={`${selectClass} ${pad}`}
      >
        <option value="">{emptyLabel}</option>
        {beltPresets.map((belt) => (
          <option key={belt} value={belt}>
            {belt}
          </option>
        ))}
        <option value={CUSTOM_BELT}>دلخواه…</option>
      </select>
      {customActive && (
        <input
          autoFocus
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="کمربند دلخواه"
          maxLength={40}
          aria-label="کمربند دلخواه"
          className={`${selectClass} w-24 ${pad} placeholder:font-normal placeholder:text-slate-400`}
        />
      )}
      {value.trim() !== '' && (
        <button
          type="button"
          onClick={() => {
            setCustomMode(false)
            onChange('')
          }}
          aria-label="پاک کردن کمربند"
          title="پاک کردن کمربند"
          className="flex shrink-0 items-center rounded-md p-0.5 text-slate-400 transition-colors hover:bg-hogu-100 hover:text-hogu-600"
        >
          <X size={12} />
        </button>
      )}
    </span>
  )
}
