// Verify the rebuilt single-file app: zero console errors + settings format field works
import { chromium } from 'playwright'

const url = 'file:///home/z/my-project/download/taekwondo-bracket.html'
const browser = await chromium.launch()
const page = await browser.newPage()
const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text())
})
page.on('pageerror', (err) => errors.push(String(err)))

await page.goto(url)
await page.waitForTimeout(1500)

// open settings
await page.getByRole('button', { name: /تنظیمات/ }).first().click().catch(async () => {
  // fallback: find a gear-ish button
  await page.locator('button').filter({ has: page.locator('svg') }).last().click()
})
await page.waitForTimeout(400)

const body = await page.textContent('body')
const hasFormatLabel = body.includes('قالب عنوان وزن ها')
const hasPreview = body.includes('پیش نمایش:')
console.log('settings format field visible:', hasFormatLabel)
console.log('preview line visible:', hasPreview)
console.log('console errors:', errors.length)
for (const e of errors.slice(0, 5)) console.log('  ERR:', e.slice(0, 200))

await browser.close()
if (errors.length > 0 || !hasFormatLabel) {
  console.log('CHECK FAILED')
  process.exit(1)
}
console.log('SINGLEFILE CHECK PASSED')
