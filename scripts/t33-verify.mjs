/* ت۳۳ — تایید مرورگر: افزودن/ویرایش/حذف هنرجو
   ۱) دکمه «افزودن هنرجو» روی کارت وزن ها (صفحه گروه ها) و نوار بالای بوم
   ۲) رشد برگه وقتی جدول پر است (دو نفره → چهار نفره، قرعه از نو)
   ۳) ویرایش درون خانه برای همه جدول ها (نه فقط دستی) — نام/مربی
   ۴) حذف هنرجو از ویرایشگر با تایید — خانه اش «استراحت» می شود
   ۵) کلیک روی خانه استراحت → افزودن دقیقا در همان خانه
   ۶) جدول دستی: افزودن روی اولین خانه بی نام + پاک کردن نام با سطل زباله
   ۷) صفر خطای کنسول در کل مسیر */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:3108'
mkdirSync('scripts/t33', { recursive: true })

let failures = 0
function check(label, condition, detail = '') {
  console.log(`${condition ? 'ok' : 'FAIL'}: ${label}${detail ? ` — ${detail}` : ''}`)
  if (!condition) failures += 1
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const consoleErrors = []
const dialogLog = []
page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`))
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})
page.on('dialog', (dialog) => {
  dialogLog.push(dialog.message())
  dialog.accept()
})

await page.goto(`${BASE}/seed.html`)
await page.waitForLoadState('networkidle')
await page.waitForTimeout(400)

/* ————— صفحه گروه ها: دکمه افزودن روی کارت ها ————— */
await page.getByRole('button', { name: 'گروه ها' }).first().click()
await page.waitForTimeout(500)
const addCardButtons = page.locator('button[title="افزودن هنرجوی تازه به این وزن"]')
check('groups page: add-student button on every weight card', (await addCardButtons.count()) >= 6)

/* ————— رشد برگه: گروه دو نفره پر است → افزودن → چهار نفره ————— */
const duoSection = page.locator('section[aria-label="آزمون دو نفره"]')
const duoCard = duoSection.locator('div[role="button"]').first()
await duoCard.locator('button[title="افزودن هنرجوی تازه به این وزن"]').click()
await page.waitForTimeout(300)
const growHint = page.locator('p', { hasText: 'به اندازه ۴ نفره بزرگ می شود' })
check('full real group: dialog warns the sheet grows to 4', (await growHint.count()) === 1)
await page.getByPlaceholder('نام و نام خانوادگی').fill('نیما رستمی')
await page.getByPlaceholder('نام مربی').fill('رستمی')
await page.getByRole('button', { name: 'افزودن', exact: true }).click()
await page.waitForTimeout(400)
check(
  'after grow: duo card counts 3 نفر',
  (await duoCard.locator('p', { hasText: '۳ نفر' }).count()) === 1,
  await duoCard.locator('p').first().textContent().catch(() => ''),
)

/* ————— بوم قرعه: سه هنرجو + یک استراحت ————— */
await duoCard.click()
await page.waitForTimeout(700)
const chips = page.locator('[aria-label^="جابه جایی"]')
check('grown bracket: 3 athlete chips', (await chips.count()) === 3)
check('grown bracket: فینال round label present', (await page.getByText('فینال').count()) >= 1)
check('grown bracket: one استراحت corner', (await page.getByText('استراحت', { exact: true }).count()) === 1)
await page.screenshot({ path: 'scripts/t33/grown-bracket.png' })

/* ————— ویرایش درون خانه روی جدول واقعی ————— */
await chips.first().click()
await page.waitForTimeout(300)
const nameInput = page.getByPlaceholder('نام هنرجو')
check('inline editor opens on real group click', (await nameInput.count()) === 1)
const oldName = await nameInput.inputValue()
await nameInput.fill(`${oldName} پور`)
await page.keyboard.press('Enter')
await page.waitForTimeout(150)
await page.keyboard.press('Enter')
await page.waitForTimeout(300)
check(
  'renamed athlete shows on the chip',
  (await page.locator(`[aria-label*="${oldName} پور"]`).count()) === 1,
)
await page.screenshot({ path: 'scripts/t33/inline-edit.png' })

/* ————— حذف هنرجو با تایید — خانه اش استراحت می شود ————— */
await page.locator(`[aria-label*="${oldName} پور"]`).first().click()
await page.waitForTimeout(250)
await page.locator('button[aria-label="حذف این هنرجو"]').click()
await page.waitForTimeout(400)
check(
  'delete confirm mentions استراحت',
  dialogLog.some((text) => text.includes('استراحت')),
  dialogLog.join(' | '),
)
check('after delete: 2 athlete chips', (await chips.count()) === 2)
check('after delete: 2 استراحت corners', (await page.getByText('استراحت', { exact: true }).count()) === 2)

/* ————— کلیک روی خانه استراحت → افزودن در همان خانه ————— */
await page.locator('[aria-label="انتقال استراحت یا افزودن هنرجو"]').first().click()
await page.waitForTimeout(300)
const exactHint = page.locator('p', { hasText: 'همین خانه استراحت می نشیند' })
check('rest click: dialog targets the exact rest slot', (await exactHint.count()) === 1)
await page.getByPlaceholder('نام و نام خانوادگی').fill('سينا موسوی')
await page.getByRole('button', { name: 'افزودن', exact: true }).click()
await page.waitForTimeout(400)
check('after rest add: 3 athlete chips again', (await chips.count()) === 3)
check('new athlete visible on board', (await page.locator('[aria-label*="سينا موسوی"]').count()) === 1)

/* ————— جدول دستی: افزودن روی اولین خانه بی نام + پاک کردن نام ————— */
await page.getByRole('button', { name: 'گروه ها' }).first().click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: 'جدول دستی' }).first().click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: /ساخت جدول ۸ نفره/ }).click()
await page.waitForTimeout(700)
const emptySlots = page.locator('button[title="نوشتن نام و مربی"]')
check('manual table: 8 empty slots', (await emptySlots.count()) === 8)

await emptySlots.first().click()
await page.waitForTimeout(250)
await page.getByPlaceholder('نام هنرجو').fill('آرش مرادی')
await page.keyboard.press('Enter')
await page.waitForTimeout(150)
await page.getByPlaceholder('مربی (اختیاری)').fill('مرادی')
await page.keyboard.press('Enter')
await page.waitForTimeout(300)
check('manual slot: name written', (await page.locator('[aria-label*="آرش مرادی"]').count()) === 1)

await page.getByRole('button', { name: 'افزودن هنرجو' }).first().click()
await page.waitForTimeout(300)
check(
  'manual add dialog: first-empty-slot hint',
  (await page.locator('p', { hasText: 'اولین خانه بی نام این جدول می نشیند' }).count()) === 1,
)
await page.getByPlaceholder('نام و نام خانوادگی').fill('بهراد صادقی')
await page.getByRole('button', { name: 'افزودن', exact: true }).click()
await page.waitForTimeout(400)
check('manual add: second slot filled', (await page.locator('[aria-label*="بهراد صادقی"]').count()) === 1)
check('manual add: 6 empty slots left', (await emptySlots.count()) === 6)

await page.locator('[aria-label*="آرش مرادی"]').first().click()
await page.waitForTimeout(250)
await page.locator('button[aria-label="حذف این هنرجو"]').click()
await page.waitForTimeout(400)
check(
  'manual delete confirm: clears the name, keeps the slot',
  dialogLog.some((text) => text.includes('نام این خانه پاک شود')),
  dialogLog.join(' | '),
)
check('manual after clear: 7 empty slots', (await emptySlots.count()) === 7)
await page.screenshot({ path: 'scripts/t33/manual-flow.png' })

/* ————— برگشت به گروه ها — رگرسیون ————— */
await page.getByRole('button', { name: 'گروه ها' }).first().click()
await page.waitForTimeout(400)
check(
  'back on groups page: weight cards render',
  (await page.locator('div[role="button"]', { hasText: 'وزن' }).count()) >= 6,
)

check('zero console errors in the whole path', consoleErrors.length === 0, consoleErrors.join(' | '))

await browser.close()
console.log(failures === 0 ? 'ALL PASSED' : `${failures} failure(s)`)
process.exit(failures === 0 ? 0 : 1)
