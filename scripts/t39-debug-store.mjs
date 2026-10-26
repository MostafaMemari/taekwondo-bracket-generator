import { chromium } from 'playwright'

const BASE = 'http://localhost:3108'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
await page.goto(`${BASE}/seed.html`)
await page.waitForLoadState('networkidle')
await page.waitForTimeout(400)

const info = await page.evaluate(() => {
  const raw = localStorage.getItem('kyorugi-draw-board-v1')
  const state = JSON.parse(raw).state
  return {
    version: JSON.parse(raw).version,
    drawKeys: Object.keys(state.draws),
    sessions: state.scheduleSessions,
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
