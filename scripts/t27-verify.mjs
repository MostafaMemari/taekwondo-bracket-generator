/* ت۲۷ — تایید مرورگر: تم سیاه و سفید، نوار آینه ای، وسط چین، فاصله برچسب،
   اندازه بج، ورودی کمربند در حالت جدولی، حذف مربع رنگی، خروجی عکس A4 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://127.0.0.1:3105'
mkdirSync('scripts/t27', { recursive: true })

let failures = 0
function check(label, condition) {
  console.log(`${condition ? 'ok' : 'FAIL'}: ${label}`)
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

/* ————— حالت جدولی — ورودی کمربند + نبودن مربع رنگی + اندازه بج ————— */
// صفحه برنامه باز است؛ به «حالت جدولی» برویم
await page.getByText('حالت جدولی').first().click()
await page.waitForTimeout(500)
await page.screenshot({ path: 'scripts/t27/tables-normal.png', fullPage: false })

const beltInputs = await page.locator('input[placeholder="مثلا سبز و آبی"]').count()
check('tables view: belt input present per sheet header', beltInputs >= 2)
const beltValue = await page.locator('input[placeholder="مثلا سبز و آبی"]').first().inputValue()
check('tables view: seeded belt label «سبز و آبی» fills the input', beltValue === 'سبز و آبی')
// تایپ در همان ورودی — بج روی سربرگ همان لحظه می نشیند
await page.locator('input[placeholder="مثلا سبز و آبی"]').nth(1).fill('زرد')
await page.waitForTimeout(300)

const straySquares = await page.evaluate(() => {
  let hits = 0
  for (const el of document.querySelectorAll('span[aria-hidden]')) {
    const style = el.getAttribute('style') ?? ''
    if (style.includes('242, 242, 236') || style.includes('rgb(242,242,236)')) hits += 1
  }
  return hits
})
check('no leftover belt-colour square anywhere on tables view', straySquares === 0)

const chipSide = await page.evaluate(() => {
  const chip = document.querySelector('input[aria-label="شماره مسابقه"]')
  return chip ? Math.round(chip.getBoundingClientRect().width) : -1
})
check('match chip: normal size is the layout base 24px', chipSide === 24)

/* ————— تنظیمات: تم سیاه و سفید + بج خیلی درشت ————— */
await page.getByRole('button', { name: /تنظیمات/ }).first().click()
await page.waitForTimeout(300)
await page.getByText('سیاه و سفید', { exact: true }).first().click()
await page.getByText('خیلی درشت', { exact: true }).first().click()
await page.screenshot({ path: 'scripts/t27/settings.png', fullPage: true })
await page.getByRole('button', { name: 'ذخیره' }).click()
await page.waitForTimeout(500)

const chipSideHuge = await page.evaluate(() => {
  const chip = document.querySelector('input[aria-label="شماره مسابقه"]')
  return chip ? Math.round(chip.getBoundingClientRect().width) : -1
})
check('match chip: huge size scales to 36px', chipSideHuge === 36)

/* ————— نوار آینه ای + وسط چین + فاصله برچسب روی برگه ————— */
const mirror = await page.evaluate(() => {
  const sheet = document.querySelector('.print-page')
  if (!sheet) return { ok: false, reason: 'no sheet' }
  const sheetRect = sheet.getBoundingClientRect()
  const rows = []
  for (const bar of sheet.querySelectorAll('span[aria-hidden]')) {
    if (!/width:\s*4\.5/.test(bar.getAttribute('style') ?? '')) continue
    const row = bar.parentElement
    const content = bar.nextElementSibling ?? bar.previousElementSibling
    if (!row || !content) continue
    const barRect = bar.getBoundingClientRect()
    const contentRect = content.getBoundingClientRect()
    const side = barRect.left < contentRect.left ? 'left' : 'right'
    const rowCenter = (barRect.left + contentRect.right) / 2
    const wing = rowCenter < sheetRect.left + sheetRect.width / 2 ? 'left' : 'right'
    rows.push({ side, wing })
  }
  const wrong = rows.filter((row) => row.side !== row.wing)
  return { ok: wrong.length === 0 && rows.length > 4, total: rows.length, wrong: wrong.length }
})
check(`mirror: accent bar sits on the outer edge of its wing (${mirror.total} rows, ${mirror.wrong} wrong)`, mirror.ok === true)

const centered = await page.evaluate(() => {
  const sheet = document.querySelector('.print-page')
  if (!sheet) return { centered: 0, rightAligned: 0 }
  let centeredCount = 0
  let rightCount = 0
  for (const span of sheet.querySelectorAll('span')) {
    const style = span.getAttribute('style') ?? ''
    if (!/font-size/.test(style)) continue
    if (span.className.includes('text-center')) centeredCount += 1
    if (span.className.includes('text-right')) rightCount += 1
  }
  return { centered: centeredCount, rightAligned: rightCount }
})
check(`names centred on the sheet (${centered.centered} fitted texts, ${centered.rightAligned} right-aligned)`,
  centered.centered > 8 && centered.rightAligned === 0)

