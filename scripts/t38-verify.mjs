/* ت۳۸ — پذیرش متن خالی پلاک قهرمان + جدول نتایج نهایی «حالت جدولی»
   ۱) تنظیمات: پاک کردن «متن پلاک» ذخیره می شود و دوباره «قهرمان» نمی شود
   ۲) بوم قرعه: پلاک هست ولی بدون نوشته — جای اسم قهرمان خالی می ماند
   ۳) برگه چاپ (#pdf-preview): سرستون «رتبه / نام و نام خانوادگی» + ردیف های
      اول / دوم / سوم / سوم (مشترک) — اولی «سوم» و دومی «سوم (مشترک)»
   ۴) جدول نتایج از کادر برگه بیرون نمی زند (بدون سرریز ارتفاع)
   ۵) نوشتن «قهرمان فردیس» دوباره روی پلاک بوم و برگه می نشیند
   ۶) صفر خطای کنسول در کل مسیر */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:3108'
mkdirSync('scripts/t38', { recursive: true })

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

/* ————— ۱) تنظیمات: متن پلاک را خالی بگذار ————— */
await page.locator('button[aria-label="تنظیمات مسابقات"]').click()
await page.waitForTimeout(300)
const plateInput = page.locator('input[placeholder="مثلا: قهرمان"]')
check('settings: plaque text input exists', (await plateInput.count()) === 1)
await plateInput.fill('')
await page.screenshot({ path: 'scripts/t38/settings-empty-label.png' })
await page.getByRole('button', { name: 'ذخیره' }).click()
await page.waitForTimeout(400)

/* ————— ۲) بوم قرعه: پلاک بدون نوشته ————— */
const weightCard = page
  .locator('section[aria-label="کودکان"]')
  .locator('div[role="button"]', { hasText: '۲۸-' })
  .first()
await weightCard.click()
await page.waitForTimeout(600)

const canvasPlates = await page.$$eval('div.font-display', (nodes) =>
  nodes
    .filter((node) => (node.getAttribute('style') || '').includes('linear-gradient'))
    .map((node) => (node.textContent ?? '').trim()),
)
check('canvas: champion plate still exists with empty label', canvasPlates.includes(''), JSON.stringify(canvasPlates))
check('canvas: no plate shows the default «قهرمان» anymore', !canvasPlates.includes('قهرمان'), JSON.stringify(canvasPlates))
await page.screenshot({ path: 'scripts/t38/canvas-empty-plate.png', fullPage: true })

/* ————— ۳) برگه چاپ: جدول نتایج حالت جدولی + پلاک خالی ————— */
await page.evaluate(() => {
  window.location.hash = '#pdf-preview/all'
})
await page.waitForSelector('.print-page', { state: 'visible' })
await page.waitForTimeout(600)

const EXPECTED_RANKS = ['رتبه', 'نام و نام خانوادگی', 'اول', 'دوم', 'سوم', 'سوم (مشترک)']
const sheetReport = await page.$$eval('.print-page', (sheets) =>
  sheets.map((sheet) => {
    const sheetBox = sheet.getBoundingClientRect()
    const grid = sheet.querySelector('div[style*="96px 1fr"]')
    if (!grid) return { hasResults: false }
    const gridBox = grid.getBoundingClientRect()
    const cells = Array.from(grid.querySelectorAll(':scope > div'))
      .map((node) => (node.textContent ?? '').trim())
      .filter((text) => text.length > 0)
    const plateTexts = Array.from(sheet.querySelectorAll('div'))
      .filter((node) => (node.getAttribute('style') || '').includes('linear-gradient'))
      .map((node) => (node.textContent ?? '').trim())
    return {
      hasResults: true,
      cells,
      fits: gridBox.bottom <= sheetBox.bottom + 0.5 && gridBox.top >= sheetBox.top - 0.5,
      plateTexts,
    }
  }),
)
const resultSheets = sheetReport.filter((report) => report.hasResults)
check('print: at least one sheet carries the results table', resultSheets.length >= 1, `${resultSheets.length} sheet(s)`)
check(
  'print: results table is tabular with ranks اول/دوم/سوم/سوم (مشترک)',
  resultSheets.every((report) => JSON.stringify(report.cells) === JSON.stringify(EXPECTED_RANKS)),
  JSON.stringify(resultSheets[0]?.cells ?? []),
)
check('print: results table stays inside the sheet (no overflow)', resultSheets.every((report) => report.fits))
check(
  'print: every results sheet shows the empty champion plate',
  resultSheets.every((report) => report.plateTexts.includes('')),
  JSON.stringify(resultSheets[0]?.plateTexts ?? []),
)
const allPrintPlates = sheetReport.flatMap((report) => report.plateTexts ?? [])
check('print: no sheet shows the default «قهرمان» label', !allPrintPlates.includes('قهرمان'))
const firstSheet = page.locator('.print-page').first()
await firstSheet.screenshot({ path: 'scripts/t38/sheet-tabular-results.png' })

/* ————— ۴) نوشتن اسم قهرمان دوباره ————— */
await page.evaluate(() => {
  window.location.hash = '#groups'
})
await page.waitForTimeout(400)
await page.locator('button[aria-label="تنظیمات مسابقات"]').click()
await page.waitForTimeout(300)
await page.locator('input[placeholder="مثلا: قهرمان"]').fill('قهرمان فردیس')
await page.getByRole('button', { name: 'ذخیره' }).click()
await page.waitForTimeout(400)

await page.evaluate(() => {
  window.location.hash = '#pdf-preview/all'
})
await page.waitForSelector('.print-page', { state: 'visible' })
await page.waitForTimeout(600)
const namedPlates = await page.$$eval('.print-page', (sheets) =>
  sheets.flatMap((sheet) =>
    Array.from(sheet.querySelectorAll('div'))
      .filter((node) => (node.getAttribute('style') || '').includes('linear-gradient'))
      .map((node) => (node.textContent ?? '').trim()),
  ),
)
check('print: plate shows the typed champion name again', namedPlates.includes('قهرمان فردیس'), JSON.stringify([...new Set(namedPlates)]))
await page.locator('.print-page').first().screenshot({ path: 'scripts/t38/sheet-named-plate.png' })

/* ————— ۵) کنسول ————— */
check('console: zero errors in the whole run', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '))

await browser.close()
if (failures > 0) {
  console.log(`${failures} failure(s)`)
  process.exit(1)
}
console.log('t38 PASSED')
