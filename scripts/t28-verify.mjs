/* ت۲۸ — تایید مرورگر: کمربند با select box، تایپ فاصله در کمربند دلخواه،
   کمربند سطح بازه (مثل ساعت) که به همه جدول های بازه می رسد، بازنویسی
   محلی هر جدول، و کارت های فشرده صفحه گروه ها */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://127.0.0.1:3106'
mkdirSync('scripts/t28', { recursive: true })

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

/* ————— برنامه ریزی زمین ها: کمربند بازه کنار ساعت ————— */
const sessionBelt = page.getByLabel('کمربند بازه')
check('plan view: session belt select exists next to the clock', (await sessionBelt.count()) === 1)
await sessionBelt.selectOption({ label: 'سبز و آبی' })
await page.waitForTimeout(200)
await page.screenshot({ path: 'scripts/t28/plan-session-belt.png' })

/* ————— حالت جدولی: کمربند بازه روی همه جدول ها می نشیند ————— */
await page.getByText('حالت جدولی').first().click()
await page.waitForTimeout(600)
let beltBadges = await page.getByText('کمربند سبز و آبی', { exact: true }).count()
check(`tables view: session belt reaches every sheet header (got ${beltBadges}, want 2)`, beltBadges === 2)
await page.screenshot({ path: 'scripts/t28/tables-session-belt.png' })

/* ————— بازنویسی محلی: کمربند خود جدول بر کمربند بازه مقدم است ————— */
await page.getByLabel('کمربند جدول ۱').selectOption({ label: 'زرد' })
await page.waitForTimeout(300)
const firstYellow = await page.getByText('کمربند زرد', { exact: true }).count()
const restGreen = await page.getByText('کمربند سبز و آبی', { exact: true }).count()
check('tables view: table override wins on sheet 1 (زرد)', firstYellow === 1)
check('tables view: sheet 2 still follows the session belt (سبز و آبی)', restGreen === 1)

/* ————— کمربند دلخواه: select → ورودی تایپ آزاد، فاصله باید بماند ————— */
await page.getByLabel('کمربند جدول ۲').selectOption({ label: 'دلخواه…' })
await page.waitForTimeout(200)
const customInput = page.getByLabel('کمربند دلخواه')
check('tables view: custom belt input appears after «دلخواه…»', (await customInput.count()) === 1)
await customInput.click()
// تایپ واقعی حرف به حرف — فاصله وسط عبارت نباید گم شود
await customInput.pressSequentially('بنفش')
await page.keyboard.press('Space')
await customInput.pressSequentially('و')
await page.keyboard.press('Space')
await customInput.pressSequentially('سفید')
await page.waitForTimeout(300)
const typedValue = await customInput.inputValue()
check(`custom belt keeps typed spaces (value = «${typedValue}»)`, typedValue === 'بنفش و سفید')
const customBadge = await page.getByText('کمربند بنفش و سفید', { exact: true }).count()
check('tables view: custom belt lands on the sheet header badge', customBadge === 1)
await page.screenshot({ path: 'scripts/t28/tables-custom-belt.png' })

// پاک کردن با ✕ — جدول ۱ کمربند خودش (زرد) را دارد؛ فقط جدول ۲ به بازه برمی گردد
await page.getByLabel('پاک کردن کمربند').nth(1).click()
await page.waitForTimeout(200)
const clearedBack = await page.getByText('کمربند سبز و آبی', { exact: true }).count()
const stillYellow = await page.getByText('کمربند زرد', { exact: true }).count()
check('tables view: clearing table belt falls back to session belt (sheet 2)', clearedBack === 1)
check('tables view: sheet 1 keeps its own belt after sheet 2 cleared', stillYellow === 1)

/* ————— صفحه گروه ها: کارت های فشرده — دکمه ها چسبیده به کارت ————— */
await page.getByRole('button', { name: /گروه ها|بازگشت/ }).first().click().catch(() => {})
await page.waitForTimeout(300)
// اگر دکمه نبود، از هدر مستقیم برو
if (!(await page.getByText('گروه های مسابقات').count())) {
  await page.evaluate(() => {
    location.hash = '#groups'
  })
  await page.waitForTimeout(400)
}
const firstCard = page.locator('div[role="button"]').filter({ hasText: /^وزن/ }).first()
const cardCount = await page.locator('div[role="button"]').filter({ hasText: /^وزن/ }).count()
check(`groups page: weight cards render (${cardCount} cards)`, cardCount >= 5)
const gap = await firstCard.evaluate((card) => {
  const info = card.querySelector('p')
  const buttons = [...card.querySelectorAll('button')].filter((b) => /عکس|PDF/.test(b.textContent ?? ''))
  if (!info || buttons.length === 0) return -1
  const infoBottom = info.getBoundingClientRect().bottom
  const buttonTop = Math.min(...buttons.map((b) => b.getBoundingClientRect().top))
  return buttonTop - infoBottom
})
check(`groups page: image/pdf buttons sit right under the info line (${gap.toFixed(0)}px)`, gap >= 0 && gap < 60)
// عرض کارت ها خیلی کمتر از عرض صفحه است — یعنی گرید سه ستونه شده نه ردیف کشیده
const cardWidth = await firstCard.evaluate((card) => card.getBoundingClientRect().width)
check(`groups page: cards live in a grid, not a stretched row (width ${cardWidth.toFixed(0)}px)`, cardWidth > 300 && cardWidth < 700)
await page.screenshot({ path: 'scripts/t28/groups-cards.png' })

/* ————— سالم بودن کل مسیر ————— */
check('no console errors during the whole pass', consoleErrors.length === 0)
if (consoleErrors.length) console.log(consoleErrors.slice(0, 5))

await browser.close()
if (failures > 0) process.exit(1)
console.log('t28 verify PASSED')
