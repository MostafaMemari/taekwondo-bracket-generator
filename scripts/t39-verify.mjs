/* ت۳۹ — فضای بیشتر برای نوشتن در «جدول نتایج نهایی» برگه چاپ
   کارت نتایج حالا واکنش گراست: تا جایی که برگه جا دارد بلندتر می شود،
   خط نقطه ای نوشتن به کف خانه می چسبد و فضای بالای خط جای دست نوشتن است.
   ۱) هر برگه: جدول نتایج داخل کادر برگه می ماند (بدون سرریز تازه)
   ۲) برگه های جادار (گروه کوچک / صفحه پایانی چند صفحه ای): کارت به سقف می رسد
      و خانه اسم ها حداقل ~۳۰ پیکسل می شوند (قبلا ~۲۲)
   ۳) برگه های تنگ (۱۶ نفره سربرگ بلند زمین بندی شده): بایت به بایت امروز — کارت ۱۴۱
   ۴) ۱۶ نفره کلاسیک تک برگه: کارت ۱۵۴ (همه ی فضای آزاد منهای نفس)
   ۵) طرح مدرن و تشریفاتی: تنگ ها همان ۱۵۸، صفحه پایانی ۱۹۸
   ۶) صفر خطای کنسول */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:3108'
mkdirSync('scripts/t39', { recursive: true })

let failures = 0
function check(label, condition, detail = '') {
  console.log(`${condition ? 'ok' : 'FAIL'}: ${label}${detail ? ` — ${detail}` : ''}`)
  if (!condition) failures += 1
}

const GROUP16 = encodeURIComponent('آزمون ۱۶ نفره__۶۰-')
const GROUP24 = encodeURIComponent('آزمون ۲۴ نفره__۶۵-')

const browser = await chromium.launch()

async function collect(layout) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto(`${BASE}/seed.html`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(400)
  await page.evaluate((l) => {
    const raw = localStorage.getItem('kyorugi-draw-board-v1')
    const state = JSON.parse(raw)
    state.state.sheetLayout = l
    // ت۴۰: اندازه نتایج حالا از تنظیمات می آید و پیش فرض «معمولی» است —
    // این تست رفتار بلند شدن خودکار را می سنجد پس خودکار را صریح ست می کنیم
    state.state.resultsSizeId = 'auto'
    localStorage.setItem('kyorugi-draw-board-v1', JSON.stringify(state))
  }, layout)
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(400)

  async function route(hash, selector) {
    await page.evaluate((r) => {
      window.location.hash = r
    }, hash)
    await page.waitForSelector(selector, { state: 'visible', timeout: 8000 }).catch(() => {})
    await page.waitForTimeout(700)
    return page.$$eval(selector, (sheets) =>
      sheets.map((sheet) => {
        const sheetBox = sheet.getBoundingClientRect()
        const grid = sheet.querySelector('div[style*="96px 1fr"]')
        if (!grid) return { hasResults: false }
        const gridBox = grid.getBoundingClientRect()
        const cardBox = grid.parentElement.getBoundingClientRect()
        const lineDivs = Array.from(grid.querySelectorAll('div[aria-hidden]')).filter((d) =>
          (d.getAttribute('style') || '').includes('dotted'),
        )
        const rows = lineDivs.map((line) => {
          const cellBox = line.parentElement.getBoundingClientRect()
          const lineBox = line.getBoundingClientRect()
          return {
            cellH: Math.round(cellBox.height),
            // فضای نوشتن = از بالای خانه (خط جداکننده) تا خط نقطه ای
            writeSpace: Math.round(lineBox.bottom - cellBox.top),
          }
        })
        return {
          hasResults: true,
          cardH: Math.round(cardBox.height),
          gridInside: gridBox.bottom <= sheetBox.bottom + 0.5 && gridBox.top >= sheetBox.top - 0.5,
          rows,
        }
      }),
    )
  }

  const single16 = (await route(`#pdf-preview/${GROUP16}`, '.print-page')).filter((r) => r.hasResults)
  const scheduled = (await route('#schedule-print?mode=tables', '[data-sched-bracket] .print-page')).filter(
    (r) => r.hasResults,
  )
  const paged24 = (await route(`#pdf-preview/${GROUP24}`, '.print-page')).filter((r) => r.hasResults)
  const all = (await route('#pdf-preview/all', '.print-page')).filter((r) => r.hasResults)
  await page.locator('.print-page').first().screenshot({ path: `scripts/t39/${layout}-sheet.png` })
  await page.close()
  return { single16, scheduled, paged24, all, errors }
}

