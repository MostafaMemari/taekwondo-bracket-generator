import type { SlotSide } from '../core/bracket/layout.ts'
import { sideTheme, type SideTheme } from '../features/bracket/sideColors.ts'

/**
 * تم های بصری جدول ها — «فقط ظاهر برگه قرعه» عوض می شود، نه چیدمان و نه داده.
 * رنگ های گوشه آبی/چونگ و قرمز/هونگ در همه تم ها معنای مسابقه ای خودشان را
 * نگه می دارند؛ فقط شدت و پس زمینه شان با تم هماهنگ می شود.
 *
 * هر برگه (BracketSheet) خودش تم را از store می خواند و به فرزندانش تزریق
 * می کند؛ بوم قرعه و بقیه برنامه بدون provider رندر می شوند و تم کلاسیک —
 * همان رنگ های همیشگی — را می گیرند. خروجی عکس/PDF هم از همین تم پیروی می کند.
 */
export interface TableTheme {
  id: TableThemeId
  /** نام فارسی تم — در تنظیمات */
  name: string
  /** توضیح یک خطی زیر نام در تنظیمات */
  hint: string
  /** برگه */
  sheetBg: string
  sheetText: string
  /** سربرگ */
  headerRule: string
  titleText: string
  subtitleText: string
  /** بج کمربند دستی */
  chipText: string
  chipBg: string
  chipBorder: string
  /** بج زمین */
  matBadgeText: string
  matBadgeBg: string
  /** بج ساعت */
  timeBadgeText: string
  timeBadgeBg: string
  timeBadgeBorder: string
  /** خانه های آمار سربرگ */
  statBorder: string
  statDivider: string
  statLabel: string
  /** باند مسابقه ها */
  connector: string
  roundLabel: string
  /** دایره شماره مسابقه — معمولی و فینال */
  matchAccent: string
  finalAccent: string
  chipEmptyBg: string
  chipEmptyText: string
  chipFocusBg: string
  /** صفحه قهرمان */
  championFrom: string
  championTo: string
  championText: string
  championShadow: string
  /** نشان «ادامه در صفحه بعد» */
  continueText: string
  continueBg: string
  continueBorder: string
  /** جعبه مسابقه */
  boxBorder: string
  boxRestBorder: string
  boxBg: string
  bronzeBorder: string
  bronzeLabel: string
  /** ردیف ها — گوشه ها همیشه آبی/قرمز می مانند */
  sides: Record<SlotSide, SideTheme>
  nameText: string
  coachText: string
  byeBg: string
  /** جدول نتایج دست نویس */
  resultsBorder: string
  resultsHeaderBg: string
  resultsHeaderText: string
  resultsHeaderSub: string
  resultsInnerBorder: string
  resultsRankText: string
  resultsDotted: string
  resultsCellBg: string
  /** پیام تک شرکت کننده */
  soloNoteBg: string
  soloNoteBorder: string
  soloNoteText: string
  soloMuted: string
  soloNameText: string
  /** سربرگ باریک صفحات ادامه */
  contRule: string
  contMuted: string
  /** پس زمینه بیرون برگه در خروجی عکس (نوارهای باریک بالای برگه) */
  canvasBg: string
}

export type TableThemeId =
  | 'classic'
  | 'night'
  | 'gold'
  | 'turquoise'
  | 'green'
  | 'minimal'
  | 'mono'

/**
 * تم کلاسیک — دقیقا همان ظاهر همیشگی برگه ها؛ پس زمینه تم کانتکست هم همین است
 * تا هر رندر خارج از برگه (بوم قرعه، ادیتورها) بدون تغییر بماند.
 */
