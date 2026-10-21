import { addLandscapePage, rasterizePage } from './pdfPages.ts'
import { safeFileName } from './exportGroupImage.ts'

function pdfFileName(title: string): string {
  const base = title.trim() || 'قرعه کشی مسابقات تکواندو'
  return `${base}.pdf`
}

/**
 * PDF همه برگه های قرعه مونت شده آفسکرین (`ExportStage` از قبل مونت کرده
 * است). هر برگه یا یک صفحه کامل A4 افقی می گیرد یا — اگر بلندتر از یک صفحه
 * باشد (۳۲ و ۶۴ نفره) — به چند صفحه پیاپی می رسد؛ صفحه ها از قبل با
 * «BracketSheet» روی درز خانه ها بریده شده اند (`data-pdf-group` → `.pdf-page`)
 * و اینجا فقط رستر و صفحه به صفحه افزوده می شوند.
 */
export async function exportDrawsToPdf(
  sheetCount: number,
  tournamentTitle = '',
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })
  let placed = false

  for (let index = 0; index < sheetCount; index += 1) {
    const group = document.querySelector(`[data-pdf-group="${index}"]`)
    const pages = group
      ? Array.from(group.querySelectorAll<HTMLElement>('.pdf-page'))
      : []
    const elements =
      pages.length > 0 ? pages : [document.getElementById(`pdf-sheet-${index}`)]
    for (const element of elements) {
      if (!element) throw new Error(`PDF sheet ${index} not found`)
      if (placed) pdf.addPage()
      await addLandscapePage(pdf, await rasterizePage(element as HTMLElement))
      placed = true
    }
  }

  pdf.save(safeFileName(pdfFileName(tournamentTitle)))
}
