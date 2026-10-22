/* ت۳۵ — تایید مرورگر: قانون چهارگوشه چیدمان استراحت «همیشه زیر اسم»
   برگه ۱۱ نفره (۵ استراحت — الگوی عکس کاربر):
   ۱) حالت پیش فرض (آینه ای) دست نخورده می ماند
   ۲) «همیشه زیر اسم»: ۵ استراحت دقیقا چهارگوشه + سمت راست قسمت بالا —
      بالای چپ (۲)، بالای راست (۱۰)، پایین چپ (۸)، پایین راست (۱۶)،
      راست دوم از بالا (۱۲) — و هر استراحت زیر نام هنرجو
   ۳) بازگشت به پیش فرض و صفر خطای کنسول */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:3108'
mkdirSync('scripts/t35', { recursive: true })

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

/* ————— ۱) حالت پیش فرض آینه ای — دست نخورده ————— */
await page.getByRole('button', { name: 'گروه ها' }).first().click()
await page.waitForTimeout(400)
const elevenSection = page.locator('section[aria-label="آزمون ۱۱ نفره"]')
const weightCard = elevenSection.locator('div[role="button"]', { hasText: '۶۰-' }).first()
await weightCard.click()
await page.waitForTimeout(600)

function slotSnapshot() {
  return page.$$eval('[data-slot-id]', (nodes) =>
    nodes.map((node) => {
      const box = node.getBoundingClientRect()
      return {
        slotId: node.dataset.slotId,
        rest: node.dataset.rest === 'true',
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
        matchId: node.closest('[data-match-id]')?.getAttribute('data-match-id') ?? null,
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

const mirrorSlots = await slotSnapshot()
check('mirror default: 16 slots for the 11-athlete weight', mirrorSlots.length === 16, String(mirrorSlots.length))
const mirrorRests = mirrorSlots.filter((slot) => slot.rest).map((slot) => slot.slotId)
check(
  'mirror default: 5 rests in the mirrored pattern (2,3,5,7,8 per wing mirror)',
  mirrorRests.length === 5,
  mirrorRests.join(','),
)
await widenCanvas()
await page.screenshot({ path: 'scripts/t35/mirror-default.png', fullPage: true })

/* ————— ۲) «همیشه زیر اسم» — قانون چهارگوشه ————— */
await page.locator('button[aria-label="تنظیمات مسابقات"]').click()
await page.waitForTimeout(300)
await page.locator('button[data-draw-mode="belowName"]').click()
await page.waitForTimeout(150)
await page.getByRole('button', { name: 'ذخیره' }).click()
await page.waitForTimeout(500)

// برگ به کلاس آزمونی برمی گردد — دوباره وارد همان وزن می شویم
await page.getByRole('button', { name: 'گروه ها' }).first().click()
await page.waitForTimeout(400)
await elevenSection.locator('div[role="button"]', { hasText: '۶۰-' }).first().click()
await page.waitForTimeout(600)

const slots = await slotSnapshot()
check('belowName: 16 slots render', slots.length === 16, String(slots.length))
const rests = slots.filter((slot) => slot.rest)
check(
  'belowName: rests at L-top(2), L-bottom(8), R-top(10), R-second(12), R-bottom(16)',
  rests.map((slot) => slot.slotId).join(',') === 'slot-2,slot-8,slot-10,slot-12,slot-16',
  rests.map((slot) => slot.slotId).join(','),
)

// قانون «استراحت زیر اسم» — در هر جفت دور یک، استراحت پایین تر از نام است
const byId = new Map(slots.map((slot) => [slot.slotId, slot]))
function pairRuleHolds() {
  for (let k = 1; k + 1 <= 16; k += 2) {
    const top = byId.get(`slot-${k}`)
    const bottom = byId.get(`slot-${k + 1}`)
    if (!top || !bottom) continue
    if (top.rest && !bottom.rest) return false
    if (top.rest !== bottom.rest && bottom.y <= top.y) return false
  }
  return true
}
check('belowName: every rest sits UNDER the name in its pair', pairRuleHolds())

// چهارگوشه روی خود بوم — دو طرف برگه را از روی مختصات می سنجیم
const centerX = await page.$$eval('[data-match-id]', (boxes) => {
  const xs = boxes.map((box) => box.getBoundingClientRect().x)
  return (Math.min(...xs) + Math.max(...xs)) / 2
})
const leftSlots = slots.filter((slot) => slot.x < centerX)
const rightSlots = slots.filter((slot) => slot.x >= centerX)
const leftRests = leftSlots.filter((slot) => slot.rest)
const rightRests = rightSlots.filter((slot) => slot.rest)
check('belowName corner: 2 rests on the left wing', leftRests.length === 2, String(leftRests.length))
check('belowName corner: 3 rests on the right wing', rightRests.length === 3, String(rightRests.length))
const leftYs = leftSlots.map((slot) => slot.y)
const leftMid = (Math.min(...leftYs) + Math.max(...leftYs)) / 2
check(
  'belowName corner: left rests at the TOP and BOTTOM matches of the left wing',
  leftRests.filter((slot) => slot.y < leftMid).length === 1 &&
    leftRests.filter((slot) => slot.y > leftMid).length === 1,
)
const rightYs = rightSlots.map((slot) => slot.y)
const rightMid = (Math.min(...rightYs) + Math.max(...rightYs)) / 2
const rightSorted = [...rightRests].sort((a, b) => a.y - b.y)
check(
  'belowName corner: right rests fill top match, second match and bottom match',
  rightSorted.length === 3 &&
    rightSorted[0].y < rightMid &&
    rightSorted[1].y < rightMid &&
    rightSorted[2].y > rightMid,
)
await widenCanvas()
await page.screenshot({ path: 'scripts/t35/below-name-corner.png', fullPage: true })

/* ————— ۳) بازگشت به پیش فرض ————— */
await page.locator('button[aria-label="تنظیمات مسابقات"]').click()
await page.waitForTimeout(300)
await page.locator('button[data-draw-mode="mirror"]').click()
await page.waitForTimeout(150)
await page.getByRole('button', { name: 'ذخیره' }).click()
await page.waitForTimeout(500)
const restored = await slotSnapshot()
check(
  'back to mirror: rests return to the mirrored pattern',
  restored.filter((slot) => slot.rest).length === 5 &&
    restored.filter((slot) => slot.rest).map((slot) => slot.slotId).join(',') === mirrorRests.join(','),
)

check('zero console errors across the whole run', consoleErrors.length === 0, consoleErrors.join(' || ').slice(0, 400))

await browser.close()
if (failures > 0) {
  console.log(`${failures} check(s) FAILED`)
  process.exit(1)
}
console.log('t35 verify: ALL PASSED')