export const classicTheme: TableTheme = {
  id: 'classic',
  name: 'کلاسیک',
  hint: 'ظاهر همیشگی برگه ها',
  sheetBg: '#ffffff',
  sheetText: '#101d31',
  headerRule: '#101d31',
  titleText: '#101d31',
  subtitleText: '#5b6b82',
  chipText: '#27405f',
  chipBg: '#eef2f7',
  chipBorder: '#b9c5d6',
  matBadgeText: '#ffffff',
  matBadgeBg: '#1e3a5f',
  timeBadgeText: '#1e3a5f',
  timeBadgeBg: '#ffffff',
  timeBadgeBorder: '#1e3a5f',
  statBorder: '#b9c5d6',
  statDivider: '#d8dfea',
  statLabel: '#5b6b82',
  connector: '#475569',
  roundLabel: '#27405f',
  matchAccent: '#1e3a5f',
  finalAccent: '#d97706',
  chipEmptyBg: '#ffffff',
  chipEmptyText: '#94a3b8',
  chipFocusBg: '#fffbeb',
  championFrom: '#fbbf24',
  championTo: '#d97706',
  championText: '#ffffff',
  championShadow: '0 2px 8px rgba(180, 83, 9, 0.35)',
  continueText: '#1e3a5f',
  continueBg: '#eef2f7',
  continueBorder: '#b9c5d6',
  boxBorder: '#cbd5e1',
  boxRestBorder: '#cbd5e1',
  boxBg: '#ffffff',
  bronzeBorder: '#94a3b8',
  bronzeLabel: '#5b6b82',
  sides: sideTheme,
  nameText: '#101d31',
  coachText: '#27405f',
  byeBg: '#ffffff',
  resultsBorder: '#94a3b8',
  resultsHeaderBg: '#1e3a5f',
  resultsHeaderText: '#ffffff',
  resultsHeaderSub: '#c7d4e6',
  resultsInnerBorder: '#cbd5e1',
  resultsRankText: '#27405f',
  resultsDotted: '#7e93af',
  resultsCellBg: '#ffffff',
  soloNoteBg: '#fdf7e7',
  soloNoteBorder: '#e3cf9a',
  soloNoteText: '#27405f',
  soloMuted: '#5b6b82',
  soloNameText: '#101d31',
  contRule: '#101d31',
  contMuted: '#5b6b82',
  canvasBg: '#ffffff',
}

const nightTheme: TableTheme = {
  id: 'night',
  name: 'شبانه',
  hint: 'سرمه ای تیره — چشمگیر در تلگرام',
  sheetBg: '#0e1a2e',
  sheetText: '#f1f5fb',
  headerRule: '#46597a',
  titleText: '#f6f9ff',
  subtitleText: '#93a7c4',
  chipText: '#d7e3f4',
  chipBg: '#1b2d49',
  chipBorder: '#3d5675',
  matBadgeText: '#ffffff',
  matBadgeBg: '#2f6bd8',
  timeBadgeText: '#bcd6ff',
  timeBadgeBg: '#16253d',
  timeBadgeBorder: '#4a6da0',
  statBorder: '#3d5675',
  statDivider: '#2a3f5f',
  statLabel: '#93a7c4',
  connector: '#5f7ba1',
  roundLabel: '#a9c2e4',
  matchAccent: '#3b82f6',
  finalAccent: '#f59e0b',
  chipEmptyBg: '#16253d',
  chipEmptyText: '#64809f',
  chipFocusBg: '#1b2d49',
  championFrom: '#fbbf24',
  championTo: '#d97706',
  championText: '#ffffff',
  championShadow: '0 2px 10px rgba(251, 191, 36, 0.3)',
  continueText: '#cfe0f5',
  continueBg: '#1b2d49',
  continueBorder: '#3d5675',
  boxBorder: '#3d5675',
  boxRestBorder: '#33496b',
  boxBg: '#14233a',
  bronzeBorder: '#4a6da0',
  bronzeLabel: '#93a7c4',
  sides: {
    chong: {
      bg: '#1a3a66',
      bgSoft: '#142c4f',
      border: '#3b6cb4',
      borderSoft: '#2c5490',
      accent: '#3b82f6',
      text: '#9cc3ff',
    },
    hong: {
      bg: '#4f1d2a',
      bgSoft: '#3a1620',
      border: '#a13f4f',
      borderSoft: '#7f2f3f',
      accent: '#ef4444',
      text: '#fda4af',
    },
  },
  nameText: '#f6f9ff',
  coachText: '#b9cce6',
  byeBg: '#14233a',
  resultsBorder: '#4a6da0',
  resultsHeaderBg: '#2f6bd8',
  resultsHeaderText: '#ffffff',
  resultsHeaderSub: '#cfe0f5',
  resultsInnerBorder: '#2a3f5f',
  resultsRankText: '#a9c2e4',
  resultsDotted: '#5f7ba1',
  resultsCellBg: '#14233a',
  soloNoteBg: '#1b2d49',
  soloNoteBorder: '#8a6d2f',
  soloNoteText: '#e3d5ac',
  soloMuted: '#93a7c4',
  soloNameText: '#f6f9ff',
  contRule: '#3d5675',
  contMuted: '#93a7c4',
  canvasBg: '#0e1a2e',
}

