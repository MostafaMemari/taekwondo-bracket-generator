/* ت۳۴ — تایید مرورگر: نوع قرعه کشی و چیدمان استراحت در تنظیمات
   ۱) بخش «نوع قرعه کشی» با چهار کارت (دو نوع قرعه + دو چیدمان استراحت)
   ۲) پیش فرض: جداسازی هم تیمی ها + آینه ای دو طرف
   ۳) چیدمان «همیشه زیر اسم»: هر استراحت زیر نام می نشیند و تقسیم چپ/راست می ماند
   ۴) جداسازی مربی روی بوم: دو هم تیمی دو طرف برگه؛ سه نفر ۲+۱ با دو مسابقه دور یک
   ۵) نوع «کاملا تصادفی»: قرعه از نو بدون خطا — همه خانه ها پر
   ۶) بازگشت به پیش فرض و صفر خطای کنسول در کل مسیر */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:3108'
mkdirSync('scripts/t34', { recursive: true })

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

/* ————— ۱) تنظیمات: بخش قرعه کشی ————— */
await page.locator('button[aria-label="تنظیمات مسابقات"]').click()
await page.waitForTimeout(300)
const drawTypeCards = page.locator('button[data-draw-mode]')
check('settings: four draw mode cards render', (await drawTypeCards.count()) === 4)
for (const id of ['coachSeeded', 'random', 'mirror', 'belowName']) {
  check(`settings: card «${id}» exists`, (await page.locator(`button[data-draw-mode="${id}"]`).count()) === 1)
}
const selectedDefault = await drawTypeCards.evaluateAll((cards) =>
  cards.filter((card) => card.getAttribute('aria-pressed') === 'true').map((card) => card.dataset.drawMode),
)
check(
  'settings: defaults selected = coachSeeded + mirror',
  selectedDefault.length === 2 && selectedDefault.includes('coachSeeded') && selectedDefault.includes('mirror'),
  selectedDefault.join(','),
)
await page.locator('h2', { hasText: 'تنظیمات سراسری مسابقات' }).waitFor()
await page.screenshot({ path: 'scripts/t34/settings-draw-modes.png' })

/* ————— ۲) چیدمان «همیشه زیر اسم» + حفظ جداسازی مربی ————— */
await page.locator('button[data-draw-mode="belowName"]').click()
await page.waitForTimeout(150)
await page.getByRole('button', { name: 'ذخیره' }).click()
await page.waitForTimeout(400)

// گروه آزمونی: کودکان ۲۸- با ۵ نفر و ۳ استراحت
await page.getByRole('button', { name: 'گروه ها' }).first().click()
await page.waitForTimeout(400)
const kidsSection = page.locator('section[aria-label="کودکان"]')
const weightCard = kidsSection.locator('div[role="button"]', { hasText: '۲۸-' }).first()
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

const slots = await slotSnapshot()
check('bracket: 8 slots render for the 5-athlete weight', slots.length === 8, String(slots.length))
const rests = slots.filter((slot) => slot.rest)
check('bracket: three rest slots', rests.length === 3, rests.map((slot) => slot.slotId).join(','))

// قانون «استراحت زیر اسم» — در هر جفت با یک استراحت، استراحت پایین تر است
function pairRuleHolds(list) {
  const byId = new Map(list.map((slot) => [slot.slotId, slot]))
  for (let k = 1; k + 1 <= 8; k += 2) {
    const top = byId.get(`slot-${k}`)
    const bottom = byId.get(`slot-${k + 1}`)
    if (!top || !bottom) continue
    if (top.rest && !bottom.rest) return false
    if (top.rest !== bottom.rest && bottom.y <= top.y) return false
  }
  return true
}
check('belowName: every rest sits UNDER the name in its round-1 pair', pairRuleHolds(slots))

// تقسیم چپ و راست — ۳ استراحت: ۲ در نیمه چپ و ۱ در نیمه راست برگه
const leftRests = rests.filter((slot) => slot.x < 800).length
check('belowName: left/right bye split preserved (2 left, 1 right)', leftRests === 2, `left=${leftRests}`)

// جداسازی مربی — مربی ها را از فهرست ذخیره شده می خوانیم و نام اسلات ها را
// با پیشوند نام هنرجو تطبیق می دهیم
const coachOf = await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('kyorugi-draw-board-v1'))
  const list = raw?.state?.participants ?? []
  return list.map((p) => ({ fullName: p.fullName, coachName: p.coachName }))
})
function coachOfSlot(text) {
  const hit = coachOf.find((p) => text.startsWith(p.fullName))
  return hit?.coachName ?? null
}
const slotCoach = new Map(slots.map((slot) => [slot.slotId, coachOfSlot(slot.name)]))

