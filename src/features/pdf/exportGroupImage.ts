/**
 * رستر و دانلود تصویر برگه ها — منبع مشترک همه خروجی های PNG و PDF.
 *
 * Rendering goes through html-to-image (SVG foreignObject): the BROWSER lays
 * out and paints the cloned DOM, so RTL text stays pixel-perfect. The legacy
 * html2canvas engine miscalculates right-to-left text runs and clips the
 * first characters of the athletes' names — it is kept only as a fallback.
 */

import { toFaDigits } from '../../lib/formatFa.ts'

/** نسبت قطع A4 — همه خروجی های تصویری جدول ها روی همین نسبت می نشینند */
export const A4_RATIO = 297 / 210

/**
 * بلاگ تصویری را روی بومی با نسبت دقیق A4 می گذارد — تصویر تا جای ممکن بزرگ
 * و وسط بوم می نشیند (اینجا فقط چند پیکسل حاشیه بالا و پایین). خروجی
 * همیشه هم قطع و هم هم اندازه است؛ فارغ از اینکه جدول ۲ نفره باشد یا ۱۶.
 * پس زمینه بوم از تم جدول می آید تا برگه تیره در قاب سفید نیفتد.
 */
export async function pasteOnA4Ratio(blob: Blob, backdrop = '#ffffff'): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = Math.round(bitmap.width / A4_RATIO)
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    return blob
  }
  context.fillStyle = backdrop
  context.fillRect(0, 0, canvas.width, canvas.height)
  // contain — تصویر هیچ وقت از قاب A4 بیرون نمی زند
  const scale = Math.min(canvas.width / bitmap.width, canvas.height / bitmap.height)
  const width = bitmap.width * scale
  const height = bitmap.height * scale
  context.drawImage(bitmap, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height)
  bitmap.close()
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error('A4 canvas produced no blob'))),
      'image/png',
    )
  })
}

/**
 * برگه های یک اندیس — برگه های صفحه بندی شده (۳۲ و ۶۴ نفره) تک تک صفحه های
 *شان، و بقیه همان تک برگه. همان منبعی که PDF از آن می خواند.
 */
export function sheetPageElements(index: number): HTMLElement[] {
  const group = document.querySelector(`[data-pdf-group="${index}"]`)
  const pages = group
    ? Array.from(group.querySelectorAll<HTMLElement>('.pdf-page'))
    : []
  if (pages.length > 0) return pages
  const whole = document.getElementById(`pdf-sheet-${index}`)
  return whole ? [whole] : []
}

/**
 * خروجی عکس هم اندازه A4 برای همه برگه های داده شده — هر صفحه یک PNG مستقل
 * (برگه های چند صفحه ای با پسوند «صفحه ۱ از ۳» دانلود می شوند). نام هر فایل از
 * قالب عنوان می آید، نه عنوان مسابقات — کاربر اگر بخواهد با {عنوان} اضافه اش می کند.
 */
export async function exportSheetsAsA4Images(
  indices: number[],
  nameFor: (index: number) => string,
  backdrop = '#ffffff',
): Promise<void> {
  const usedNames = new Map<string, number>()
  for (const index of indices) {
    const pages = sheetPageElements(index)
    if (pages.length === 0) throw new Error(`export sheet ${index} not found`)
    const base = nameFor(index)
    for (let page = 0; page < pages.length; page += 1) {
      const raw = await rasterizeElement(pages[page], backdrop)
      if (!raw) throw new Error('rasterization produced no blob')
      const a4 = await pasteOnA4Ratio(raw, backdrop)
      let name = base
      if (pages.length > 1) {
        name = `${base} — صفحه ${toFaDigits(page + 1)} از ${toFaDigits(pages.length)}`
      }
      const count = usedNames.get(name) ?? 0
      usedNames.set(name, count + 1)
      if (count > 0) name = `${name} — ${toFaDigits(count + 1)}`
      downloadBlob(a4, `${name}.png`)
      // مرورگر دانلودهای پشت سرهم را محدود می کند
      await new Promise((resolve) => window.setTimeout(resolve, 350))
    }
  }
}

/** save any blob through a temporary object URL */
export function downloadBlob(blob: Blob, rawFileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = safeFileName(rawFileName)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/**
 * نام فایل دانلود امن — کاراکترهای ممنوع ویندوز و مرورگر (\\ / : * ? " < > |)
 * به فاصله تبدیل می شوند تا قالب دلخواه کاربر در نام فایل هم سالم بنشیند.
 */
export function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
}

/**
 * capture an element at 2× as a PNG blob — html-to-image first, html2canvas fallback
 * `backgroundColor` پس زمینه پشت عنصر است — رنگ صفحه را نمی خورد؛ تم تیره
 * باید با همین رنگ رستر شود وگرنه html-to-image پس زمینه سفید روی ریشه می گذارد.
 */
export async function rasterizeElement(
  element: HTMLElement,
  backgroundColor = '#ffffff',
): Promise<Blob | null> {
  try {
    const { toBlob } = await import('html-to-image')
    const blob = await toBlob(element, {
      pixelRatio: 2,
      backgroundColor,
      // the sheet already paints its own background
      cacheBust: true,
    })
    if (blob && blob.size > 0) return blob
  } catch {
    // fall through to the legacy engine
  }

  const { default: html2canvas } = await import('html2canvas')
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor,
    logging: false,
  })
  return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
}

/** پیکسل های واقعی یک بلاگ تصویری — برای مقیاس کردن روی قطع A4 */
export async function imageBitmapSize(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob)
  const size = { width: bitmap.width, height: bitmap.height }
  bitmap.close()
  return size
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('blob to data URL failed'))
    reader.readAsDataURL(blob)
  })
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

export { nextFrame }
