import { blobToDataUrl, imageBitmapSize, nextFrame, rasterizeElement } from './exportGroupImage.ts'

/**
 * ابزار مشترک صفحه بندی PDF: هر برگه رستر می شود و روی قطع A4 کشیده می شود.
 * دو حالت داریم و هر دو با jsPDF در یک فایل کنار هم می نشینند:
 *
 *  • landscape  → برگه A4 افقی؛ تصویر متناسب شده و وسط صفحه می نشیند
 *                 (جدول های قرعه، یک صفحه کامل برای هر برگه)
 *  • portrait   → برگه A4 عمودی؛ تصویرِ بلند با جابه جایی عمودی «تکه تکه»
 *                 روی چند صفحه پیاپی کشیده می شود (برنامه مسابقات)
 */

export const A4_PORTRAIT = { widthMm: 210, heightMm: 297, marginMm: 8 }
export const A4_LANDSCAPE = { widthMm: 297, heightMm: 210, marginMm: 6 }

/** rasterize one sheet element into a ready-to-place page bitmap */
export async function rasterizePage(element: HTMLElement): Promise<Blob> {
  await nextFrame()
  const blob = await rasterizeElement(element)
  if (!blob) throw new Error('rasterization produced no blob')
  return blob
}

type Pdf = import('jspdf').jsPDF

/** برگه افقی: تصویر تا بیشینه حاشیه دار کوچک می شود و وسط صفحه می نشیند */
export async function addLandscapePage(pdf: Pdf, blob: Blob): Promise<void> {
  const { widthMm, heightMm, marginMm } = A4_LANDSCAPE
  const availableWidth = widthMm - marginMm * 2
  const availableHeight = heightMm - marginMm * 2
  const size = await imageBitmapSize(blob)
  const fitRatio = Math.min(availableWidth / size.width, availableHeight / size.height)
  const drawWidth = size.width * fitRatio
  const drawHeight = size.height * fitRatio
  pdf.addImage(
    await blobToDataUrl(blob),
    'PNG',
    (widthMm - drawWidth) / 2,
    (heightMm - drawHeight) / 2,
    drawWidth,
    drawHeight,
    undefined,
    'FAST',
  )
}

/**
 * برش i-ام از یک تصویر بلند روی A4 عمودی — تصویر به عرض محتوای صفحه مقیاس
 * می شود و با جابه جایی عمودیِ «index × ارتفاع محتوا» همان تصویر روی چند صفحه
 * پیاپی کشیده می شود؛ خروجی، یک سند پیوسته چند صفحه ای است.
 */
export async function addPortraitSlicePage(
  pdf: Pdf,
  blob: Blob,
  sliceIndex: number,
): Promise<void> {
  const { widthMm, heightMm, marginMm } = A4_PORTRAIT
  const contentWidth = widthMm - marginMm * 2
  const contentHeight = heightMm - marginMm * 2
  const size = await imageBitmapSize(blob)
  const drawWidth = contentWidth
  const drawHeight = (size.height / size.width) * drawWidth
  pdf.addImage(
    await blobToDataUrl(blob),
    'PNG',
    marginMm,
    marginMm - sliceIndex * contentHeight,
    drawWidth,
    drawHeight,
    undefined,
    'FAST',
  )
}

/** چند برش عمودی لازم است تا یک تصویر بلند تمام شود؟ */
export async function portraitSliceCount(blob: Blob): Promise<number> {
  const { widthMm, heightMm, marginMm } = A4_PORTRAIT
  const contentWidth = widthMm - marginMm * 2
  const contentHeight = heightMm - marginMm * 2
  const size = await imageBitmapSize(blob)
  const drawHeight = (size.height / size.width) * contentWidth
  return Math.max(1, Math.ceil(drawHeight / contentHeight))
}
