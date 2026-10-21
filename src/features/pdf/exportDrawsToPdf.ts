import { addLandscapePage, rasterizePage } from './pdfPages.ts'
import { safeFileName, sheetPageElements } from './exportGroupImage.ts'

/**
 * PDF همه برگه های قرعه مونت شده آفسکرین (`ExportStage` از قبل مونت کرده
 * است). هر برگه یا یک صفحه کامل A4 افقی می گیرد یا — اگر بلندتر از یک صفحه
 * باشد (۳۲ و ۶۴ نفره) — به چند صفحه پیاپی می رسد؛ صفحه ها از قبل با
 * «BracketSheet» روی درز خانه ها بریده شده اند (`data-pdf-group` → `.pdf-page`)
 * و اینجا فقط رستر و صفحه به صفحه افزوده می شوند. هر صفحه روی قطع A4 افقی
 * کامل می نشیند، پس همه برگه ها — ۲ نفره یا ۶۴ نفره — یک قطع دارند.
 *
 * `fileBase` نام فایل بدون پسوند است: برای کل مسابقات عنوان مسابقات و برای
 * یک جدول همان قالب عنوان وزن (بدون نام مسابقات).
 *
 * `backdrop` پس زمینه صفحه های PDF — از تم جدول می آید تا برگه تیره در
 * حاشیه سفید نیفتد.
 */
export async function exportDrawsToPdf(
  sheetCount: number,
  fileBase = 'قرعه کشی مسابقات تکواندو',
  backdrop = '#ffffff',
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })
  let placed = false

  for (let index = 0; index < sheetCount; index += 1) {
    const elements = sheetPageElements(index)
    for (const element of elements) {
      if (placed) pdf.addPage()
      paintPdfBackdrop(pdf, backdrop)
      await addLandscapePage(pdf, await rasterizePage(element as HTMLElement, backdrop))
      placed = true
    }
  }

  pdf.save(safeFileName(`${fileBase}.pdf`))
}

/** کل صفحه PDF با رنگ تم رنگ آمیزی می شود — تصویر برگه رویش می نشیند */
function paintPdfBackdrop(pdf: import('jspdf').jsPDF, backdrop: string): void {
  const hex = backdrop.replace('#', '')
  const value = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  const red = parseInt(value.slice(0, 2), 16)
  const green = parseInt(value.slice(2, 4), 16)
  const blue = parseInt(value.slice(4, 6), 16)
  if ([red, green, blue].some((channel) => Number.isNaN(channel))) return
  pdf.setFillColor(red, green, blue)
  pdf.rect(0, 0, 297, 210, 'F')
}