const labelGap = await page.evaluate(() => {
  const sheet = document.querySelector('.print-page')
  if (!sheet) return -1
  const labels = [...sheet.querySelectorAll('span')].filter((span) =>
    /یک چهارم نهایی|نیمه نهایی|فینال/.test(span.textContent ?? ''),
  )
  const boxes = [...sheet.querySelectorAll('.rounded-\\[8px\\]')]
  if (!labels.length || !boxes.length) return -1
  let gap = Infinity
  for (const label of labels) {
    const labelText = label.getBoundingClientRect()
    for (const box of boxes) {
      const boxRect = box.getBoundingClientRect()
      const horizontalOverlap =
        Math.min(labelText.right, boxRect.right) - Math.max(labelText.left, boxRect.left) > 4
      if (!horizontalOverlap) continue
      if (boxRect.top >= labelText.bottom - 2) {
        gap = Math.min(gap, boxRect.top - labelText.bottom)
      }
    }
  }
  return gap === Infinity ? -1 : gap
})
check(`round label keeps a visible gap before its table (${labelGap.toFixed(1)}px)`, labelGap >= 6)

await page.screenshot({ path: 'scripts/t27/tables-mono-huge.png', fullPage: false })

/* ————— بوم قرعه با تم تیره دست نخورده می ماند ————— */
await page.getByText('حالت برنامه').first().click().catch(() => {})
// به فهرست گروه ها از طریق نوار بالا — مسیر store محور، نه hash
await page.getByRole('button', { name: /گروه ها/ }).first().click()
await page.waitForTimeout(500)
const groupDot = await page.evaluate(() => {
  let hits = 0
  for (const el of document.querySelectorAll('span[aria-hidden]')) {
    const style = el.getAttribute('style') ?? ''
    if (style.includes('242, 242, 236')) hits += 1
  }
  return hits
})
check('groups page: no belt-colour dot on weight rows', groupDot === 0)
await page.screenshot({ path: 'scripts/t27/groups-mono.png', fullPage: false })

/* ————— پیش نمایش چاپ با تم سیاه و سفید ————— */
await page.evaluate(() => { window.location.hash = '#pdf-preview' })
const monoCheck = await page.evaluate(() => {
  const sheet = document.querySelector('.print-page')
  if (!sheet) return null
  const bg = getComputedStyle(sheet).backgroundColor
  const bars = [...sheet.querySelectorAll('span[aria-hidden]')]
    .filter((span) => /width:\s*4\.5/.test(span.getAttribute('style') ?? ''))
    .map((span) => getComputedStyle(span).backgroundColor)
  const unique = [...new Set(bars)]
  return { bg, uniqueBars: unique, barCount: bars.length }
})
check('print preview renders under the mono theme (white sheet)', monoCheck?.bg === 'rgb(255, 255, 255)')
check(`mono theme: corner bars are two distinct grays (${(monoCheck?.uniqueBars ?? []).join(' / ')})`,
  (monoCheck?.uniqueBars ?? []).length === 2)
await page.screenshot({ path: 'scripts/t27/print-mono.png', fullPage: false })

/* ————— خروجی عکس — هم قطع A4 و هم تم/اندازه ————— */
const downloadPromise = page.waitForEvent('download', { timeout: 45000 })
// خروج از پیش نمایش چاپ — نوار بالا برمی گردد
await page.evaluate(() => { window.location.hash = '' })
await page.waitForTimeout(600)
await page.getByRole('button', { name: /گروه ها/ }).first().click()
await page.waitForTimeout(600)
await page.getByTitle('خروجی عکس PNG این وزن — مناسب ارسال در تلگرام').first().click()
const download = await downloadPromise
await download.saveAs('scripts/t27/export-mono.png')
console.log('export saved:', download.suggestedFilename())

const { readFile: readExport } = await import('node:fs/promises')
const png = await readExport('scripts/t27/export-mono.png')
const pngWidth = png.readUInt32BE(16)
const pngHeight = png.readUInt32BE(20)
check(`exported PNG keeps the A4 landscape ratio (${pngWidth}x${pngHeight})`,
  pngWidth === 2240 && pngHeight === 1584)

check('no console errors during the whole pass', consoleErrors.length === 0)
if (consoleErrors.length) console.log(consoleErrors.slice(0, 5))

await browser.close()
if (failures > 0) {
  console.error(`${failures} failure(s)`)
  process.exit(1)
}
console.log('T27 BROWSER CHECKS PASSED')
