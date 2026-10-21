/* نماهای تکمیلی: ردیف کلید قهرمان در تنظیمات + برگه دو نفره با پلاک خاموش */
import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:3107'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
await page.goto(`${BASE}/seed.html`)
await page.waitForLoadState('networkidle')
await page.waitForTimeout(400)
await page.getByText('حالت جدولی').first().click()
await page.waitForTimeout(800)

await page.getByLabel('تنظیمات مسابقات').click()
await page.waitForTimeout(300)
await page.getByRole('switch', { name: 'نمایش پلاک قهرمان' }).scrollIntoViewIfNeeded()
await page.waitForTimeout(200)
await page.screenshot({ path: 'scripts/t29/toggle-row.png' })
await page.getByRole('switch', { name: 'نمایش پلاک قهرمان' }).click()
await page.getByRole('button', { name: 'ذخیره' }).click()
await page.waitForTimeout(500)
await page.locator('#pdf-sheet-1001').screenshot({ path: 'scripts/t29/duo-sheet-plate-off-hero.png' })
await browser.close()
console.log('done')
