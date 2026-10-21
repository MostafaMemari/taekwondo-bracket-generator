/* ت۳۰ — تایید مرورگر: طرح برگه (کلاسیک/مدرن) — تعویض از تنظیمات، امضاهای
   بصری طرح مدرن (ریبون لبه بالا، پیل های سربرگ، نوار رنگی بالای ردیف ها،
   پلاک قهرمان کپسولی)، تیتر دورهای بی کادر به درخواست کاربر، سازگاری تم
   شبانه، و برگشت بی رگرسیون به کلاسیک */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://127.0.0.1:3108'
mkdirSync('scripts/t30', { recursive: true })

let failures = 0
function check(label, condition, detail = '') {
  console.log(`${condition ? 'ok' : 'FAIL'}: ${label}${detail ? ` — ${detail}` : ''}`)
  if (!condition) failures += 1
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const consoleErrors = []
page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`))
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})

await page.goto(`${BASE}/seed.html`)
await page.waitForLoadState('networkidle')
await page.waitForTimeout(400)

/* ————— حالت جدولی — پیش فرض کلاسیک ————— */
await page.getByText('حالت جدولی').first().click()
await page.waitForTimeout(700)

const firstSheet = page.locator('#pdf-sheet-1000')
check('tables view: first sheet renders', (await firstSheet.count()) === 1)
check(
  'default layout: sheet carries data-sheet-layout="classic"',
  (await firstSheet.getAttribute('data-sheet-layout')) === 'classic',
)
const classicState = await page.evaluate(() => {
  const sheet = document.querySelector('#pdf-sheet-1000')
  if (!sheet) return null
  const rows = [...sheet.querySelectorAll('[dir="rtl"].flex.h-full')].slice(0, 6)
  const sideBar = rows.some((row) => {
    const kid = row.firstElementChild
    return kid && kid.getAttribute('aria-hidden') === 'true' && kid.getBoundingClientRect().width < 6
  })
  return {
    firstTag: sheet.firstElementChild?.tagName ?? '',
    headerRule: sheet.querySelector('header') ? getComputedStyle(sheet.querySelector('header')).borderBottomWidth : '',
    sideBar,
  }
})
check(
  'classic layout: header first + rule under header + mirrored side bars',
  Boolean(classicState) &&
    classicState.firstTag === 'HEADER' &&
    parseFloat(classicState.headerRule) >= 2 &&
    classicState.sideBar,
)
await page.screenshot({ path: 'scripts/t30/classic-sheet.png' })

/* ————— تنظیمات: انتخاب طرح مدرن ————— */
await page.getByLabel('تنظیمات مسابقات').click()
await page.waitForTimeout(300)

const layoutSection = page.getByText('طرح برگه').first()
check('settings: «طرح برگه» section exists', (await layoutSection.count()) === 1)

const modernCard = page.getByRole('button', { name: /مدرن/ }).first()
const classicCard = page.getByRole('button', { name: /کلاسیک/ }).first()
check('settings: two layout cards render', (await modernCard.count()) === 1 && (await classicCard.count()) === 1)
check(
  'settings: classic card starts selected',
  (await classicCard.getAttribute('aria-pressed')) === 'true',
)
await page.screenshot({ path: 'scripts/t30/settings-layouts.png' })

await modernCard.click()
check('settings: modern card selects locally', (await modernCard.getAttribute('aria-pressed')) === 'true')
await page.getByRole('button', { name: 'ذخیره' }).click()
await page.waitForTimeout(600)

check(
  'after save: sheet switches to data-sheet-layout="modern"',
  (await firstSheet.getAttribute('data-sheet-layout')) === 'modern',
)

/* ————— امضاهای بصری طرح مدرن — ریبون بالا، پیل های سربرگ، نوار بالای
   ردیف ها و تیتر دورهای بی کادر ————— */
const modern = await page.evaluate(() => {
  const sheet = document.querySelector('#pdf-sheet-1000')
  if (!sheet) return null
  const first = sheet.firstElementChild
  const header = sheet.querySelector('header')
  // ریبون رنگی لبه بالا — امضای طرح مدرن؛ اولین عنصر برگه با ارتفاع ۶px
  const ribbonHeight =
    first && first.getAttribute('aria-hidden') === 'true'
      ? parseFloat(getComputedStyle(first).height)
      : -1
  // پیل های کپسولی سربرگ — بج های وزن/کمربند/زمین/ساعت + آمارهای عمودی
  const pills = [...(header?.querySelectorAll('span, div') ?? [])].filter(
    (el) => getComputedStyle(el).borderTopLeftRadius === '999px',
  ).length
  const rows = [...sheet.querySelectorAll('[dir="rtl"].flex.h-full')].slice(0, 8)
  // نوار رنگی لبه بالای ردیف ها — امضای ردیف مدرن
  const stripedRows = rows.filter((row) => {
    const style = getComputedStyle(row)
    return parseFloat(style.borderTopWidth) >= 2.5 && style.borderTopStyle === 'solid'
  }).length
  const sideBarRows = rows.filter((row) => {
    const kid = row.firstElementChild
    return kid && kid.getAttribute('aria-hidden') === 'true' && kid.getBoundingClientRect().width < 6
  }).length
  // تیتر دورها — به درخواست کاربر هیچ کادر و پس زمینه ای دور
  // «یک چهارم نهایی/نیمه نهایی/فینال» نمی نشیند؛ خود عنصر و والدش بی کادرند
  const frameless = (style) =>
    parseFloat(style.borderTopWidth) === 0 &&
    parseFloat(style.borderBottomWidth) === 0 &&
    parseFloat(style.borderLeftWidth) === 0 &&
    parseFloat(style.borderRightWidth) === 0 &&
    (style.backgroundColor === 'rgba(0, 0, 0, 0)' || style.backgroundColor === 'transparent')
  function roundLabelState(labelText) {
    const el = [...sheet.querySelectorAll('span, div')].find(
      (node) => node.childElementCount === 0 && node.textContent?.trim() === labelText,
    )
    if (!el || !el.parentElement) return null
    return {
      self: frameless(getComputedStyle(el)),
      parent: frameless(getComputedStyle(el.parentElement)),
    }
  }
  const roundLabels = ['فینال', 'نیمه نهایی', 'یک چهارم نهایی'].map((text) => ({
    text,
    state: roundLabelState(text),
  }))
  // پلاک کپسولی «قهرمان» زیر فینال
  const champion = [...sheet.querySelectorAll('div')].some(
    (el) =>
      el.childElementCount === 0 &&
      el.textContent?.trim() === 'قهرمان' &&
      getComputedStyle(el).borderTopLeftRadius === '999px',
  )
  const sheetRect = sheet.getBoundingClientRect()
  return {
    ribbonHeight,
    hasHeader: Boolean(header),
    pills,
    stripedRows,
    rowCount: rows.length,
    sideBarRows,
    roundLabels,
    champion,
    sheetHeight: sheetRect.height,
    overflow: sheet.scrollHeight - sheet.clientHeight,
  }
})
check('modern: geometry measurable', Boolean(modern))
if (modern) {
  check(
    `modern: theme ribbon strip sits on the top edge (${modern.ribbonHeight}px)`,
    modern.ribbonHeight === 6,
  )
  check('modern: header renders', modern.hasHeader)
  check(`modern: capsule pills back in the header (${modern.pills})`, modern.pills >= 4)
  check(
    `modern: athlete rows carry the colored top stripe (${modern.stripedRows}/${modern.rowCount})`,
    modern.stripedRows >= 2,
  )
  check(`modern: no mirrored side bars in rows (${modern.sideBarRows})`, modern.sideBarRows === 0)
  for (const label of modern.roundLabels) {
    check(
      `modern: round label «${label.text}» stays frameless`,
      Boolean(label.state) && label.state.self && label.state.parent,
    )
  }
  check('modern: champion capsule below the final', modern.champion)
  check(
    `modern: sheet still A4 fixed (${modern.sheetHeight}px, overflow ${modern.overflow}px)`,
    Math.abs(modern.sheetHeight - 770) <= 1 && modern.overflow <= 1,
  )
}
await page.screenshot({ path: 'scripts/t30/modern-sheet.png' })

/* ————— سازگاری تم: شبانه + مدرن — بج زمین رنگ تم می گیرد ————— */
await page.getByLabel('تنظیمات مسابقات').click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: /شبانه/ }).first().click()
await page.getByRole('button', { name: 'ذخیره' }).click()
await page.waitForTimeout(600)

const nightModern = await page.evaluate(() => {
  const sheet = document.querySelector('#pdf-sheet-1000')
  if (!sheet) return null
  const header = sheet.querySelector('header')
  const matBadge = [...(header?.querySelectorAll('span') ?? [])].find(
    (span) => span.textContent?.trim() === 'زمین ۱',
  )
  const first = sheet.firstElementChild
  return {
    layout: sheet.getAttribute('data-sheet-layout'),
    ribbonBg: first ? getComputedStyle(first).backgroundColor : null,
    body: getComputedStyle(sheet).backgroundColor,
    matBadgeBg: matBadge ? getComputedStyle(matBadge).backgroundColor : null,
  }
})
check(
  `night theme + modern layout: mat badge takes the theme color (${nightModern?.matBadgeBg})`,
  Boolean(nightModern) &&
    nightModern.layout === 'modern' &&
    nightModern.ribbonBg === 'rgb(47, 107, 216)' &&
    nightModern.body === 'rgb(14, 26, 46)' &&
    nightModern.matBadgeBg === 'rgb(47, 107, 216)',
)
await page.screenshot({ path: 'scripts/t30/modern-night.png' })

/* ————— برگشت به کلاسیک — بی رگرسیون ————— */
await page.getByLabel('تنظیمات مسابقات').click()
await page.waitForTimeout(300)
// انتخاب شخصی شبانه در مودال می ماند؛ فقط طرح برمی گردد
const modernCardAgain = page.getByRole('button', { name: /مدرن/ }).first()
check('settings: modern choice persists in the modal',
  (await modernCardAgain.getAttribute('aria-pressed')) === 'true')
await page.getByRole('button', { name: /کلاسیک/ }).first().click()
await page.getByRole('button', { name: 'ذخیره' }).click()
await page.waitForTimeout(600)

const backToClassic = await page.evaluate(() => {
  const sheet = document.querySelector('#pdf-sheet-1000')
  if (!sheet) return null
  const rows = [...sheet.querySelectorAll('[dir="rtl"].flex.h-full')].slice(0, 6)
  const sideBar = rows.some((row) => {
    const kid = row.firstElementChild
    return kid && kid.getAttribute('aria-hidden') === 'true' && kid.getBoundingClientRect().width < 6
  })
  return {
    layout: sheet.getAttribute('data-sheet-layout'),
    firstTag: sheet.firstElementChild?.tagName ?? '',
    headerRule: sheet.querySelector('header') ? getComputedStyle(sheet.querySelector('header')).borderBottomWidth : '',
    sideBar,
  }
})
check(
  'back to classic: attribute + rule under header + mirrored side bar returns',
  backToClassic.layout === 'classic' &&
    backToClassic.firstTag === 'HEADER' &&
    parseFloat(backToClassic.headerRule) >= 2 &&
    backToClassic.sideBar,
)
await page.screenshot({ path: 'scripts/t30/back-to-classic.png' })

/* ————— سالم بودن کل مسیر ————— */
check('no console errors during the whole pass', consoleErrors.length === 0)
if (consoleErrors.length) console.log(consoleErrors.slice(0, 5))

await browser.close()
if (failures > 0) process.exit(1)
console.log('t30 verify PASSED')