// قانون سخت: هیچ مسابقه دور یک نباید دو هم تیمی داشته باشد
const r1Boxes = await page.$$eval('[data-match-id]', (boxes) =>
  boxes
    .map((box) => ({
      matchId: box.dataset.matchId,
      slots: Array.from(box.querySelectorAll('[data-slot-id]')).map((node) => ({
        slotId: node.dataset.slotId,
        rest: node.dataset.rest === 'true',
        text: node.textContent?.trim() ?? '',
      })),
    }))
    .filter((box) => box.slots.length === 2),
)
const contestedR1 = r1Boxes.filter((box) => box.slots.every((slot) => !slot.rest))
let teammateClash = 0
for (const box of contestedR1) {
  const coachA = coachOfSlot(box.slots[0].text)
  const coachB = coachOfSlot(box.slots[1].text)
  if (coachA && coachA === coachB) teammateClash += 1
}
check(
  'coachSeeded: no round-1 match pits two teammates against each other',
  contestedR1.length >= 1 && teammateClash === 0,
  `${contestedR1.length} contested round-1 matches`,
)

// مربی سه نفره «استاد رضایی»: چیدمان ۲+۱ در دو نیمه و دو مسابقه متفاوت برای
// آن دو نفر هم نیمه — تا فقط در نیمه نهایی به هم بخورند
const rezaei = slots.filter((slot) => slotCoach.get(slot.slotId) === 'استاد رضایی')
const rezaeiLeft = rezaei.filter((slot) => slot.x < 800).length
check(
  'coachSeeded: three rezaei athletes split 2+1 across the two halves',
  rezaei.length === 3 && (rezaeiLeft === 2 || rezaeiLeft === 1),
  `left=${rezaeiLeft}`,
)
const rezaeiSameHalf = rezaei.filter((slot) => (rezaeiLeft >= 2 ? slot.x < 800 : slot.x > 800))
check(
  'coachSeeded: the same-half rezaei pair sits in DIFFERENT round-1 matches (meet in the semifinal)',
  rezaeiSameHalf.length === 2 && rezaeiSameHalf[0].matchId !== rezaeiSameHalf[1].matchId,
  rezaeiSameHalf.map((slot) => slot.matchId).join(' | '),
)
// دو هنرجوی «استاد محمدی» هم در یک مسابقه دور یک نمی افتند
const mohammadi = slots.filter((slot) => slotCoach.get(slot.slotId) === 'استاد محمدی')
const mohammadiClash =
  mohammadi.length === 2 && mohammadi[0].matchId === mohammadi[1].matchId && contestedR1.some((box) => box.matchId === mohammadi[0].matchId)
check(
  'coachSeeded: the two mohammadi athletes never share a round-1 match',
  mohammadi.length === 2 && !mohammadiClash,
  mohammadi.map((slot) => slot.matchId).join(' | '),
)
await page.screenshot({ path: 'scripts/t34/bracket-below-name.png', fullPage: false })

/* ————— ۳) نوع «کاملا تصادفی» — قرعه از نو بدون خطا ————— */
await page.locator('button[aria-label="تنظیمات مسابقات"]').click()
await page.waitForTimeout(300)
const stillBelowName = await page.locator('button[data-draw-mode="belowName"]').getAttribute('aria-pressed')
check('settings reopen: belowName selection persisted', stillBelowName === 'true')
await page.locator('button[data-draw-mode="random"]').click()
await page.waitForTimeout(150)
await page.getByRole('button', { name: 'ذخیره' }).click()
await page.waitForTimeout(500)

const randomSlots = await slotSnapshot()
const randomFilled = randomSlots.filter((slot) => !slot.rest).length
check('random draw: all 5 athlete slots still filled', randomSlots.length === 8 && randomFilled === 5)
const names = randomSlots.filter((slot) => !slot.rest).map((slot) => slot.name)
check('random draw: no name lost or duplicated', new Set(names).size === 5 && names.every((name) => name.length > 0))

/* ————— ۴) بازگشت به پیش فرض ————— */
await page.locator('button[aria-label="تنظیمات مسابقات"]').click()
await page.waitForTimeout(300)
await page.locator('button[data-draw-mode="coachSeeded"]').click()
await page.locator('button[data-draw-mode="mirror"]').click()
await page.waitForTimeout(150)
await page.getByRole('button', { name: 'ذخیره' }).click()
await page.waitForTimeout(500)
const restoredSlots = await slotSnapshot()
check('back to defaults: bracket still renders 8 slots, 3 rests', restoredSlots.length === 8 && restoredSlots.filter((slot) => slot.rest).length === 3)

/* ————— ۵) صفر خطای کنسول ————— */
check('zero console errors across the whole run', consoleErrors.length === 0, consoleErrors.join(' || ').slice(0, 400))

await browser.close()
if (failures > 0) {
  console.log(`${failures} check(s) FAILED`)
  process.exit(1)
}
console.log('t34 verify: ALL PASSED')
