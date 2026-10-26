import { chromium } from 'playwright'

const BASE = 'http://localhost:3108'
const GROUP16 = encodeURIComponent('آزمون ۱۶ نفره__۶۰-')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})

await page.goto(`${BASE}/seed.html`)
await page.waitForLoadState('networkidle')
await page.waitForTimeout(400)

await page.evaluate((g) => {
  window.location.hash = `#schedule-print?mode=tables`
}, GROUP16)
await page.waitForTimeout(1200)

const info = await page.evaluate(() => ({
  hash: window.location.hash,
  bodyText: document.body.innerText.slice(0, 300),
  schedBrackets: document.querySelectorAll('[data-sched-bracket]').length,
  printPages: document.querySelectorAll('.print-page').length,
}))
console.log(JSON.stringify(info, null, 2))
console.log('errors:', errors.slice(0, 5))
await page.screenshot({ path: 'scripts/t39/scheduled-debug.png', fullPage: true })
await browser.close()
