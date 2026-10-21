import { createId } from '../id.ts'
import type { Participant, ParsedRoster } from '../types.ts'
import type { MedalRainRow } from '../bracket/medalRain.ts'

/**
 * داده نمونه امتحانی — فهرست های آماده برای دیدن انواع جدول بدون اکسل.
 * هر پیش مجموعه جایگزین کل داده می شود (همان مسیر importRoster)؛ ساخت
 * قرعه با همان generateGroupDraw انجام می شود تا دقیقا مثل داده واقعی
 * گروه بندی و بای ها و قانون استراحت مربی اعمال شود.
 */

const FIRST_NAMES = [
  'علی', 'محمد', 'رضا', 'حسین', 'امیرحسین', 'مهدی', 'آرش', 'سینا',
  'پویا', 'نیما', 'بهنام', 'کیان', 'آرمین', 'متین', 'سامان', 'بردیا',
  'پارسا', 'سهیل', 'رامین', 'بابک', 'دانیال', 'فرهاد', 'هیراد', 'ایمان',
  'سعید', 'امیر', 'بهزاد', 'پویان', 'رادین', 'آرین', 'کوروش', 'آرمان',
  'بهرام', 'سیاوش', 'فرزین', 'کاوه', 'مانی', 'هرمز', 'یاسین', 'یوسف',
]

const LAST_NAMES = [
  'احمدی', 'کریمی', 'مرادی', 'قاسمی', 'حسینی', 'رضایی', 'محمدی', 'نوری',
  'صادقی', 'رحیمی', 'کاظمی', 'رستمی', 'شریفی', 'یوسفی', 'اکبری', 'زارعی',
  'خسروی', 'امینی', 'سبحانی', 'محققی', 'توکلی', 'اسدی', 'جوادی', 'طاهری',
  'ملکی', 'فتحی', 'نادری', 'عزیزی', 'فرهادی', 'حیدری', 'موسوی', 'جعفری',
  'صفری', 'زمانی', 'برزگر', 'قنبری', 'لطفی', 'مهرابی', 'وفایی', 'هاشمی',
  'یزدانی', 'گلستانی', 'امیرخانی', 'جهانگیری',
]

/** ۱۰ مربی — تکرار چرخه ای تا هر مربی چند هنرجو داشته باشد (آزمون قانون استراحت مربی) */
const COACH_NAMES = [
  'استاد رضایی', 'استاد محمدی', 'استاد کریمی', 'استاد احمدی', 'استاد نوری',
  'استاد توکلی', 'استاد شریفی', 'استاد قاسمی', 'استاد هاشمی', 'استاد یزدانی',
]

interface SizeSpec {
  ageCategory: string
  weightCategory: string
  baseKg: number
}

/**
 * رده سنی و وزن هر اندازه — برچسب وزن ها عمدا متفاوت است تا در نمونه «همه
 * انواع» هر اندازه یک گروه جدا شود (کلید گروه = رده سنی + وزن).
 */
const SIZE_SPECS: Record<number, SizeSpec> = {
  2: { ageCategory: 'نونهالان', weightCategory: '۲۶-', baseKg: 25 },
  3: { ageCategory: 'نونهالان', weightCategory: '۲۹-', baseKg: 28 },
  4: { ageCategory: 'نوجوانان', weightCategory: '۳۲-', baseKg: 31 },
  5: { ageCategory: 'نوجوانان', weightCategory: '۳۵-', baseKg: 34 },
  8: { ageCategory: 'جوانان', weightCategory: '۴۱-', baseKg: 40 },
  12: { ageCategory: 'جوانان', weightCategory: '۴۸-', baseKg: 47 },
  16: { ageCategory: 'بزرگسالان', weightCategory: '۵۵-', baseKg: 54 },
  32: { ageCategory: 'بزرگسالان', weightCategory: '۶۸-', baseKg: 67 },
  64: { ageCategory: 'بزرگسالان', weightCategory: '۸۷+', baseKg: 88 },
}

function sizeSpec(size: number): SizeSpec {
  return (
    SIZE_SPECS[size] ?? {
      ageCategory: 'بزرگسالان',
      weightCategory: `${size}-`,
      baseKg: size,
    }
  )
}

