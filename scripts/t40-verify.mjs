/* ت۴۰ — «جدول نتایج نهایی» قابل تنظیم از تنظیمات (مدل + اندازه + نمایش)
   ۱) پیش فرض: مدل جدولی با اندازه معمولی — کارت نتایج ۱۶ نفره کلاسیک ۱۴۱
      پیکسل است (نه ۱۵۴ حالت خودکار قبلی) — پاسخ به «خیلی بزرگ شد»
   ۲) تنظیمات: بخش تازه با کلید نمایش + ۳ کارت مدل + ۴ کارت اندازه؛ پیش فرض ها
      جدولی/معمولی؛ انتخاب کارت ها زنده عوض می شود
   ۳) مدل کارت مدال: چهار کارت ۲×۲ با بج رتبه؛ مدل خطی: چهار سطر خط نقطه ای —
      هر دو روی برگه چاپ رندر می شوند و برچسب سوم/سوم (مشترک) حفظ است
   ۴) اندازه ها: کوچک ۱۱۲، درشت ۱۶۳، خودکار ۱۵۴ (کلاسیک ۱۶ نفره)
   ۵) کلید خاموش: جدول نتایج از برگه چاپ حذف می شود (خروجی عکس از اول بدون جدول)
   ۶) ذخیره: انتخاب ها بعد از رفرش می مانند؛ بازگشت به پیش فرض کار می کند
   ۷) صفر خطای کنسول */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:3108'
mkdirSync('scripts/t40', { recursive: true })

let failures = 0
function check(label, condition, detail = '') {
  console.log(`${condition ? 'ok' : 'FAIL'}: ${label}${detail ? ` — ${detail}` : ''}`)
  if (!condition) failures += 1
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})

/** خواندن کانتینر بلوک نتایج از پیش نمایش چاپی — چند صفحه ای ها چند بلوک دارند (فقط صفحه پایانی) */
const GROUP16 = 'آزمون ۱۶ نفره__۶۰-'
const GROUP24 = 'آزمون ۲۴ نفره__۶۵-'

async function readResultsCard(group = GROUP16, pick = 'first') {
  await page.evaluate((route) => {
    window.location.hash = `#pdf-preview/${route}`
  }, group)
  await page.waitForSelector('div.print-page', { state: 'visible', timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(700)
  return page.evaluate((pickLocal) => {
    const all = [...document.querySelectorAll('[data-results-style]')]
    const card = pickLocal === 'last' ? all.at(-1) : all[0]
    if (!card) return null
    const box = card.getBoundingClientRect()
    const sheet = card.closest('.print-page')
    const sheetBox = sheet.getBoundingClientRect()
    return {
      style: card.getAttribute('data-results-style'),
      size: card.getAttribute('data-results-size'),
      height: Math.round(box.height),
      insideSheet:
        box.top >= sheetBox.top && box.bottom <= sheetBox.bottom + 0.5 ? true : false,
      cards: card.querySelectorAll('[data-results-card]').length,
      lines: card.querySelectorAll('[data-results-line]').length,
      headerRow: card.textContent.includes('رتبه') && card.textContent.includes('نام و نام خانوادگی'),
      thirdLabel: card.textContent.includes('سوم (مشترک)'),
    }
  }, pick)
}

/** ست کردن مستقیم تنظیمات نتایج در localStorage و رفرش */
async function applyResults(patch) {
  await page.evaluate((patchLocal) => {
    const raw = localStorage.getItem('kyorugi-draw-board-v1')
    const state = JSON.parse(raw)
    Object.assign(state.state, patchLocal)
    localStorage.setItem('kyorugi-draw-board-v1', JSON.stringify(state))
  }, patch)
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
}

await page.goto(`${BASE}/seed.html`)
await page.waitForLoadState('networkidle')
await page.waitForTimeout(400)

/* ————— ۱) پیش فرض: جدولی + معمولی = ۱۴۱ روی کلاسیک ۱۶ نفره ————— */
const defaults = await readResultsCard()
check('default: results card renders on the print sheet', Boolean(defaults))
check('default: style=table size=medium', defaults?.style === 'table' && defaults?.size === 'medium',
  `style=${defaults?.style} size=${defaults?.size}`)
check('default: classic 16-player card height = 141 (not the grown 154)', defaults?.height === 141,
  `height=${defaults?.height}`)
check('default: card stays inside the sheet', defaults?.insideSheet === true)
check('default: table model keeps header row + shared-third label',
  defaults?.headerRow === true && defaults?.thirdLabel === true)
await page.screenshot({ path: 'scripts/t40/default-medium.png' })

/* ————— ۲) اندازه ها ————— */
await applyResults({ resultsSizeId: 'compact' })
const compact = await readResultsCard()
check('size compact: height = 112', compact?.height === 112, `height=${compact?.height}`)
check('size compact: table model intact', compact?.style === 'table' && compact?.headerRow === true)

await applyResults({ resultsSizeId: 'large' })
const large = await readResultsCard()
check('size large: tight classic 16-player falls back to natural 141 (roomy 154 < 163)',
  large?.height === 141, `height=${large?.height}`)
check('size large: stays inside the sheet', large?.insideSheet === true)
const largeFinal = await readResultsCard(GROUP24, 'last')
check('size large: final page of 24-player reaches 163 (roomy ~332)',
  largeFinal?.height === 163, `height=${largeFinal?.height}`)
await page.screenshot({ path: 'scripts/t40/large.png' })

await applyResults({ resultsSizeId: 'auto' })
const auto = await readResultsCard()
check('size auto: height = 154 (t39 behavior on classic 16-player)', auto?.height === 154, `height=${auto?.height}`)
/* ————— ۳) مدل کارت مدال ————— */
await applyResults({ resultsStyleId: 'cards', resultsSizeId: 'medium' })
const cards = await readResultsCard()
check('style cards: renders with 4 rank cards', cards?.style === 'cards' && cards?.cards === 4,
  `cards=${cards?.cards}`)
check('style cards: medium height = 141 (all models share the same heights)',
  cards?.height === 141, `height=${cards?.height}`)
check('style cards: shared-third label present', cards?.thirdLabel === true)
check('style cards: stays inside the sheet', cards?.insideSheet === true)
await page.screenshot({ path: 'scripts/t40/cards.png' })

/* ————— ۴) مدل خطی ————— */
await applyResults({ resultsStyleId: 'lines', resultsSizeId: 'compact' })
const lines = await readResultsCard()
check('style lines: renders with 4 dotted rows', lines?.style === 'lines' && lines?.lines === 4,
  `lines=${lines?.lines}`)
check('style lines: compact height = 112', lines?.height === 112, `height=${lines?.height}`)
check('style lines: shared-third label present', lines?.thirdLabel === true)
await page.screenshot({ path: 'scripts/t40/lines-compact.png' })

/* ————— ۵) کلید نمایش — خاموش ————— */
await applyResults({ resultsStyleId: 'table', resultsSizeId: 'medium', showResults: false })
const hidden = await page.evaluate((group) => {
  window.location.hash = `#pdf-preview/${group}`
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ card: Boolean(document.querySelector('[data-results-style]')) })
    }, 700)
  })
}, GROUP16)
check('toggle off: print sheet has no results card', hidden?.card === false)
await page.screenshot({ path: 'scripts/t40/hidden.png' })