const goldTheme: TableTheme = {
  id: 'gold',
  name: 'طلایی',
  hint: 'شیر کرم و قاب طلایی — حال و هوای قهرمانی',
  sheetBg: '#fffdf5',
  sheetText: '#292018',
  headerRule: '#a87b12',
  titleText: '#292018',
  subtitleText: '#8a7a5f',
  chipText: '#6b5310',
  chipBg: '#f7efd8',
  chipBorder: '#d9c48a',
  matBadgeText: '#ffffff',
  matBadgeBg: '#8a6210',
  timeBadgeText: '#7c5a10',
  timeBadgeBg: '#fffdf5',
  timeBadgeBorder: '#a87b12',
  statBorder: '#d9c48a',
  statDivider: '#eaddbd',
  statLabel: '#8a7a5f',
  connector: '#a8946a',
  roundLabel: '#6b5310',
  matchAccent: '#7c5a10',
  finalAccent: '#b45309',
  chipEmptyBg: '#fffdf5',
  chipEmptyText: '#a8946a',
  chipFocusBg: '#f9f1d8',
  championFrom: '#f59e0b',
  championTo: '#92400e',
  championText: '#ffffff',
  championShadow: '0 2px 8px rgba(146, 64, 14, 0.4)',
  continueText: '#6b5310',
  continueBg: '#f7efd8',
  continueBorder: '#d9c48a',
  boxBorder: '#d9c48a',
  boxRestBorder: '#cfc09a',
  boxBg: '#fffef9',
  bronzeBorder: '#bfa76a',
  bronzeLabel: '#8a7a5f',
  sides: {
    chong: {
      bg: '#d8e6fb',
      bgSoft: '#eaf1fd',
      border: '#8fb2e8',
      borderSoft: '#b3cdf5',
      accent: '#1d4ed8',
      text: '#1e40af',
    },
    hong: {
      bg: '#fbdcdc',
      bgSoft: '#fdeded',
      border: '#e69393',
      borderSoft: '#f2b8b8',
      accent: '#c02626',
      text: '#9f1d1d',
    },
  },
  nameText: '#292018',
  coachText: '#5c4d38',
  byeBg: '#fffef9',
  resultsBorder: '#bfa76a',
  resultsHeaderBg: '#8a6210',
  resultsHeaderText: '#fffdf5',
  resultsHeaderSub: '#eaddbd',
  resultsInnerBorder: '#eaddbd',
  resultsRankText: '#6b5310',
  resultsDotted: '#b0996a',
  resultsCellBg: '#fffef9',
  soloNoteBg: '#f9f1d8',
  soloNoteBorder: '#d9c48a',
  soloNoteText: '#6b5310',
  soloMuted: '#8a7a5f',
  soloNameText: '#292018',
  contRule: '#a87b12',
  contMuted: '#8a7a5f',
  canvasBg: '#fffdf5',
}

