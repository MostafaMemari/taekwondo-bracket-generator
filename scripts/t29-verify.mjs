/* ت۲۹ — تایید مرورگر: برگه دو نفره وسط صفحه (چاپ/عکس/PDF)، بج شماره فینال
   که دیگر روی اسم مربی نمی نشیند، و کلید فعال/غیرفعال پلاک قهرمان در تنظیمات */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://127.0.0.1:3107'
mkdirSync('scripts/t29', { recursive: true })

let failures = 0
function check(label, condition, detail = '') {
  console.log(`${condition ? 'ok' : 'FAIL'}: ${label}${detail ? ` — ${detail}` : ''}`)
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

/* ————— حالت جدولی — برگه دو نفره اولین برگه زمین است ————— */
await page.getByText('حالت جدولی').first().click()
await page.waitForTimeout(700)

const duoSheet = page.locator('#pdf-sheet-1001')
const normSheet = page.locator('#pdf-sheet-1000')
check('tables view: duo sheet (pdf-sheet-1001) renders', (await duoSheet.count()) === 1)
check('tables view: normal sheet (pdf-sheet-1000) renders', (await normSheet.count()) === 1)

const plateOf = (sheet) => sheet.locator('div[style*="linear-gradient(135deg"]').first()

const duoPlate = plateOf(duoSheet)
check('duo sheet: champion plate exists', (await duoPlate.count()) === 1)

const geo = await page.evaluate(() => {
  const sheet = document.querySelector('#pdf-sheet-1001')
  const plate = sheet?.querySelector('div[style*="linear-gradient(135deg"]')
  const chip = sheet?.querySelector('input[aria-label="شماره مسابقه"]')
  const coaches = [...(sheet?.querySelectorAll('[title^="مربی:"]') ?? [])]
  if (!sheet || !plate || !chip || coaches.length < 2) return null
  const rect = (el) => {
    const r = el.getBoundingClientRect()
    return {
      left: r.left, right: r.right, top: r.top, bottom: r.bottom,
      cx: r.left + r.width / 2, cy: r.top + r.height / 2, width: r.width,
    }
  }
  const sorted = coaches.map(rect).sort((a, b) => a.bottom - b.bottom)
  // کارت قهرمانی = جعبه مسابقه ۳۶۰ پیکسلی — همان wrapper ای که چیدمان می سازد
  const heroBox = [...(sheet?.querySelectorAll('div[style*="width: 360px"]') ?? [])][0]
  return {
    sheet: rect(sheet),
    plate: rect(plate),
    chip: rect(chip),
    bottomCoach: sorted[sorted.length - 1],
    cardWidth: heroBox ? heroBox.getBoundingClientRect().width : 0,
  }
})
check('duo sheet: geometry measurable (2 coach lines + plate + chip)', Boolean(geo))
if (geo) {
  const plateOff = Math.abs(geo.plate.cx - geo.sheet.cx)
  const chipOff = Math.abs(geo.chip.cx - geo.sheet.cx)
  check(
    `duo sheet: bracket block is centred on the page (plate off ${plateOff.toFixed(1)}px, chip off ${chipOff.toFixed(1)}px)`,
    plateOff <= 8 && chipOff <= 8,
  )
  check(
    `duo sheet: hero card is wide enough (${geo.cardWidth.toFixed(0)}px)`,
    geo.cardWidth >= 340 && geo.cardWidth <= 420,
  )
  check(
    'duo sheet: final badge is fully BELOW the coach line (no overlap)',
    geo.chip.top >= geo.bottomCoach.bottom - 2,
  )
  check(
    'duo sheet: final badge stays clear of the champion plate',
    geo.chip.bottom < geo.plate.top,
  )
  const chipToPlate = geo.plate.top - geo.chip.cy
  check(
    `duo sheet: badge rides the gap under the final (${chipToPlate.toFixed(0)}px to plate)`,
    chipToPlate > 8 && chipToPlate < 36,
  )
}

await page.screenshot({ path: 'scripts/t29/duo-sheet-before.png', fullPage: false })

/* ————— برگه معمولی (۸ نفره) — بج فینال سر جایش روی لبه پایین می ماند ————— */
const normGeo = await page.evaluate(() => {
  const sheet = document.querySelector('#pdf-sheet-1000')
  const plate = sheet?.querySelector('div[style*="linear-gradient(135deg"]')
  const chips = [...(sheet?.querySelectorAll('input[aria-label="شماره مسابقه"]') ?? [])]
  if (!sheet || !plate || chips.length === 0) return null
  const rect = (el) => {
    const r = el.getBoundingClientRect()
    return { top: r.top, bottom: r.bottom, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }
  }
  const plateRect = rect(plate)
  // بج فینال = بجی که وسطش با وسط پلاک هم راستاست
  const finalChip = chips
    .map(rect)
    .sort((a, b) => Math.abs(a.cx - plateRect.cx) - Math.abs(b.cx - plateRect.cx))[0]
  return { plate: plateRect, sheet: rect(sheet), finalChip, chipCount: chips.length }
})
check('normal sheet: geometry measurable', Boolean(normGeo))
if (normGeo) {
  check(
    `normal sheet: final badge still sits ON the box edge (${(normGeo.plate.top - normGeo.finalChip.cy).toFixed(0)}px to plate)`,
    Math.abs(normGeo.plate.top - normGeo.finalChip.cy - 40) <= 8,
  )
}

/* ————— کلید پلاک قهرمان در تنظیمات ————— */
await page.getByLabel('تنظیمات مسابقات').click()
await page.waitForTimeout(300)
const toggle = page.getByRole('switch', { name: 'نمایش پلاک قهرمان' })
check('settings: champion toggle exists', (await toggle.count()) === 1)
check('settings: champion toggle starts ON', (await toggle.getAttribute('aria-checked')) === 'true')
await page.screenshot({ path: 'scripts/t29/settings-champion-toggle.png' })

await toggle.click()
check('settings: toggle flips OFF locally', (await toggle.getAttribute('aria-checked')) === 'false')
await page.getByRole('button', { name: 'ذخیره' }).click()
await page.waitForTimeout(500)

check('duo sheet: champion plate disappears after toggle OFF', (await plateOf(duoSheet).count()) === 0)
const offGeo = await page.evaluate(() => {
  const sheet = document.querySelector('#pdf-sheet-1001')
  const chip = sheet?.querySelector('input[aria-label="شماره مسابقه"]')
  const coaches = [...(sheet?.querySelectorAll('[title^="مربی:"]') ?? [])]
  if (!sheet || !chip || coaches.length < 2) return null
  const r = (el) => el.getBoundingClientRect()
  const sorted = coaches.map(r).sort((a, b) => a.bottom - b.bottom)
  return { chipTop: r(chip).top, coachBottom: sorted[sorted.length - 1].bottom }
})
check('duo sheet: badge still clear of the coach line with the plate hidden',
  Boolean(offGeo) && offGeo.chipTop >= offGeo.coachBottom - 2)
await page.screenshot({ path: 'scripts/t29/duo-sheet-plate-off.png' })

// برگشت — کلید دوباره روشن و پلاک برمی گردد
await page.getByLabel('تنظیمات مسابقات').click()
await page.waitForTimeout(300)
const toggleAgain = page.getByRole('switch', { name: 'نمایش پلاک قهرمان' })
check('settings: saved OFF state persists in the modal',
  (await toggleAgain.getAttribute('aria-checked')) === 'false')
await toggleAgain.click()
await page.getByRole('button', { name: 'ذخیره' }).click()
await page.waitForTimeout(500)
check('duo sheet: champion plate returns after toggle ON', (await plateOf(duoSheet).count()) === 1)
await page.screenshot({ path: 'scripts/t29/duo-sheet-plate-back.png' })

/* ————— سالم بودن کل مسیر ————— */
check('no console errors during the whole pass', consoleErrors.length === 0)
if (consoleErrors.length) console.log(consoleErrors.slice(0, 5))

await browser.close()
if (failures > 0) process.exit(1)
console.log('t29 verify PASSED')
