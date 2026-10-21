/* ت۳۰ — تایید مرورگر: طرح برگه (کلاسیک/مدرن) — تعویض از تنظیمات، سربرگ و
   ردیف های مدرن، سازگاری تم شبانه با طرح مدرن، و برگشت بی رگرسیون به کلاسیک */
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
const classicRibbon = await page.evaluate(() => {
  const sheet = document.querySelector('#pdf-sheet-1000')
  if (!sheet) return null
  const first = sheet.firstElementChild
  return first ? first.getBoundingClientRect().height : null
})
check('classic layout: no ribbon strip on top of the sheet', classicRibbon !== 6)
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

/* ————— امضاهای بصری طرح مدرن ————— */
const modern = await page.evaluate(() => {
  const sheet = document.querySelector('#pdf-sheet-1000')
  if (!sheet) return null
  const first = sheet.firstElementChild
  const ribbon = first && first.getAttribute('aria-hidden') === 'true' ? first : null
  const header = sheet.querySelector('header')
  const rows = [...sheet.querySelectorAll('[dir="rtl"].flex.h-full')].slice(0, 6)
  const rowWithTopStripe = rows.some((row) => {
    const style = getComputedStyle(row)
    return parseFloat(style.borderTopWidth) >= 2.5 && style.borderTopStyle === 'solid'
  })
  const sideBarRows = rows.filter((row) => {
    const kid = row.firstElementChild
    return kid && kid.getAttribute('aria-hidden') === 'true' && kid.getBoundingClientRect().width < 6
  }).length
  const pills = [...sheet.querySelectorAll('header span')].filter((span) => {
    const style = getComputedStyle(span)
    return style.borderTopLeftRadius === '999px' && span.textContent?.trim().length > 0
  }).length
  const stats = [...sheet.querySelectorAll('header span')].filter(
    (span) => span.textContent === 'شرکت کننده',
  ).length
  const sheetRect = sheet.getBoundingClientRect()
  return {
    ribbonHeight: ribbon ? ribbon.getBoundingClientRect().height : 0,
    ribbonColor: ribbon ? getComputedStyle(ribbon).backgroundColor : '',
    hasHeader: Boolean(header),
    flanks: header
      ? [...header.querySelectorAll('span[aria-hidden="true"]')].filter(
          (span) => getComputedStyle(span).height === '2px',
        ).length
      : 0,
    rowWithTopStripe,
    sideBarRows,
    pills,
    statPills: stats,
    sheetHeight: sheetRect.height,
    overflow: sheet.scrollHeight - sheet.clientHeight,
  }
})
check('modern: geometry measurable', Boolean(modern))
if (modern) {
  check(`modern: ribbon strip 6px on top (${modern.ribbonHeight}px, ${modern.ribbonColor})`,
    modern.ribbonHeight === 6 && modern.ribbonColor === 'rgb(30, 58, 95)')
  check('modern: header renders', modern.hasHeader)
  check(`modern: title has two flanking rules (${modern.flanks})`, modern.flanks === 2)
  check('modern: rows use top stripes', modern.rowWithTopStripe)
  check(`modern: no mirrored side bars left in rows (${modern.sideBarRows})`, modern.sideBarRows === 0)
  check(`modern: badge pills in header (${modern.pills})`, modern.pills >= 1)
  check(`modern: stats as stacked pills (${modern.statPills})`, modern.statPills === 1)
  check(`modern: sheet still A4 fixed (${modern.sheetHeight}px, overflow ${modern.overflow}px)`,
    Math.abs(modern.sheetHeight - 770) <= 1 && modern.overflow <= 1)
}
await page.screenshot({ path: 'scripts/t30/modern-sheet.png' })

/* ————— سازگاری تم: شبانه + مدرن — ریبون رنگ تم می گیرد ————— */
await page.getByLabel('تنظیمات مسابقات').click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: /شبانه/ }).first().click()
await page.getByRole('button', { name: 'ذخیره' }).click()
await page.waitForTimeout(600)

const nightRibbon = await page.evaluate(() => {
  const sheet = document.querySelector('#pdf-sheet-1000')
  const ribbon = sheet?.firstElementChild
  if (!sheet || !ribbon || ribbon.getAttribute('aria-hidden') !== 'true') return null
  const layout = sheet.getAttribute('data-sheet-layout')
  const bg = getComputedStyle(ribbon).backgroundColor
  const body = getComputedStyle(sheet).backgroundColor
  return { layout, bg, body }
})
check(
  `night theme + modern layout: ribbon takes the theme color (${nightRibbon?.bg})`,
  Boolean(nightRibbon) &&
    nightRibbon.layout === 'modern' &&
    nightRibbon.bg === 'rgb(47, 107, 216)' &&
    nightRibbon.body === 'rgb(14, 26, 46)',
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
    ribbon: sheet.firstElementChild?.getBoundingClientRect().height,
    sideBar,
  }
})
check(
  'back to classic: attribute + no ribbon + mirrored side bar returns',
  backToClassic.layout === 'classic' && backToClassic.ribbon !== 6 && backToClassic.sideBar,
)
await page.screenshot({ path: 'scripts/t30/back-to-classic.png' })

/* ————— سالم بودن کل مسیر ————— */
check('no console errors during the whole pass', consoleErrors.length === 0)
if (consoleErrors.length) console.log(consoleErrors.slice(0, 5))

await browser.close()
if (failures > 0) process.exit(1)
console.log('t30 verify PASSED')