export interface SamplePreset {
  id: string
  /** برچسب دکمه — رقم فارسی */
  label: string
  /** راهنمای دکمه (title) */
  hint: string
  /** اندازه گروه ها؛ هر عضو یک گروه جداگانه می شود */
  sizes: number[]
  /** نمونه باران مدال — چند جدول ۴/۳/۲ نفره با رده بندی و جداسازی مربی ها */
  medalRain?: boolean
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'all',
    label: 'همه انواع',
    hint: '۹ گروه از ۲ تا ۶۴ نفره — با گروه های ۳ و ۵ و ۱۲ نفره برای دیدن استراحت ها',
    sizes: [2, 3, 4, 5, 8, 12, 16, 32, 64],
  },
  { id: 'n2', label: '۲ نفره', hint: 'یک جدول ۲ نفره — فقط فینال', sizes: [2] },
  { id: 'n4', label: '۴ نفره', hint: 'یک جدول ۴ نفره — نیمه نهایی و فینال', sizes: [4] },
  { id: 'n8', label: '۸ نفره', hint: 'یک جدول ۸ نفره — یک چهارم نهایی تا فینال', sizes: [8] },
  { id: 'n16', label: '۱۶ نفره', hint: 'یک جدول ۱۶ نفره', sizes: [16] },
  { id: 'n32', label: '۳۲ نفره', hint: 'یک جدول ۳۲ نفره', sizes: [32] },
  { id: 'n64', label: '۶۴ نفره', hint: 'یک جدول ۶۴ نفره — بزرگ ترین جدول', sizes: [64] },
  {
    id: 'mr7',
    label: 'باران مدال ۷ نفره',
    hint: '۷ هنرجو در ۲ جدول (۴ + ۳) با مسابقه رده بندی — جدا ماندن هم مربی ها را ببین',
    sizes: [7],
    medalRain: true,
  },
  {
    id: 'mr10',
    label: 'باران مدال ۱۰ نفره',
    hint: '۱۰ هنرجو در ۳ جدول (۴ + ۴ + ۲) — همه مدال می گیرند',
    sizes: [10],
    medalRain: true,
  },
]

export function sampleFileName(preset: SamplePreset): string {
  return `داده نمونه ${preset.label}`
}

export function buildSampleRoster(preset: SamplePreset): ParsedRoster {
  const participants: Participant[] = []
  let sourceRow = 2

  preset.sizes.forEach((size, groupIndex) => {
    const spec = sizeSpec(size)
    for (let i = 0; i < size; i += 1) {
      const nameIndex = participants.length
      const first = FIRST_NAMES[nameIndex % FIRST_NAMES.length]
      const last = LAST_NAMES[Math.floor(nameIndex / FIRST_NAMES.length) % LAST_NAMES.length]
      const kg = spec.baseKg + ((i * 37) % 55) / 10
      participants.push({
        id: createId('participant'),
        fullName: `${first} ${last}`,
        // چرخه مربی ها داخل هر گروه چند «هم مربی» می سازد تا چیدمان ضد برخورد
        // و اولویت استراحت مربی بیشترین هنرجو هم دیده شود
        coachName: COACH_NAMES[(groupIndex * 3 + i) % COACH_NAMES.length],
        ageCategory: spec.ageCategory,
        weightCategory: spec.weightCategory,
        weightKg: Number(kg.toFixed(1)).toString(),
        sourceRow,
      })
      sourceRow += 1
    }
  })

  return { participants, issues: [] }
}

/**
 * فهرست هنرجوهای نمونه باران مدال — مربی ها چرخه ای تا هر مربی چند هنرجو
 * داشته باشد و جداسازی هم مربی ها بین جدول ها دیده شود.
 */
export function buildMedalRainRows(count: number): MedalRainRow[] {
  const rows: MedalRainRow[] = []
  for (let index = 0; index < count; index += 1) {
    const first = FIRST_NAMES[index % FIRST_NAMES.length]
    const last = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length]
    rows.push({
      fullName: `${first} ${last}`,
      coachName: COACH_NAMES[index % 4],
    })
  }
  return rows
}
