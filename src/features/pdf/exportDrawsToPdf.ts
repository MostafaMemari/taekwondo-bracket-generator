const pageWidthMm = 297
const pageHeightMm = 210
const marginMm = 8

export async function exportDrawsToPdf(
  sheetCount: number,
  fileName = 'قرعه‌کشی-مسابقات.pdf',
): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })

  for (let index = 0; index < sheetCount; index += 1) {
    const element = document.getElementById(`pdf-sheet-${index}`)
    if (!element) throw new Error(`PDF sheet ${index} not found`)

    await nextFrame()
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
    })
    const imageData = canvas.toDataURL('image/png')

    if (index > 0) pdf.addPage()

    const availableWidth = pageWidthMm - marginMm * 2
    const availableHeight = pageHeightMm - marginMm * 2
    const fitRatio = Math.min(availableWidth / canvas.width, availableHeight / canvas.height)
    const drawWidth = canvas.width * fitRatio
    const drawHeight = canvas.height * fitRatio

    pdf.addImage(
      imageData,
      'PNG',
      (pageWidthMm - drawWidth) / 2,
      (pageHeightMm - drawHeight) / 2,
      drawWidth,
      drawHeight,
      undefined,
      'FAST',
    )
  }

  pdf.save(fileName)
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}
