/* ت۳۶ — تایید مرورگر: اکثریت قابل تنظیم استراحت ها در چیدمان «همیشه زیر اسم»
   برگه ۱۱ نفره (۵ استراحت — الگوی عکس کاربر):
   ۱) پیش فرض: «همیشه زیر اسم» با اکثریت راست — ۲ چپ و ۳ راست (بخش تنظیمات
      هم دو کارت اکثریت را با انتخاب راست نشان می دهد)
   ۲) اکثریت چپ: ۳ چپ و ۲ راست — چهارگوشه ها ثابت، استراحت پنجم خانه دوم
      چپ از بالا؛ هر استراحت زیر اسم؛ انتخاب بعد از رفرش می ماند
   ۳) بازگشت به راست و صفر خطای کنسول */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:3108'
mkdirSync('scripts/t36', { recursive: true })

let failures = 0
function check(label, condition, detail = '') {
  console.log(`${condition ? 'ok' : 'FAIL'}: ${label}${detail ? ` — ${detail}` : ''}`)
  if (!condition) failures += 1
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 2600, height: 1500 } })
const consoleErrors = []
page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`))
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})

await page.goto(`${BASE}/seed.html`)
await page.waitForLoadState('networkidle')
await page.waitForTimeout(400)

await page.getByRole('button', { name: 'گروه ها' }).first().click()
await page.waitForTimeout(400)
const elevenSection = page.locator('section[aria-label="آزمون ۱۱ نفره"]')
async function openElevenBracket() {
  await elevenSection.locator('div[role="button"]', { hasText: '۶۰-' }).first().click()
  await page.waitForTimeout(600)
}

function slotSnapshot() {
  return page.$$eval('[data-slot-id]', (nodes) =>
    nodes.map((node) => {
      const box = node.getBoundingClientRect()
      return {
        slotId: node.dataset.slotId,
        rest: node.dataset.rest === 'true',
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
        name: node.textContent?.trim() ?? '',
      }
    }),
  )
}

async function widenCanvas() {
  await page.evaluate(() => {
    const el = document.querySelector('.overflow-auto')
    if (el instanceof HTMLElement) {
      el.style.maxWidth = 'none'
      el.style.width = `${el.scrollWidth}px`
    }
  })
  await page.waitForTimeout(200)
}

async function saveSettings() {
  await page.getByRole('button', { name: 'ذخیره' }).click()
  await page.waitForTimeout(500)
}

async function openSettings() {
  await page.locator('button[aria-label="تنظیمات مسابقات"]').click()
  await page.waitForTimeout(300)
}

/** تقسیم استراحت ها بین دو بال از روی مختصات بوم */
async function wingRestReport() {
  const slots = await slotSnapshot()
  const centerX = await page.$$eval('[data-match-id]', (boxes) => {
    const xs = boxes.map((box) => box.getBoundingClientRect().x)
    return (Math.min(...xs) + Math.max(...xs)) / 2
  })
  const leftRests = slots.filter((slot) => slot.rest && slot.x < centerX)
  const rightRests = slots.filter((slot) => slot.rest && slot.x >= centerX)
  const leftYs = slots.filter((slot) => slot.x < centerX).map((slot) => slot.y)
  const leftMid = (Math.min(...leftYs) + Math.max(...leftYs)) / 2
  const rightYs = slots.filter((slot) => slot.x >= centerX).map((slot) => slot.y)
  const rightMid = (Math.min(...rightYs) + Math.max(...rightYs)) / 2
  const leftSorted = [...leftRests].sort((a, b) => a.y - b.y)
  const rightSorted = [...rightRests].sort((a, b) => a.y - b.y)
  return { slots, leftRests, rightRests, leftMid, rightMid, leftSorted, rightSorted }
}

function pairRuleHolds(slots) {
  const byId = new Map(slots.map((slot) => [slot.slotId, slot]))
  for (let k = 1; k + 1 <= 16; k += 2) {
    const top = byId.get(`slot-${k}`)
    const bottom = byId.get(`slot-${k + 1}`)
    if (!top || !bottom) continue
    if (top.rest && !bottom.rest) return false
    if (top.rest !== bottom.rest && bottom.y <= top.y) return false
  }
  return true
}

/* ————— ۱) پیش فرض: زیر اسم + اکثریت راست — ۲ چپ و ۳ راست ————— */
await openElevenBracket()
await openSettings()
await page.locator('button[data-draw-mode="belowName"]').click()
await page.waitForTimeout(150)
await saveSettings()
await page.getByRole('button', { name: 'گروه ها' }).first().click()
await page.waitForTimeout(400)
await openElevenBracket()

const rightWings = await wingRestReport()
check(
  'belowName+right (default): rests at L-top, L-bottom, R-top, R-second, R-bottom',
  rightWings.slots.filter((slot) => slot.rest).map((slot) => slot.slotId).join(',') ===
    'slot-2,slot-8,slot-10,slot-12,slot-16',
  rightWings.slots.filter((slot) => slot.rest).map((slot) => slot.slotId).join(','),
)
check('belowName+right: 2 rests on the left wing', rightWings.leftRests.length === 2, String(rightWings.leftRests.length))
check('belowName+right: 3 rests on the right wing', rightWings.rightRests.length === 3, String(rightWings.rightRests.length))
check('belowName+right: every rest sits UNDER the name', pairRuleHolds(rightWings.slots))

/* ————— ۲) بخش «اکثریت استراحت ها» در تنظیمات — پیش فرض راست ————— */
await openSettings()
const majorityRightCard = page.locator('button[data-draw-mode="majority-right"]')
const majorityLeftCard = page.locator('button[data-draw-mode="majority-left"]')
check('settings: majority-right card exists and is selected', (await majorityRightCard.count()) === 1 && (await majorityRightCard.getAttribute('aria-pressed')) === 'true')
check('settings: majority-left card exists and is not selected', (await majorityLeftCard.count()) === 1 && (await majorityLeftCard.getAttribute('aria-pressed')) === 'false')
await page.screenshot({ path: 'scripts/t36/settings-majority.png' })

/* ————— ۳) اکثریت چپ — ۳ چپ و ۲ راست ————— */
await majorityLeftCard.click()
await page.waitForTimeout(150)
check('settings: majority-left becomes selected', (await majorityLeftCard.getAttribute('aria-pressed')) === 'true')
await saveSettings()
await page.getByRole('button', { name: 'گروه ها' }).first().click()
await page.waitForTimeout(400)
await openElevenBracket()

const leftWings = await wingRestReport()
check(
  'belowName+left: rests at L-top(2), L-second(4), L-bottom(8), R-top(10), R-bottom(16)',
  leftWings.slots.filter((slot) => slot.rest).map((slot) => slot.slotId).join(',') ===
    'slot-2,slot-4,slot-8,slot-10,slot-16',
  leftWings.slots.filter((slot) => slot.rest).map((slot) => slot.slotId).join(','),
)
check('belowName+left: 3 rests on the left wing', leftWings.leftRests.length === 3, String(leftWings.leftRests.length))
check('belowName+left: 2 rests on the right wing', leftWings.rightRests.length === 2, String(leftWings.rightRests.length))
check(
  'belowName+left: left rests fill top, second and bottom matches of the left wing',
  leftWings.leftSorted.length === 3 &&
    leftWings.leftSorted[0].y < leftWings.leftMid &&
    leftWings.leftSorted[1].y < leftWings.leftMid &&
    leftWings.leftSorted[2].y > leftWings.leftMid,
)
check(
  'belowName+left: right rests keep the top and bottom corners',
  leftWings.rightSorted.length === 2 &&
    leftWings.rightSorted[0].y < leftWings.rightMid &&
    leftWings.rightSorted[1].y > leftWings.rightMid,
)
check('belowName+left: every rest sits UNDER the name', pairRuleHolds(leftWings.slots))
await widenCanvas()
await page.screenshot({ path: 'scripts/t36/left-majority-corner.png', fullPage: true })

/* ————— ۴) انتخاب بعد از رفرش می ماند ————— */
await page.reload()
await page.waitForLoadState('networkidle')
await page.waitForTimeout(400)
await page.getByRole('button', { name: 'گروه ها' }).first().click()
await page.waitForTimeout(400)
await openElevenBracket()
const reloaded = await wingRestReport()
check(
  'after reload: left majority persists (still 3 left / 2 right)',
  reloaded.leftRests.length === 3 && reloaded.rightRests.length === 2,
  `${reloaded.leftRests.length}/${reloaded.rightRests.length}`,
)

/* ————— ۵) بازگشت به اکثریت راست ————— */
await openSettings()
await majorityRightCard.click()
await page.waitForTimeout(150)
await saveSettings()
await page.getByRole('button', { name: 'گروه ها' }).first().click()
await page.waitForTimeout(400)
await openElevenBracket()
const restored = await wingRestReport()
check(
  'back to right majority: 2 left / 3 right again',
  restored.leftRests.length === 2 && restored.rightRests.length === 3,
  `${restored.leftRests.length}/${restored.rightRests.length}`,
)
check('back to right majority: rest set matches the user picture pattern', restored.slots.filter((s) => s.rest).map((s) => s.slotId).join(',') === 'slot-2,slot-8,slot-10,slot-12,slot-16')
await widenCanvas()
await page.screenshot({ path: 'scripts/t36/right-majority-restored.png', fullPage: true })

check('zero console errors across the whole run', consoleErrors.length === 0, consoleErrors.join(' || ').slice(0, 400))

await browser.close()
if (failures > 0) {
  console.log(`${failures} check(s) FAILED`)
  process.exit(1)
}
console.log('t36 verify: ALL PASSED')
