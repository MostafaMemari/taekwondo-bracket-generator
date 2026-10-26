/* ت۳۷ — تایید مرورگر: بازطراحی داشبورد و نوار بالا (فقط محدوده داشبورد)
   ۱) داشبورد (با داده): سرصفحه وضعیت واقعی (فایل/تاریخ/رده ها) + چهار کارت
      بخش ها با وضعیت زنده + مدیریت داده ها؛ ناوبری به گروه ها/قرعه/برنامه/خروجی
   ۲) نوار بالا دسکتاپ: چهار مرحله + نشان انجام شده + «قرعه و جدول» واقعا تخته
      قرعه را باز می کند
   ۳) موبایل ۳۷۵: همبرگر + منوی کامل، بدون اسکرول افقی بدنه در داشبورد/گروه ها/قرعه
   ۴) جریان ورود اطلاعات سالم: داشبورد → بارگذاری فایل → نگاشت → پیش نمایش → گروه ها
   ۵) خروجی عکس از داشبورد + صفر خطای کنسول */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:3108'
mkdirSync('scripts/t37', { recursive: true })

let failures = 0
function check(label, condition, detail = '') {
  console.log(`${condition ? 'ok' : 'FAIL'}: ${label}${detail ? ` — ${detail}` : ''}`)
  if (!condition) failures += 1
}

const browser = await chromium.launch()

