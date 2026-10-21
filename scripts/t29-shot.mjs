/* اسکرین شات جدا از برگه دو نفره — برای بازبینی چشمی */
import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:3107'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
await page.goto(`${BASE}/seed.html`)
await page.waitForLoadState('networkidle')
await page.waitForTimeout(400)
await page.getByText('حالت جدولی').first().click()
await page.waitForTimeout(800)
await page.locator('#pdf-sheet-1001').screenshot({ path: 'scripts/t29/duo-sheet-hero.png' })
await page.locator('#pdf-sheet-1000').screenshot({ path: 'scripts/t29/normal-sheet.png' })
await browser.close()
console.log('shots saved')
