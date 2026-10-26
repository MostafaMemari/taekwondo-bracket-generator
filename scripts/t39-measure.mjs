/* ت۳۹ — سنجش هندسه برگه چاپ: چقدر فضای خالی بالای باند و زیر جدول نتایج هست؟
   برای هر سه طرح (کلاسیک/مدرن/تشریفاتی) و هر دو مسیر:
     - #pdf-preview/<گروه ۱۶ نفره>   (تک برگه — بدترین حالت باند ۸ ردیفی)
     - #schedule-print?mode=tables   (سربرگ بلند ۱۳۴/۱۳۸ + جدول نتایج)
     - #pdf-preview/<گروه ۲۴ نفره>   (چند صفحه ای — صفحه پایانی)
   خروجی: برای هر صفحه — ارتفاع سربرگ، باند، جدول نتایج، فضای خالی بالا/پایین
   و «رشد مجاز» = جمع دو فضای خالی (چیدمان وسط چین است). */

import { chromium } from 'playwright'

const BASE = 'http://localhost:3108'
const GROUP16 = encodeURIComponent('آزمون ۱۶ نفره__۶۰-')
const GROUP24 = encodeURIComponent('آزمون ۲۴ نفره__۶۵-')

const browser = await chromium.launch()

async function measure(design) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
  await page.goto(`${BASE}/seed.html`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(400)
  // طرح برگه را مستقیم در استور ذخیره کن و رفرش بزن
  await page.evaluate((layout) => {
    const raw = localStorage.getItem('kyorugi-draw-board-v1')
    const state = JSON.parse(raw)
    state.state.sheetLayout = layout
    localStorage.setItem('kyorugi-draw-board-v1', JSON.stringify(state))
  }, design)
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(400)

  const report = {}

  async function measureRoute(route, label, selector) {
    await page.evaluate((r) => {
      window.location.hash = r
    }, route)
    await page.waitForSelector(selector, { state: 'visible', timeout: 8000 }).catch(() => {})
    await page.waitForTimeout(700)
    const rows = await page.$$eval(selector, (sheets) =>
      sheets.map((sheet) => {
        const sheetBox = sheet.getBoundingClientRect()
        const grid = sheet.querySelector('div[style*="96px 1fr"]')
        if (!grid) return { hasResults: false }
        const gridBox = grid.getBoundingClientRect()
        const card = grid.parentElement
        const cardBox = card.getBoundingClientRect()
        const main = grid.closest('main')
        const mainBox = main.getBoundingClientRect()
        const band = main.querySelector('div[data-band]') ?? main.firstElementChild
        const bandBox = band ? band.getBoundingClientRect() : null
        const header = main.previousElementSibling
        const headerBox = header ? header.getBoundingClientRect() : null
        return {
          hasResults: true,
          sheetH: Math.round(sheetBox.height),
          headerH: headerBox ? Math.round(headerBox.height) : -1,
          bandH: bandBox ? Math.round(bandBox.height) : -1,
          resultsH: Math.round(gridBox.height),
          cardH: Math.round(cardBox.height),
          slackTop: Math.round(bandBox ? bandBox.top - mainBox.top : -1),
          slackBottom: Math.round(mainBox.bottom - gridBox.bottom),
        }
      }),
    )
    report[label] = rows.filter((r) => r.hasResults)
  }

  await measureRoute(`#pdf-preview/${GROUP16}`, 'single16', '.print-page')
  await measureRoute('#schedule-print?mode=tables', 'scheduled', '[data-sched-bracket] .print-page')
  await measureRoute(`#pdf-preview/${GROUP24}`, 'paged24', '.print-page')

  await page.close()
  return report
}

for (const design of ['classic', 'modern', 'royal']) {
  const report = await measure(design)
  console.log(`\n===== ${design} =====`)
  for (const [label, rows] of Object.entries(report)) {
    for (const row of rows) {
      const grow = row.slackTop + row.slackBottom
      console.log(
        `${label}: sheet=${row.sheetH} header=${row.headerH} band=${row.bandH} results=${row.resultsH} card=${row.cardH} ` +
          `slackTop=${row.slackTop} slackBottom=${row.slackBottom} GROW_LIMIT=${grow}`,
      )
    }
  }
}

await browser.close()
console.log('\nmeasurement done')