/* ———— ۱) دسکتاپ ۱۴۴۰ — داشبورد و ناوبری ———— */
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const consoleErrors = []
page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`))
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})

await page.goto(`${BASE}/seed.html`)
await page.waitForLoadState('networkidle')
await page.waitForTimeout(500)

// بذر روی صفحه «برنامه» باز می شود — به داشبورد می رویم
await page.getByRole('button', { name: 'ورود اطلاعات' }).click()
await page.waitForTimeout(400)

const dashboardH1 = page.getByRole('heading', { name: 'داشبورد مسابقات' })
check('dashboard renders with data', await dashboardH1.isVisible())

const sections = page.locator('section[aria-label="بخش های مسابقات"]')
const sectionsText = (await sections.textContent()) ?? ''
check(
  'groups card shows real counts (N گروه وزنی در M رده سنی)',
  /گروه وزنی در.+رده سنی/.test(sectionsText),
)
check('bracket card present', sectionsText.includes('قرعه و جدول مسابقات'))
check(
  'schedule card honest empty state',
  sectionsText.includes('برنامه زمین ها') && sectionsText.includes('هنوز بازه زمانی ساخته نشده'),
)
check('export card present', sectionsText.includes('چاپ و خروجی ها'))

const manage = (await page.locator('section[aria-label="مدیریت داده ها"]').textContent()) ?? ''
check(
  'data management section: excel + medal rain + manual',
  manage.includes('فایل اکسل جدید') && manage.includes('باران مدال') && manage.includes('جدول دستی'),
)

check('status chips: file name chip', await page.getByText('فایل:').first().isVisible())
check('status chips: import date chip', await page.getByText('ورود:').first().isVisible())

// ناوبری داشبورد: تخته قرعه
await page.getByRole('button', { name: 'باز کردن تخته قرعه' }).click()
await page.waitForTimeout(600)
check(
  'bracket opens from dashboard (canvas matches present)',
  (await page.locator('[data-match-id]').count()) > 0,
)

// نوار بالا: «قرعه و جدول» هم از هر صفحه تخته قرعه را باز می کند
await page.getByRole('button', { name: 'ورود اطلاعات' }).click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: 'قرعه و جدول' }).click()
await page.waitForTimeout(600)
check('topbar «قرعه و جدول» opens bracket', (await page.locator('[data-match-id]').count()) > 0)

// گروه ها
await page.getByRole('button', { name: 'ورود اطلاعات' }).click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: 'مشاهده گروه ها' }).click()
await page.waitForTimeout(400)
check(
  'groups page reached from dashboard',
  await page.getByRole('heading', { name: 'گروه های مسابقات' }).isVisible(),
)
check(
  'active step marked with aria-current',
  (await page.locator('nav[aria-label="مرحله ها"] [aria-current="page"]').textContent())?.includes(
    'گروه ها',
  ) ?? false,
)

// برنامه زمین ها
await page.getByRole('button', { name: 'ورود اطلاعات' }).click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: 'برنامه ریزی زمین ها' }).click()
await page.waitForTimeout(500)
check(
  'schedule page reached from dashboard',
  await page.getByText('هنوز بازه ای ساخته نشده است').isVisible(),
)

// بازگشت به داشبورد و ورود به جریان بارگذاری
await page.getByRole('button', { name: 'ورود اطلاعات' }).click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: 'بارگذاری فایل', exact: true }).click()
await page.waitForTimeout(300)
check(
  'import flow opens with back link',
  await page.getByRole('button', { name: 'بازگشت به داشبورد' }).isVisible(),
)
check('flow header warns about replacement', await page.getByText('از نو می سازد').isVisible())
check('dropzone visible in flow', await page.getByLabel('انتخاب فایل اکسل').isVisible())
await page.getByRole('button', { name: 'بازگشت به داشبورد' }).click()
await page.waitForTimeout(300)
check('back link returns to dashboard', await dashboardH1.isVisible())

// خروجی عکس از داشبورد — دانلود واقعی
const downloadPromise = page.waitForEvent('download', { timeout: 60000 })
await page.getByRole('button', { name: 'عکس همه' }).click()
const download = await downloadPromise
check(
  'image export from dashboard downloads',
  download.suggestedFilename().toLowerCase().includes('.png'),
  download.suggestedFilename(),
)
await page.waitForTimeout(800)
let overlayGone = true
try {
  await page.locator('text=در حال ساخت تصویر').waitFor({ state: 'hidden', timeout: 60000 })
} catch {
  overlayGone = false
}
check('export busy overlay finishes', overlayGone)

await page.screenshot({ path: 'scripts/t37/dashboard-desktop.png', fullPage: true })

/* ———— ۲) موبایل ۳۷۵ — منو و ریسپانسیو ———— */
const mobile = await browser.newPage({ viewport: { width: 375, height: 667 } })
mobile.on('pageerror', (error) => consoleErrors.push(`mobile pageerror: ${error.message}`))
mobile.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(`mobile console: ${message.text()}`)
})
await mobile.goto(`${BASE}/seed.html`)
await mobile.waitForLoadState('networkidle')
await mobile.waitForTimeout(500)
await mobile.getByRole('button', { name: 'باز کردن منو' }).click()
await mobile.locator('#topbar-mobile-menu').getByRole('button', { name: 'ورود اطلاعات' }).click()
await mobile.waitForTimeout(400)

async function bodyScrollWidth(p) {
  return p.evaluate(() => document.documentElement.scrollWidth)
}

check('mobile: no horizontal scroll on dashboard', (await bodyScrollWidth(mobile)) <= 377)

const hamburger = mobile.getByRole('button', { name: 'باز کردن منو' })
check('mobile: hamburger visible', await hamburger.isVisible())
check(
  'mobile: desktop nav hidden',
  !(await mobile.locator('nav[aria-label="مرحله ها"]').first().isVisible()),
)

await hamburger.click()
await mobile.waitForTimeout(200)
const menu = mobile.locator('#topbar-mobile-menu')
check('mobile: menu opens', await menu.isVisible())
const menuText = (await menu.textContent()) ?? ''
check(
  'mobile: menu has all four steps + settings + reset',
  menuText.includes('ورود اطلاعات') &&
    menuText.includes('گروه ها') &&
    menuText.includes('قرعه و جدول') &&
    menuText.includes('برنامه زمین ها') &&
    menuText.includes('تنظیمات مسابقات') &&
    menuText.includes('شروع تازه'),
)
await mobile.screenshot({ path: 'scripts/t37/dashboard-mobile-menu.png' })

await menu.getByRole('button', { name: 'گروه ها' }).click()
await mobile.waitForTimeout(400)
check(
  'mobile: menu navigates to groups and closes',
  (await mobile.getByRole('heading', { name: 'گروه های مسابقات' }).isVisible()) &&
    (await mobile.getByRole('button', { name: 'باز کردن منو' }).isVisible()),
)
check('mobile: no horizontal scroll on groups', (await bodyScrollWidth(mobile)) <= 377)

// تخته قرعه در موبایل — جدول داخل کادر خودش اسکرول می شود، بدنه نه
await mobile.getByRole('button', { name: 'باز کردن منو' }).click()
await mobile.locator('#topbar-mobile-menu').getByRole('button', { name: 'قرعه و جدول' }).click()
await mobile.waitForTimeout(600)
check('mobile: bracket opens from menu', (await mobile.locator('[data-match-id]').count()) > 0)
check('mobile: no horizontal body scroll on bracket', (await bodyScrollWidth(mobile)) <= 377)
await mobile.screenshot({ path: 'scripts/t37/bracket-mobile.png' })

await mobile.getByRole('button', { name: 'باز کردن منو' }).click()
await mobile.locator('#topbar-mobile-menu').getByRole('button', { name: 'ورود اطلاعات' }).click()
await mobile.waitForTimeout(300)
check('mobile: dashboard again', await mobile.getByRole('heading', { name: 'داشبورد مسابقات' }).isVisible())

// تبلت ۷۶۸ — هنوز منوی همبرگری؛ ناوبری خطی از لپ تاپ ۱۰۲۴ به بالا برمی گردد
const tablet = await browser.newPage({ viewport: { width: 768, height: 1000 } })
await tablet.goto(`${BASE}/seed.html`)
await tablet.waitForLoadState('networkidle')
await tablet.waitForTimeout(400)
await tablet.getByRole('button', { name: 'باز کردن منو' }).click()
await tablet.waitForTimeout(200)
check('tablet (768): hamburger menu still serves navigation', await tablet.locator('#topbar-mobile-menu').isVisible())
check('tablet (768): no horizontal scroll', (await bodyScrollWidth(tablet)) <= 770)
await tablet.screenshot({ path: 'scripts/t37/dashboard-tablet-menu.png' })
await tablet.keyboard.press('Escape')
await tablet.waitForTimeout(200)
check('tablet: Escape closes menu', !(await tablet.locator('#topbar-mobile-menu').isVisible()))

const laptop = await browser.newPage({ viewport: { width: 1024, height: 768 } })
await laptop.goto(`${BASE}/seed.html`)
await laptop.waitForLoadState('networkidle')
await laptop.waitForTimeout(400)
await laptop.getByRole('button', { name: 'ورود اطلاعات' }).click()
await laptop.waitForTimeout(300)
check('laptop (1024): inline nav visible', await laptop.locator('nav[aria-label="مرحله ها"]').first().isVisible())
check('laptop (1024): hamburger hidden', (await laptop.getByRole('button', { name: 'باز کردن منو' }).count()) === 0)
const navText = (await laptop.locator('nav[aria-label="مرحله ها"]').first().textContent()) ?? ''
check('laptop: step labels on one line rendered fully', navText.includes('برنامه زمین ها') && navText.includes('قرعه و جدول'))
check('laptop: no horizontal scroll', (await bodyScrollWidth(laptop)) <= 1026)
await laptop.screenshot({ path: 'scripts/t37/dashboard-laptop.png' })

/* ———— ۳) جریان کامل ورود اکسل از داشبورد (آخرین آزمون — داده را عوض می کند) ———— */
await page.getByRole('button', { name: 'بارگذاری فایل', exact: true }).click()
await page.waitForTimeout(300)
await page.locator('input[type="file"]').setInputFiles('public/sample-registration.xlsx')
await page.waitForTimeout(600)
check('mapping step appears', await page.getByRole('heading', { name: 'تطبیق ستون های اکسل' }).isVisible())
await page.getByRole('button', { name: 'تأیید و پردازش فایل' }).click()
await page.waitForTimeout(600)
check('roster preview appears', await page.getByRole('heading', { name: 'پیش نمایش اطلاعات' }).isVisible())
await page.getByRole('button', { name: 'تأیید و مشاهده گروه ها' }).click()
await page.waitForTimeout(700)
check(
  'import lands on groups page',
  await page.getByRole('heading', { name: 'گروه های مسابقات' }).isVisible(),
)

/* ———— ۴) کنسول ———— */
check('zero console errors (desktop + mobile)', consoleErrors.length === 0, consoleErrors.join(' | '))

await browser.close()
console.log(failures === 0 ? '\nALL PASSED' : `\n${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
