import { useEffect, useLayoutEffect, useRef, useState } from 'react'

interface FitTextProps {
  text: string
  /** اندازه اصلی فونت — اگر متن جا شد همین دیده می شود */
  baseSize: number
  /** کف اندازه؛ از این کوچک تر نمی شود و اگر باز هم جا نشود بریده می شود ولی هرگز «…» نمی گیرد */
  minSize?: number
  className?: string
  style?: React.CSSProperties
  title?: string
  /** چیدمان افقی متن — پیش فرض راست چین (RTL) */
  align?: 'right' | 'center'
}

/**
 * متن یک خطی که همیشه «کامل» دیده می شود: اگر نام در عرض خانه جا نشود، فونت
 * همان قدر کوچک می شود که تمام شود — به جای آن که با «…» بریده شود. اندازه با
 * یک اندازه گیری همگام پیش از رنگ آمیزی تنظیم می شود (پرش چشمی ندارد) و چون
 * نتیجه روی style خود عنصر می نشیند، در رستر خروجی عکس/PDF هم حفظ می شود.
 * پس از آماده شدن فونت ها یک بار دیگر اندازه گیری می شود تا اندازه با
 * ابعاد واقعی وزرمتن (نه فونت جایگزین لحظه نخست) بخورد.
 */
export function FitText({ text, baseSize, minSize = 7, className, style, title, align = 'right' }: FitTextProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [size, setSize] = useState(baseSize)
  const [fontTick, setFontTick] = useState(0)

  useEffect(() => {
    let alive = true
    document.fonts?.ready.then(() => {
      if (alive) setFontTick((tick) => tick + 1)
    })
    return () => {
      alive = false
    }
  }, [])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // اندازه گیری همیشه از اندازه اصلی شروع می شود
    el.style.fontSize = `${baseSize}px`
    const overflow = el.scrollWidth - el.clientWidth
    if (overflow <= 0 || el.clientWidth <= 0) {
      setSize(baseSize)
      return
    }
    const fitted = Math.max(minSize, Math.floor(((baseSize * el.clientWidth) / el.scrollWidth) * 2) / 2)
    setSize(fitted)
  }, [text, baseSize, minSize, fontTick])

  return (
    <span
      ref={ref}
      dir="rtl"
      className={`block w-full overflow-hidden whitespace-nowrap ${
        align === 'center' ? 'text-center' : 'text-right'
      } ${className ?? ''}`}
      style={{ fontSize: size, ...style }}
      title={title ?? text}
    >
      {text}
    </span>
  )
}
