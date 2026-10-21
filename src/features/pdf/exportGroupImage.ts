/**
 * رستر و دانلود تصویر برگه ها — منبع مشترک همه خروجی های PNG و PDF.
 *
 * Rendering goes through html-to-image (SVG foreignObject): the BROWSER lays
 * out and paints the cloned DOM, so RTL text stays pixel-perfect. The legacy
 * html2canvas engine miscalculates right-to-left text runs and clips the
 * first characters of the athletes' names — it is kept only as a fallback.
 */

/** capture an element at 2× as PNG and trigger a download */
export async function exportImageFromElement(
  element: HTMLElement,
  fileName: string,
): Promise<void> {
  await nextFrame()
  const blob = await rasterizeElement(element)
  if (!blob) throw new Error('rasterization produced no blob')
  downloadBlob(blob, `${fileName}.png`)
}

/** save any blob through a temporary object URL */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/** capture an element at 2× as a PNG blob — html-to-image first, html2canvas fallback */
export async function rasterizeElement(element: HTMLElement): Promise<Blob | null> {
  try {
    const { toBlob } = await import('html-to-image')
    const blob = await toBlob(element, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      // the sheet already paints its own white background
      cacheBust: true,
    })
    if (blob && blob.size > 0) return blob
  } catch {
    // fall through to the legacy engine
  }

  const { default: html2canvas } = await import('html2canvas')
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    logging: false,
  })
  return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
}

export function imageBaseName(title: string): string {
  return title.trim() || 'قرعه کشی مسابقات تکواندو'
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
