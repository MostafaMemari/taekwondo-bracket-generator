/* ت۳۷ — عکس دیداری نما های داشبورد: جریان بارگذاری (دسکتاپ و موبایل) */
import { chromium } from 'playwright'

const BASE = 'http://localhost:3108'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(`${BASE}/seed.html`)
await page.waitForLoadState('networkidle')
await page.waitForTimeout(500)
await page.getByRole('button', { name: 'ورود اطلاعات' }).click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: 'بارگذاری فایل', exact: true }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: 'scripts/t37/flow-desktop.png', fullPage: true })

const mobile = await browser.newPage({ viewport: { width: 375, height: 720 } })
await mobile.goto(`${BASE}/seed.html`)
await mobile.waitForLoadState('networkidle')
await mobile.waitForTimeout(500)
await mobile.getByRole('button', { name: 'باز کردن منو' }).click()
await mobile.locator('#topbar-mobile-menu').getByRole('button', { name: 'ورود اطلاعات' }).click()
await mobile.waitForTimeout(300)
await mobile.getByRole('button', { name: 'بارگذاری فایل', exact: true }).click()
await mobile.waitForTimeout(400)
await mobile.screenshot({ path: 'scripts/t37/flow-mobile.png', fullPage: true })
await browser.close()
console.log('flow screenshots done')
