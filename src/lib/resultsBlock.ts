/**
 * «جدول نتایج نهایی» برگه چاپ — مدل و اندازه از تنظیمات:
 *
 *  «مدل» شکل بلوک نتایج را تعیین می کند (رنگ ها همه از تم جدول می آیند):
 *  - جدولی (پیش فرض): جدول مرتب با سرستون «رتبه / نام و نام خانوادگی» و چهار
 *    ردیف با خط نقطه ای نوشتن — همان حالتی که از ت۳۸ تاکنون است.
 *  - کارت مدال: چهار کارت هم اندازه در چیدمان ۲×۲؛ هر کارت بج رتبه بالای خود
 *    دارد و خط نقطه ای نوشتن به کف کارت می چسبد.
 *  - خطی: ساده ترین حالت — چهار سطر «رتبه + خط نقطه ای بلند» بدون کادر داخلی؛
 *    کم جا ترین و تمیزترین حالت برای پرینت های شلوغ.
 *
 *  «اندازه» ارتفاع بلوک را تعیین می کند:
 *  - کوچک: ثابت ۱۱۲ کلاسیک / ۱۲۸ طرح های باندی — جمع ترین حالت.
 *  - معمولی (پیش فرض): ثابت ۱۴۱ کلاسیک / ۱۵۸ باندی — دقیقا همان ارتفاع همیشگی
 *    قبل از ت۳۹؛ پاسخ به «خیلی بزرگ شد».
 *  - درشت: کف + ۲۲ پیکسل؛ اگر برگه جا نداشته باشد بی سر و صدا همان معمولی می شود.
 *  - خودکار: رفتار ت۳۹ — تا جایی که برگه جا دارد بلند می شود (سقف کف + ۴۰).
 *
 *  اندازه های ثابت هیچ وقت از فضای آزاد برگه بیشتر نمی شوند (کف مطلق ۹۶ تا
 *  سرستون و چهار ردیف خوانا بماند). این فایل عمدا react ندارد تا در تست node
 *  هم لود شود.
 */

export type ResultsStyleId = 'table' | 'cards' | 'lines'

export interface ResultsStyleInfo {
  id: ResultsStyleId
  /** نام فارسی مدل — در تنظیمات */
  name: string
  /** توضیح یک خطی زیر نام در تنظیمات */
  hint: string
}

export const resultsStyles: readonly ResultsStyleInfo[] = [
  {
    id: 'table',
    name: 'جدولی',
    hint: 'سرستون رتبه / نام و نام خانوادگی با چهار ردیف خط نقطه ای — حالت همیشگی',
  },
  {
    id: 'cards',
    name: 'کارت مدال',
    hint: 'چهار کارت هم اندازه ۲×۲ با بج رتبه و خط نوشتن — حال و هوای سکو',
  },
  {
    id: 'lines',
    name: 'خطی',
    hint: 'چهار سطر «رتبه + خط نقطه ای بلند» — کم جا و ساده',
  },
]

const styleIds: ReadonlySet<string> = new Set(resultsStyles.map((style) => style.id))

/** مدل معتبر از store — مقدار نامعتبر/قدیمی بی درنگ جدولی می شود */
export function normalizeResultsStyleId(value: unknown): ResultsStyleId {
  return typeof value === 'string' && styleIds.has(value) ? (value as ResultsStyleId) : 'table'
}

export type ResultsSizeId = 'compact' | 'medium' | 'large' | 'auto'

export interface ResultsSizeInfo {
  id: ResultsSizeId
  /** نام فارسی اندازه — در تنظیمات */
  name: string
  /** توضیح یک خطی زیر نام در تنظیمات */
  hint: string
}

export const resultsSizes: readonly ResultsSizeInfo[] = [
  {
    id: 'compact',
    name: 'کوچک',
    hint: 'ثابت و جمع — برای برگه های شلوغ',
  },
  {
    id: 'medium',
    name: 'معمولی',
    hint: 'همان ارتفاع همیشگی — پیش فرض',
  },
  {
    id: 'large',
    name: 'درشت',
    hint: '۲۲ پیکسل بلندتر از معمولی — تا جایی که برگه جا دارد',
  },
  {
    id: 'auto',
    name: 'خودکار',
    hint: 'تا جایی که برگه جا دارد بلند می شود',
  },
]

const sizeIds: ReadonlySet<string> = new Set(resultsSizes.map((size) => size.id))

/** اندازه معتبر از store — مقدار نامعتبر/قدیمی بی درنگ معمولی می شود */
export function normalizeResultsSizeId(value: unknown): ResultsSizeId {
  return typeof value === 'string' && sizeIds.has(value) ? (value as ResultsSizeId) : 'medium'
}

/**
 * برچسب چهار رتبه بلوک نتایج — باران مدال (مسابقه رده بندی) رتبه ها را کامل
 * می کند: اول/دوم/سوم/چهارم؛ حالت عادی سومِ اولی «سوم» و دومی «سوم (مشترک)»
 * است (درخواست چاپ کاربر در ت۳۸).
 */
export function resultsRankLabels(withBronze: boolean): readonly [string, string, string, string] {
  return withBronze ? ['اول', 'دوم', 'سوم', 'چهارم'] : ['اول', 'دوم', 'سوم', 'سوم (مشترک)']
}

/**
 * هندسه ارتفاع بلوک نتایج — کالیبره شده با سنجش مرورگری ت۳۹
 * (scripts/t39-measure.mjs):
 *  - کف طبیعی = ۱۴۱ کلاسیک / ۱۵۸ طرح های باندی (مدرن و تشریفاتی)؛
 *  - «خودکار» = رفتار ت۳۹: تنگ ها همان طبیعی، جادارها تا کف + ۴۰؛
 *  - «معمولی» = همان طبیعیِ ثابت؛
 *  - «درشت» = طبیعی + ۲۲ و اگر برگه جا نداشت همان طبیعی؛
 *  - «کوچک» = ثابت ۱۱۲ / ۱۲۸ — هیچ وقت از فضای آزاد بیشتر نمی شود
 *    (کف مطلق ۹۶ تا سرستون و چهار ردیف خوانا بماند).
 */
const NATURAL_CLASSIC = 141
const NATURAL_BAND = 158
const COMPACT_CLASSIC = 112
const COMPACT_BAND = 128
const LARGE_EXTRA = 22
const AUTO_CAP_EXTRA = 40
const MIN_HEIGHT = 96
const BREATH = 8

export function resultsBlockHeight(
  size: ResultsSizeId,
  availableHeight: number,
  design: 'classic' | 'modern' | 'royal',
): number {
  const natural = design === 'classic' ? NATURAL_CLASSIC : NATURAL_BAND
  const roomy = availableHeight - BREATH
  if (size === 'medium') return natural
  if (size === 'auto') {
    if (roomy <= natural) return natural // برگه تنگ — دقیقا هندسه همیشگی
    return Math.min(Math.max(roomy, natural + 2), natural + AUTO_CAP_EXTRA)
  }
  if (size === 'large') {
    return roomy >= natural + LARGE_EXTRA ? natural + LARGE_EXTRA : natural
  }
  // کوچک — ثابت؛ اگر برگه از این هم تنگ تر بود تا کف مطلق می فشریم
  const compact = design === 'classic' ? COMPACT_CLASSIC : COMPACT_BAND
  return Math.min(compact, Math.max(roomy, MIN_HEIGHT))
}
