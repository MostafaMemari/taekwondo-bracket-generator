import { downloadBlob, nextFrame, rasterizeElement } from '../pdf/exportGroupImage.ts'
import {
  addLandscapePage,
  addPortraitSlicePage,
  portraitSliceCount,
  rasterizePage,
} from '../pdf/pdfPages.ts'

function scheduleImageName(title: string): string {
  return title.trim() ? `${title.trim()} — برنامه مسابقات` : 'برنامه مسابقات'
}

function schedulePdfName(title: string): string {
  return title.trim() || 'برنامه مسابقات تکواندو'
}

/**
 * خروجی عکس بلند از برگه برنامه — یک PNG پیوسته برای ارسال در تلگرام.
 */
export async function exportScheduleImage(tournamentTitle: string): Promise<void> {
  const element = document.getElementById('schedule-sheet')
  if (!element) throw new Error('schedule sheet not found')

  await nextFrame()
  const blob = await rasterizeElement(element)
  if (!blob) throw new Error('schedule rasterization produced no blob')
  downloadBlob(blob, `${scheduleImageName(tournamentTitle)}.png`)
}

/**
 * خروجی PDF A4 عمودی: برگه بلند برنامه در ۲× رستر می شود و همان تصویر با
 * جابه جایی عمودی روی چند صفحه A4 «تکه تکه» کشیده می شود.
 */
export async function exportScheduleToPdf(tournamentTitle: string): Promise<void> {
  const element = document.getElementById('schedule-sheet')
  if (!element) throw new Error('schedule sheet not found')

  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  const blob = await rasterizePage(element)

  const pageCount = await portraitSliceCount(blob)
  for (let index = 0; index < pageCount; index += 1) {
    if (index > 0) pdf.addPage()
    await addPortraitSlicePage(pdf, blob, index)
  }

  pdf.save(`${schedulePdfName(tournamentTitle)}.pdf`)
}

/**
 * حالت خروجیِ صفحه چاپ برنامه:
 *   plan   → فقط برگه برنامه (A4 عمودی)
 *   tables → فقط جدول های قرعه وزن های داخل برنامه (A4 افقی)
 *   both   → اول برنامه، بعد جدول ها
 */
export type SchedulePrintMode = 'plan' | 'tables' | 'both'

function scheduleBundlePdfName(title: string, mode: SchedulePrintMode): string {
  const base = title.trim() || 'برنامه مسابقات تکواندو'
  if (mode === 'tables') return `${base} — جدول های قرعه.pdf`
  if (mode === 'both') return `${base} — برنامه و جدول ها.pdf`
  return `${schedulePdfName(title)}.pdf`
}

function collectBracketElements(host: HTMLElement): HTMLElement[] {
  // برگه چاپی صفحه بندی شده → تک تک صفحه ها؛ تک برگه عکس → خودش؛
  // و در حالت های قدیمی تر، میزبان خودش یک برگه است
  const pages = Array.from(host.querySelectorAll<HTMLElement>('.pdf-page'))
  if (pages.length > 0) return pages
  const whole = Array.from(host.querySelectorAll<HTMLElement>('[id^="pdf-sheet-"]'))
  if (whole.length > 0) return whole
  return [host]
}

/**
 * PDF صفحه چاپ برنامه در هر سه حالت — صفحات برنامه به صورت تکه تکه روی A4
 * عمودی کشیده می شوند و هر جدول قرعه یک صفحه A4 افقی کامل می گیرد؛ jsPDF
 * اندازه هر صفحه را جداگانه می پذیرد، پس یک فایل با هر دو قطع می سازیم.
 */
export async function exportScheduleBundlePdf(
  tournamentTitle: string,
  mode: SchedulePrintMode = 'both',
): Promise<void> {
  const includePlan = mode !== 'tables'
  const includeTables = mode !== 'plan'
  const scheduleElement = includePlan ? document.getElementById('schedule-sheet') : null
  // برگه های جدولی از کجا می آیند؟
  //  • صفحه برنامه ریزی: از رانه آفسکرین (#sched-bracket-export) — برگه های
  //    چاپی صفحه بندی شده (.pdf-page) یا تک برگه های عکس (pdf-sheet-*)
  //  • صفحه چاپ برنامه: از همان صفحات مرئی [data-sched-bracket]
  const bracketMount = includeTables ? document.getElementById('sched-bracket-export') : null
  const bracketElements = bracketMount
    ? collectBracketElements(bracketMount)
    : includeTables
      ? Array.from(document.querySelectorAll<HTMLElement>('[data-sched-bracket]')).flatMap(collectBracketElements)
      : []
  if (!scheduleElement && bracketElements.length === 0) {
    throw new Error('nothing to export')
  }

  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({
    orientation: scheduleElement ? 'portrait' : 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  let pageAdded = false

  if (scheduleElement) {
    const blob = await rasterizePage(scheduleElement)
    const sliceCount = await portraitSliceCount(blob)
    for (let sliceIndex = 0; sliceIndex < sliceCount; sliceIndex += 1) {
      if (pageAdded) pdf.addPage('a4', 'portrait')
      await addPortraitSlicePage(pdf, blob, sliceIndex)
      pageAdded = true
    }
  }

  for (const element of bracketElements) {
    if (pageAdded) pdf.addPage('a4', 'landscape')
    await addLandscapePage(pdf, await rasterizePage(element))
    pageAdded = true
  }

  pdf.save(scheduleBundlePdfName(tournamentTitle, mode))
}
