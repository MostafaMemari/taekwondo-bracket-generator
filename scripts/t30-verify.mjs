/* ت۳۰ — تایید مرورگر: طرح برگه (کلاسیک/مدرن متعادل) — تعویض از تنظیمات، سربرگ
   وسط چین با جداکننده نازک و ردیف های کادردار مدرن، سازگاری تم شبانه با طرح
   مدرن، و برگشت بی رگرسیون به کلاسیک */
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

/* ————— امضاهای بصری طرح مدرن متعادل — کادرهای نازک، بدون شلوغی ————— */
const modern = await page.evaluate(() => {
  const sheet = document.querySelector('#pdf-sheet-1000')
  if (!sheet) return null
  const first = sheet.firstElementChild
  const header = sheet.querySelector('header')
  const headerStyle = header ? getComputedStyle(header) : null
  const rows = [...sheet.querySelectorAll('[dir="rtl"].flex.h-full')].slice(0, 6)
  const rowWithTopStripe = rows.some((row) => {
    const style = getComputedStyle(row)
    return parseFloat(style.borderTopWidth) >= 2.5 && style.borderTopStyle === 'solid'
  })
  const sideBarRows = rows.filter((row) => {
    const kid = row.firstElementChild
    return kid && kid.getAttribute('aria-hidden') === 'true' && kid.getBoundingClientRect().width < 6
  }).length
  // کادر نازک ۱px دور ردیف ها — امضای «یذره کادر» مدرن متعادل
  const framedRows = rows.filter((row) => {
    const style = getComputedStyle(row)
    return (
      parseFloat(style.borderTopWidth) === 1 &&
      parseFloat(style.borderBottomWidth) === 1 &&
      parseFloat(style.borderInlineStartWidth) === 1 &&
      parseFloat(style.borderInlineEndWidth) === 1
    )
  }).length
  const pills = [...sheet.querySelectorAll('header span')].filter((span) => {
    const style = getComputedStyle(span)
    return style.borderTopLeftRadius === '999px' && span.textContent?.trim().length > 0
  }).length
  const statLine = [...(header?.querySelectorAll('p') ?? [])].find(
    (p) => p.textContent?.includes('شرکت کننده') && p.textContent?.includes('·'),
  )
  const statFrame = statLine ? parseFloat(getComputedStyle(statLine).borderTopWidth) : -1
  // چیپ عنوان وزن — تنها اسپانی که کادر نازک ۱px و گوشه ۸ دارد (زمین/ساعت پر
  // می گیرند و خط ندارند؛ کمربند بی کادر است)
  const framedChips = [...(header?.querySelectorAll('span') ?? [])].filter((span) => {
    const style = getComputedStyle(span)
    return (
      parseFloat(style.borderTopWidth) === 1 &&
      parseFloat(style.borderTopLeftRadius) === 8 &&
      (span.textContent?.trim().length ?? 0) > 0
    )
  }).length
  const sheetRect = sheet.getBoundingClientRect()
  return {
    firstIsHeader: first?.tagName === 'HEADER',
    hasHeader: Boolean(header),
    headerRuleWidth: headerStyle ? parseFloat(headerStyle.borderBottomWidth) : -1,
    rowWithTopStripe,
    sideBarRows,
    framedRows,
    rowCount: rows.length,
    pills,
    statLine: Boolean(statLine),
    statFrame,
    framedChips,
    sheetHeight: sheetRect.height,
    overflow: sheet.scrollHeight - sheet.clientHeight,
  }
})
check('modern: geometry measurable', Boolean(modern))
if (modern) {
  check('modern: no ribbon strip — header is the first element', modern.firstIsHeader)
  check('modern: header renders', modern.hasHeader)
  check(
    `modern: thin soft rule under header (${modern.headerRuleWidth}px — not the heavy classic one)`,
    modern.headerRuleWidth > 0 && modern.headerRuleWidth < 2,
  )
  check('modern: rows carry no thick top stripes', !modern.rowWithTopStripe)
  check(`modern: no mirrored side bars left in rows (${modern.sideBarRows})`, modern.sideBarRows === 0)
  check(
    `modern: rows sit inside thin 1px frames (${modern.framedRows}/${modern.rowCount})`,
    modern.rowCount > 0 && modern.framedRows === modern.rowCount,
  )
  check(`modern: no capsule pills in header (${modern.pills})`, modern.pills === 0)
  check(
    `modern: stats line framed with a thin border (${modern.statFrame}px)`,
    modern.statLine && modern.statFrame === 1,
  )
  check(
    `modern: weight title sits in a thin-framed chip (${modern.framedChips} framed chip)`,
    modern.framedChips >= 1,
  )
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
  return {
    layout: sheet.getAttribute('data-sheet-layout'),
    firstIsHeader: sheet.firstElementChild?.tagName === 'HEADER',
    body: getComputedStyle(sheet).backgroundColor,
    matBadgeBg: matBadge ? getComputedStyle(matBadge).backgroundColor : null,
  }
})
check(
  `night theme + modern layout: mat badge takes the theme color (${nightModern?.matBadgeBg})`,
  Boolean(nightModern) &&
    nightModern.layout === 'modern' &&
    nightModern.firstIsHeader &&
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