/* ————— ۶) تنظیمات: بخش تازه — کارت ها و کلید ————— */
await page.evaluate(() => {
  window.location.hash = '#groups'
})
await page.waitForTimeout(400)
await applyResults({ showResults: true, resultsStyleId: 'table', resultsSizeId: 'medium' })
await page.evaluate(() => {
  window.location.hash = '#groups'
})
await page.waitForTimeout(400)
await page.locator('button[aria-label="تنظیمات مسابقات"]').click()
await page.locator('h2', { hasText: 'تنظیمات سراسری مسابقات' }).waitFor()
const section = page.locator('[data-results-settings]')
check('settings: results section renders', (await section.count()) === 1)
const pressedCards = section.locator('button[aria-pressed]')
check('settings: 3 model cards + 4 size cards with aria-pressed', (await pressedCards.count()) === 7,
  `count=${await pressedCards.count()}`)
for (const name of ['جدولی', 'کارت مدال', 'خطی', 'کوچک', 'معمولی', 'درشت', 'خودکار']) {
  const card = section
    .locator('button')
    .filter({ has: page.locator(`span:text-is("${name}")`) })
  check(`settings: card «${name}» exists exactly once`, (await card.count()) === 1, `count=${await card.count()}`)
}
const showSwitch = section.locator('button[role="switch"]')
check('settings: show-results switch renders on', (await showSwitch.getAttribute('aria-checked')) === 'true')
await page.screenshot({ path: 'scripts/t40/settings-section.png' })

// انتخاب کارت مدال + کوچک و ذخیره — بدون رفرش، همان لحظه روی برگه می نشیند
const cardsBtn = section
  .locator('button')
  .filter({ has: page.locator('span:text-is("کارت مدال")') })
await cardsBtn.click()
const compactBtn = section
  .locator('button')
  .filter({ has: page.locator('span:text-is("کوچک")') })
await compactBtn.click()
check('settings: size card «کوچک» selects on click', (await compactBtn.getAttribute('aria-pressed')) === 'true')
await page.screenshot({ path: 'scripts/t40/settings-staged.png' })
await page.locator('footer button', { hasText: 'ذخیره' }).click()
await page.waitForTimeout(500)

/* ————— ۷) ماندگاری بعد از ذخیره ————— */
await page.reload()
await page.waitForLoadState('networkidle')
await page.waitForTimeout(500)
const persisted = await readResultsCard()
check('persisted: cards + compact after reload', persisted?.style === 'cards' && persisted?.size === 'compact',
  `style=${persisted?.style} size=${persisted?.size}`)
check('persisted: compact height = 112', persisted?.height === 112, `height=${persisted?.height}`)

/* ————— ۸) بازگشت به پیش فرض ————— */
await page.evaluate(() => {
  window.location.hash = '#groups'
})
await page.waitForTimeout(400)
await page.locator('button[aria-label="تنظیمات مسابقات"]').click()
await page.locator('h2', { hasText: 'تنظیمات سراسری مسابقات' }).waitFor()
const section2 = page.locator('[data-results-settings]')
await section2.locator('button', { hasText: 'بازگشت به پیش فرض' }).click()
await page.locator('footer button', { hasText: 'ذخیره' }).click()
await page.waitForTimeout(500)
await page.reload()
await page.waitForLoadState('networkidle')
await page.waitForTimeout(500)
const reset = await readResultsCard()
check('reset: back to table + medium (141)', reset?.style === 'table' && reset?.size === 'medium' && reset?.height === 141,
  `style=${reset?.style} size=${reset?.size} height=${reset?.height}`)

check('zero console errors across the whole run', errors.length === 0, errors.join(' | ').slice(0, 300))

await browser.close()
if (failures > 0) {
  console.error(`t40: ${failures} failure(s)`)
  process.exit(1)
}
console.log('t40 ALL PASSED')
