import { useEffect, useLayoutEffect, useRef, useState } from 'react'

interface FitTextProps {
  text: string
  /** اندازه اصلی فونت — اگر متن جا شد همین دیده می شود */
  baseSize: number
  /** کف اندازه تک خطی؛ از این کوچک تر حالت دوخطی می شود */
  minSize?: number
  className?: string
  style?: React.CSSProperties
  title?: string
  /** چیدمان افقی متن — پیش فرض راست چین (RTL) */
  align?: 'right' | 'center'
  /** اجازه شکستن به دو خط وقتی حتی کوچک ترین فونت تک خطی جا نشد — پیش فرض روشن */
  twoLine?: boolean
}

/** کف اندازه در حالت دوخطی — از این هم کوچک تر نشود */
const WRAP_FLOOR = 4.5

/**
 * متن که همیشه «کامل» دیده می شود — نام هنرجو هرگز با «…» بریده نمی شود و
 * هرگز از کادر بیرون نمی زند. سه فاز دارد:
 *  ۱. تک خطی با اندازه اصلی؛
 *  ۲. اگر جا نشد، فونت تا «minSize» کوچک می شود (همان رفتار قدیمی)؛
 *  ۳. اگر باز هم جا نشد و «twoLine» بود، متن شکسته و فونت تا جایی کوچک می شود
 *     که محتوای کامل در ارتفاع کادر بنشیند — نام کامل روی کاغذ می ماند تا داور
 *     از روی همان حکم بزند. اندازه با یک اندازه گیری همگام پیش از رنگ آمیزی
 *     تنظیم می شود (پرش چشمی ندارد) و چون نتیجه روی style خود عنصر می نشیند،
 *     در رستر خروجی عکس/PDF هم حفظ می شود. پس از آماده شدن فونت ها یک بار دیگر
 *     اندازه گیری می شود تا اندازه با ابعاد واقعی وزرمتن بخورد.
 */
export function FitText({
  text,
  baseSize,
  minSize = 7,
  className,
  style,
  title,
  align = 'right',
  twoLine = true,
}: FitTextProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [size, setSize] = useState(baseSize)
  const [wrap, setWrap] = useState(false)
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
    const parentHeight = el.parentElement?.clientHeight ?? 0
    // فاز ۱ و ۲ — تک خطی: اندازه گیری همیشه از اندازه اصلی شروع می شود
    el.style.whiteSpace = 'nowrap'
    el.style.fontSize = `${baseSize}px`
    const overflow = el.scrollWidth - el.clientWidth
    if (overflow <= 0 || el.clientWidth <= 0) {
      setSize(baseSize)
      setWrap(false)
      return
    }
    const fitted = Math.max(minSize, Math.floor(((baseSize * el.clientWidth) / el.scrollWidth) * 2) / 2)
    if (fitted >= minSize) {
      // اندازه یافته شده دوباره سنجیده می شود (کف به سمت پایین گرد شده است)
      el.style.fontSize = `${fitted}px`
      if (el.scrollWidth - el.clientWidth <= 0) {
        setSize(fitted)
        setWrap(false)
        return
      }
    }
    if (!twoLine) {
      // تک خطی می ماند — کوچک ترین اندازه مجاز؛ هیچ وقت نمی شکند
      setSize(minSize)
      setWrap(false)
      return
    }
    // فاز ۳ — دوخطی: متن می شکند و فونت تا جایی کوچک می شود که ارتفاع محتوای
    // شکسته شده در ارتفاع کادر بنشیند (ردیف های خودرشد با دو خط بالا می روند)
    let candidate = minSize
    let settled: number | null = null
    while (candidate >= WRAP_FLOOR) {
      el.style.fontSize = `${candidate}px`
      el.style.whiteSpace = 'normal'
      const fitsWidth = el.scrollWidth <= el.clientWidth
      const fitsHeight = parentHeight <= 0 || el.scrollHeight <= parentHeight + 1
      if (fitsWidth && fitsHeight) {
        settled = candidate
        break
      }
      candidate -= 0.5
    }
    setSize(settled ?? WRAP_FLOOR)
    setWrap(true)
  }, [text, baseSize, minSize, fontTick, twoLine])

  return (
    <span
      ref={ref}
      dir="rtl"
      className={`block w-full overflow-hidden ${
        wrap ? 'whitespace-normal' : 'whitespace-nowrap'
      } ${align === 'center' ? 'text-center' : 'text-right'} ${className ?? ''}`}
      style={{
        fontSize: size,
        ...(wrap ? { lineHeight: 1.15, overflowWrap: 'break-word' } : {}),
        ...style,
      }}
      title={title ?? text}
    >
      {text}
    </span>
  )
}