const turquoiseTheme: TableTheme = {
  id: 'turquoise',
  name: 'فیروزه ای',
  hint: 'فیروزه ای روشن — سرحال و ورزشی',
  sheetBg: '#ffffff',
  sheetText: '#0f2e33',
  headerRule: '#0e7490',
  titleText: '#0f2e33',
  subtitleText: '#4e7680',
  chipText: '#0f5e70',
  chipBg: '#e6f5f8',
  chipBorder: '#8fd0dd',
  matBadgeText: '#ffffff',
  matBadgeBg: '#0e7490',
  timeBadgeText: '#0e7490',
  timeBadgeBg: '#ffffff',
  timeBadgeBorder: '#0e7490',
  statBorder: '#8fd0dd',
  statDivider: '#d3ecef',
  statLabel: '#4e7680',
  connector: '#5d8f99',
  roundLabel: '#0f5e70',
  matchAccent: '#0e7490',
  finalAccent: '#d97706',
  chipEmptyBg: '#ffffff',
  chipEmptyText: '#94a3b8',
  chipFocusBg: '#fffbeb',
  championFrom: '#fbbf24',
  championTo: '#d97706',
  championText: '#ffffff',
  championShadow: '0 2px 8px rgba(180, 83, 9, 0.35)',
  continueText: '#0f5e70',
  continueBg: '#e6f5f8',
  continueBorder: '#8fd0dd',
  boxBorder: '#9fd3dd',
  boxRestBorder: '#8fd0dd',
  boxBg: '#ffffff',
  bronzeBorder: '#6fb2c0',
  bronzeLabel: '#4e7680',
  sides: {
    chong: {
      bg: '#d5ecf8',
      bgSoft: '#e9f5fb',
      border: '#7fb8dc',
      borderSoft: '#aad4ec',
      accent: '#0369a1',
      text: '#075985',
    },
    hong: sideTheme.hong,
  },
  nameText: '#0f2e33',
  coachText: '#33565e',
  byeBg: '#ffffff',
  resultsBorder: '#6fb2c0',
  resultsHeaderBg: '#0e7490',
  resultsHeaderText: '#ffffff',
  resultsHeaderSub: '#c8ecf2',
  resultsInnerBorder: '#c8ecf2',
  resultsRankText: '#0f5e70',
  resultsDotted: '#74a8b3',
  resultsCellBg: '#ffffff',
  soloNoteBg: '#ecf8fa',
  soloNoteBorder: '#a5dae3',
  soloNoteText: '#0f5e70',
  soloMuted: '#4e7680',
  soloNameText: '#0f2e33',
  contRule: '#0e7490',
  contMuted: '#4e7680',
  canvasBg: '#ffffff',
}

const greenTheme: TableTheme = {
  id: 'green',
  name: 'زمین سبز',
  hint: 'سبز تاتامی — با فینال طلایی',
  sheetBg: '#ffffff',
  sheetText: '#12241a',
  headerRule: '#166534',
  titleText: '#12241a',
  subtitleText: '#4f7260',
  chipText: '#14532d',
  chipBg: '#e8f5ec',
  chipBorder: '#93d3a8',
  matBadgeText: '#ffffff',
  matBadgeBg: '#166534',
  timeBadgeText: '#166534',
  timeBadgeBg: '#ffffff',
  timeBadgeBorder: '#166534',
  statBorder: '#93d3a8',
  statDivider: '#d5ecdc',
  statLabel: '#4f7260',
  connector: '#6b9680',
  roundLabel: '#14532d',
  matchAccent: '#166534',
  finalAccent: '#d97706',
  chipEmptyBg: '#ffffff',
  chipEmptyText: '#94a3b8',
  chipFocusBg: '#fffbeb',
  championFrom: '#fbbf24',
  championTo: '#d97706',
  championText: '#ffffff',
  championShadow: '0 2px 8px rgba(180, 83, 9, 0.35)',
  continueText: '#14532d',
  continueBg: '#e8f5ec',
  continueBorder: '#93d3a8',
  boxBorder: '#a5d6b5',
  boxRestBorder: '#93d3a8',
  boxBg: '#ffffff',
  bronzeBorder: '#77bd90',
  bronzeLabel: '#4f7260',
  sides: sideTheme,
  nameText: '#12241a',
  coachText: '#355443',
  byeBg: '#ffffff',
  resultsBorder: '#77bd90',
  resultsHeaderBg: '#166534',
  resultsHeaderText: '#ffffff',
  resultsHeaderSub: '#cdeada',
  resultsInnerBorder: '#cdeada',
  resultsRankText: '#14532d',
  resultsDotted: '#7fae90',
  resultsCellBg: '#ffffff',
  soloNoteBg: '#edf8f1',
  soloNoteBorder: '#a5d6b5',
  soloNoteText: '#14532d',
  soloMuted: '#4f7260',
  soloNameText: '#12241a',
  contRule: '#166534',
  contMuted: '#4f7260',
  canvasBg: '#ffffff',
}