/* ————— کلاسیک (پیش فرض) ————— */
const classic = await collect('classic')
check('classic: every results sheet keeps the table inside the sheet', classic.all.every((r) => r.gridInside))
const smallSheets = classic.all.filter((r) => r.cardH >= 175)
check(
  'classic: roomy sheets (small groups / paged finals) grow to the cap (~181) with tall name cells',
  smallSheets.length >= 3 &&
    smallSheets.every((r) => r.rows.length === 4 && r.rows.every((row) => row.cellH >= 28)),
  `roomy=${smallSheets.map((r) => r.cardH).join(',')}`,
)
check(
  'classic: 16-player single sheet grew into all free space (card ~154)',
  classic.single16.length === 1 && Math.abs(classic.single16[0].cardH - 154) <= 1,
  JSON.stringify(classic.single16.map((r) => r.cardH)),
)
check(
  'classic: 16-player single sheet name cells are taller than before (~22 → ≥24)',
  classic.single16[0]?.rows.every((row) => row.cellH >= 24),
  JSON.stringify(classic.single16[0]?.rows.map((r) => r.cellH)),
)
const schedTight = classic.scheduled.find((r) => r.cardH <= 145)
check(
  'classic: tight scheduled 16-player sheet stays exactly today (card 141)',
  Boolean(schedTight) && schedTight.cardH === 141 && schedTight.rows.every((row) => row.cellH <= 23),
  JSON.stringify(classic.scheduled.map((r) => r.cardH)),
)
const pagedFinal = classic.paged24[classic.paged24.length - 1]
check(
  'classic: paged final page hits the cap (card ~181) with writing space ≥ 26px above the dotted line (was ~16)',
  pagedFinal && Math.abs(pagedFinal.cardH - 181) <= 1 && pagedFinal.rows.every((row) => row.writeSpace >= 26),
  JSON.stringify({ cards: classic.paged24.map((r) => r.cardH), write: pagedFinal?.rows.map((r) => r.writeSpace) }),
)

/* ————— مدرن و تشریفاتی ————— */
for (const layout of ['modern', 'royal']) {
  const report = await collect(layout)
  check(`${layout}: every results sheet keeps the table inside the sheet`, report.all.every((r) => r.gridInside))
  check(
    `${layout}: tight sheets stay exactly today (card 158)`,
    report.single16.every((r) => r.cardH === 158) && report.scheduled.length >= 1 && report.scheduled[0].cardH === 158,
    JSON.stringify([...report.single16, ...report.scheduled].map((r) => r.cardH)),
  )
  const paged = report.paged24[report.paged24.length - 1]
  check(
    `${layout}: paged final page hits the cap (card ~198)`,
    Boolean(paged) && Math.abs(paged.cardH - 198) <= 1,
    JSON.stringify(report.paged24.map((r) => r.cardH)),
  )
  check(`${layout}: zero console errors`, report.errors.length === 0, report.errors.slice(0, 2).join(' | '))
}

check('classic: zero console errors', classic.errors.length === 0, classic.errors.slice(0, 2).join(' | '))

await browser.close()
if (failures > 0) {
  console.log(`${failures} failure(s)`)
  process.exit(1)
}
console.log('t39 PASSED')
