import type { ComponentType } from 'react'

export interface SegmentedItem<T extends string> {
  key: T
  label: string
  icon?: ComponentType<{ size?: number | string }>
  /** عدد کوچک کنار برچسب — مثلا تعداد مسابقه های یک زمین */
  badge?: string | number
}

interface SegmentedProps<T extends string> {
  items: Array<SegmentedItem<T>>
  activeKey: T
  onChange: (key: T) => void
  ariaLabel?: string
  /** حالت روی زمینه تیره صفحه چاپ — کلاس های ظرف عوض می شوند */
  onDark?: boolean
}

/**
 * سوییچ یک انتخابی مشترک همه نوارهای تب برنامه: «حالت برنامه / جدولی»،
 * تب زمین های حالت جدولی و سه حالت صفحه چاپ. یک ظرف گرد و دکمه های هم عرض
 * با پس زمینه سرمه ای برای حالت فعال — همه جا یک شکل.
 */
export function Segmented<T extends string>({
  items,
  activeKey,
  onChange,
  ariaLabel,
  onDark = false,
}: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={
        onDark
          ? 'flex items-center gap-1 rounded-lg border border-line bg-turf p-1'
          : 'flex flex-wrap items-center gap-1 rounded-xl border border-line bg-surface p-1 shadow-sm'
      }
    >
      {items.map((item) => {
        const active = item.key === activeKey
        const Icon = item.icon
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? 'bg-ink-900 text-white shadow-sm' : 'text-muted hover:text-ink-900'
            }`}
          >
            {Icon && <Icon size={15} />}
            {item.label}
            {item.badge !== undefined && item.badge !== '' && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  active ? 'bg-white/20 text-white' : 'bg-turf text-muted'
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