const minimalTheme: TableTheme = {
  id: 'minimal',
  name: 'مینیمال',
  hint: 'خاکستری کم مصرف — به صرفه برای چاپ',
  sheetBg: '#ffffff',
  sheetText: '#1c1c1c',
  headerRule: '#1c1c1c',
  titleText: '#1c1c1c',
  subtitleText: '#6b6b6b',
  chipText: '#333333',
  chipBg: '#f4f4f4',
  chipBorder: '#c9c9c9',
  matBadgeText: '#ffffff',
  matBadgeBg: '#2b2b2b',
  timeBadgeText: '#2b2b2b',
  timeBadgeBg: '#ffffff',
  timeBadgeBorder: '#2b2b2b',
  statBorder: '#c9c9c9',
  statDivider: '#e0e0e0',
  statLabel: '#6b6b6b',
  connector: '#8a8a8a',
  roundLabel: '#444444',
  matchAccent: '#2b2b2b',
  finalAccent: '#1c1c1c',
  chipEmptyBg: '#ffffff',
  chipEmptyText: '#9a9a9a',
  chipFocusBg: '#f4f4f4',
  championFrom: '#3a3a3a',
  championTo: '#141414',
  championText: '#ffffff',
  championShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  continueText: '#444444',
  continueBg: '#f4f4f4',
  continueBorder: '#c9c9c9',
  boxBorder: '#bdbdbd',
  boxRestBorder: '#bdbdbd',
  boxBg: '#ffffff',
  bronzeBorder: '#9a9a9a',
  bronzeLabel: '#6b6b6b',
  sides: {
    chong: {
      bg: '#e2e8ee',
      bgSoft: '#eef2f6',
      border: '#9ca3af',
      borderSoft: '#c3cbd4',
      accent: '#1d4ed8',
      text: '#1d4ed8',
    },
    hong: {
      bg: '#efe2e4',
      bgSoft: '#f7eff0',
      border: '#b3949a',
      borderSoft: '#d6bcc1',
      accent: '#dc2626',
      text: '#b91c1c',
    },
  },
  nameText: '#1c1c1c',
  coachText: '#4a4a4a',
  byeBg: '#ffffff',
  resultsBorder: '#9a9a9a',
  resultsHeaderBg: '#2b2b2b',
  resultsHeaderText: '#ffffff',
  resultsHeaderSub: '#d4d4d4',
  resultsInnerBorder: '#d4d4d4',
  resultsRankText: '#333333',
  resultsDotted: '#8a8a8a',
  resultsCellBg: '#ffffff',
  soloNoteBg: '#f4f4f4',
  soloNoteBorder: '#c9c9c9',
  soloNoteText: '#333333',
  soloMuted: '#6b6b6b',
  soloNameText: '#1c1c1c',
  contRule: '#1c1c1c',
  contMuted: '#6b6b6b',
  canvasBg: '#ffffff',
}

