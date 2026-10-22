/**
 * نوع قرعه کشی و چیدمان استراحت — دو انتخاب مستقل در تنظیمات:
 *
 *  «نوع قرعه کشی» قانون چیدن هنرجوها روی برگه را تعیین می کند:
 *  - جداسازی هم تیمی ها (پیش فرض): هر دو هنرجوی یک مربی اینور و اونور جدول
 *    می افتند؛ اگر مربی سه هنرجو در یک وزن داشته باشد دو نفرشان در نیمه
 *    نهایی به هم می خورند تا برنده به فینال برسد و نفر سوم در نیمه دیگر می
 *    نشیند؛ استراحت ها اول سراغ مربی ای می رود که بیشترین هنرجو را دارد.
 *  - کاملا تصادفی: فیش های هنرجوها بُر می خورد و با توجه به استراحت های
 *    برگه روی خانه ها می نشیند — هیچ قاعده مربی ای اعمال نمی شود.
 *
 *  «چیدمان استراحت» جای خانه های استراحت را تعیین می کند:
 *  - آینه ای دو طرف (پیش فرض): استراحت های هر نیمه حول وسط همان نیمه آینه
 *    می شوند — ۲ استراحت: یکی چپ یکی راست؛ ۵ استراحت: ۳ چپ و ۲ راست.
 *  - همیشه زیر اسم (قانون چهارگوشه): استراحت در هر جفت خانه پایین است — اسم
 *    بالا، استراحت زیر آن — و ترتیب نشستن استراحت ها روی برگه: اول بالای
 *    چپ، بعد بالای راست، بعد پایین چپ و پایین راست؛ استراحت های اضافی به
 *    سمت «اکثریت استراحت ها» می روند و از بالای همان سمت به وسط نیمه
 *    می نشینند.
 *
 *  «اکثریت استراحت ها» سمت ای است که در چیدمان «همیشه زیر اسم» استراحت های
 *  اضافی (پنجم به بعد) را می گیرد:
 *  - سمت راست (پیش فرض): ۵ استراحت → ۲ چپ و ۳ راست.
 *  - سمت چپ: ۵ استراحت → ۳ چپ و ۲ راست.
 *
 * هر سه انتخاب شخصی اند و با ورود فهرست جدید عوض نمی شوند؛ با تغییرشان همه
 * قرعه های واقعی و باران مدال از نو چیده می شود (جدول های دستی که اسامی
 * تایپی دارند دست نمی خورند).
 */

export type DrawTypeId = 'coachSeeded' | 'random'

export interface DrawTypeInfo {
  id: DrawTypeId
  /** نام فارسی — در تنظیمات */
  name: string
  /** توضیح یک خطی زیر نام در تنظیمات */
  hint: string
}

export const drawTypes: readonly DrawTypeInfo[] = [
  {
    id: 'coachSeeded',
    name: 'جداسازی هم تیمی ها',
    hint: 'دو هنرجوی یک مربی دو طرف جدول؛ سه نفر: دو نفر در نیمه نهایی، نفر سوم نیمه دیگر — استراحت با مربی پرشمار',
  },
  {
    id: 'random',
    name: 'کاملا تصادفی',
    hint: 'فیش ها بُر می خورد و با توجه به استراحت ها روی برگه می نشیند — بدون قاعده مربی',
  },
]

const drawTypeIds: ReadonlySet<string> = new Set(drawTypes.map((mode) => mode.id))

export function isDrawTypeId(value: unknown): value is DrawTypeId {
  return typeof value === 'string' && drawTypeIds.has(value)
}

/** نوع قرعه معتبر از store — مقدار نامعتبر/قدیمی بی درنگ پیش فرض می شود */
export function normalizeDrawTypeId(value: unknown): DrawTypeId {
  return isDrawTypeId(value) ? value : 'coachSeeded'
}

export type ByePlacementId = 'mirror' | 'belowName'

export interface ByePlacementInfo {
  id: ByePlacementId
  /** نام فارسی — در تنظیمات */
  name: string
  /** توضیح یک خطی زیر نام در تنظیمات */
  hint: string
}

export const byePlacements: readonly ByePlacementInfo[] = [
  {
    id: 'mirror',
    name: 'آینه ای دو طرف',
    hint: 'استراحت ها آینه حول وسط هر نیمه — ۲ استراحت: یکی چپ یکی راست؛ ۵ استراحت: ۳ چپ و ۲ راست',
  },
  {
    id: 'belowName',
    name: 'همیشه زیر اسم',
    hint: 'استراحت زیر اسم می نشیند — اول بالای چپ، بعد بالای راست، بعد پایین چپ و پایین راست؛ بعدی سمت اکثریت استراحت ها',
  },
]

export type ByeMajorityId = 'right' | 'left'

export interface ByeMajorityInfo {
  id: ByeMajorityId
  /** نام فارسی — در تنظیمات */
  name: string
  /** توضیح یک خطی زیر نام در تنظیمات */
  hint: string
}

export const byeMajoritySides: readonly ByeMajorityInfo[] = [
  {
    id: 'right',
    name: 'سمت راست',
    hint: 'استراحت های اضافی سمت راست می نشینند — ۵ استراحت: ۲ چپ و ۳ راست (پیش فرض)',
  },
  {
    id: 'left',
    name: 'سمت چپ',
    hint: 'استراحت های اضافی سمت چپ می نشینند — ۵ استراحت: ۳ چپ و ۲ راست',
  },
]

const byeMajorityIds: ReadonlySet<string> = new Set(byeMajoritySides.map((side) => side.id))

export function isByeMajorityId(value: unknown): value is ByeMajorityId {
  return typeof value === 'string' && byeMajorityIds.has(value)
}

/** اکثریت معتبر استراحت ها از store — مقدار نامعتبر/قدیمی بی درنگ پیش فرض می شود */
export function normalizeByeMajorityId(value: unknown): ByeMajorityId {
  return isByeMajorityId(value) ? value : 'right'
}

const byePlacementIds: ReadonlySet<string> = new Set(byePlacements.map((mode) => mode.id))

export function isByePlacementId(value: unknown): value is ByePlacementId {
  return typeof value === 'string' && byePlacementIds.has(value)
}

/** چیدمان معتبر از store — مقدار نامعتبر/قدیمی بی درنگ پیش فرض می شود */
export function normalizeByePlacementId(value: unknown): ByePlacementId {
  return isByePlacementId(value) ? value : 'mirror'
}