/**
 * تم سیاه و سفید — مخصوص پرینتر بی رنگ: همه چیز خاکستری پرکنتراست است تا
 * روی کاغذ سیاه و سفید هم هیچ چیزی گم نشود. دو گوشه مسابقه با «شدت روشنایی»
 * از هم جدا می شوند: چونگ ردیف خاکستری تیره تر با نوار کاملا مشکی، هونگ ردیف
 * تقریبا سفید با نوار خاکستری — روی پرینت سیاه و سفید هم بلافاصله مشخص است.
 */
const monoTheme: TableTheme = {
  id: 'mono',
  name: 'سیاه و سفید',
  hint: 'پرکنتراست خاکستری — مناسب پرینتر بی رنگ',
  sheetBg: '#ffffff',
  sheetText: '#111111',
  headerRule: '#000000',
  titleText: '#000000',
  subtitleText: '#3d3d3d',
  chipText: '#111111',
  chipBg: '#f2f2f2',
  chipBorder: '#8c8c8c',
  matBadgeText: '#ffffff',
  matBadgeBg: '#111111',
  timeBadgeText: '#111111',
  timeBadgeBg: '#ffffff',
  timeBadgeBorder: '#111111',
  statBorder: '#595959',
  statDivider: '#cfcfcf',
  statLabel: '#3d3d3d',
  connector: '#2b2b2b',
  roundLabel: '#111111',
  matchAccent: '#1f1f1f',
  finalAccent: '#000000',
  chipEmptyBg: '#ffffff',
  chipEmptyText: '#8c8c8c',
  chipFocusBg: '#f5f5f5',
  championFrom: '#4a4a4a',
  championTo: '#000000',
  championText: '#ffffff',
  championShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
  continueText: '#111111',
  continueBg: '#ececec',
  continueBorder: '#7a7a7a',
  boxBorder: '#4d4d4d',
  boxRestBorder: '#8c8c8c',
  boxBg: '#ffffff',
  bronzeBorder: '#4d4d4d',
  bronzeLabel: '#2b2b2b',
  sides: {
    chong: {
      bg: '#d9d9d9',
      bgSoft: '#ebebeb',
      border: '#7d7d7d',
      borderSoft: '#ababab',
      accent: '#000000',
      text: '#111111',
    },
    hong: {
      bg: '#f2f2f2',
      bgSoft: '#fafafa',
      border: '#bdbdbd',
      borderSoft: '#d8d8d8',
      accent: '#6b6b6b',
      text: '#333333',
    },
  },
  nameText: '#000000',
  coachText: '#333333',
  byeBg: '#ffffff',
  resultsBorder: '#404040',
  resultsHeaderBg: '#111111',
  resultsHeaderText: '#ffffff',
  resultsHeaderSub: '#c9c9c9',
  resultsInnerBorder: '#b3b3b3',
  resultsRankText: '#111111',
  resultsDotted: '#4d4d4d',
  resultsCellBg: '#ffffff',
  soloNoteBg: '#f2f2f2',
  soloNoteBorder: '#8c8c8c',
  soloNoteText: '#222222',
  soloMuted: '#4d4d4d',
  soloNameText: '#000000',
  contRule: '#000000',
  contMuted: '#4d4d4d',
  canvasBg: '#ffffff',
}

/** همه تم ها به ترتیب نمایش در تنظیمات — کلاسیک اول و پیش فرض */
export const tableThemes: readonly TableTheme[] = [
  classicTheme,
  nightTheme,
  goldTheme,
  turquoiseTheme,
  greenTheme,
  minimalTheme,
  monoTheme,
]

const themesById: Record<TableThemeId, TableTheme> = {
  classic: classicTheme,
  night: nightTheme,
  gold: goldTheme,
  turquoise: turquoiseTheme,
  green: greenTheme,
  minimal: minimalTheme,
  mono: monoTheme,
}

export function isTableThemeId(value: unknown): value is TableThemeId {
  return typeof value === 'string' && value in themesById
}

/** تم معتبر از store — مقدار نامعتبر/قدیمی بی درنگ کلاسیک می شود */
export function tableThemeById(id: string | null | undefined): TableTheme {
  return isTableThemeId(id) ? themesById[id] : classicTheme
}
