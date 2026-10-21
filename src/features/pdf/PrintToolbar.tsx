import { ArrowRight, Download, Printer } from 'lucide-react'
import type { ReactNode } from 'react'

interface PrintToolbarProps {
  summary: ReactNode
  /** محتوای اضافی بعد از دکمه بازگشت — مثلا سوییچ حالت چاپ برنامه */
  leading?: ReactNode
  /** دانلود PDF — اگر ندهید فقط دکمه چاپ می آید */
  onDownloadPdf?: () => void
  downloadDisabled?: boolean
  downloadBusy?: boolean
  printDisabled?: boolean
}

/**
 * نوار بالای هر دو صفحه پیش نمایش چاپ: بازگشت + (سوییچ حالت) + خلاصه +
 * دانلود PDF + چاپ با پرینتر — یک شکل، یک رفتار؛ هر صفحه فقط خلاصه خودش را
 * می دهد.
 */
export function PrintToolbar({
  summary,
  leading,
  onDownloadPdf,
  downloadDisabled = false,
  downloadBusy = false,
  printDisabled = false,
}: PrintToolbarProps) {
  return (
    <div className="no-print flex flex-wrap items-center justify-center gap-2 rounded-xl bg-surface px-4 py-3 shadow-lg">
      <button
        onClick={() => {
          window.location.hash = ''
        }}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-ink-800 transition-colors hover:bg-turf"
      >
        <ArrowRight size={15} className="rotate-180" />
        بازگشت
      </button>

      {leading}

      <span className="px-2 text-sm text-muted">{summary}</span>

      {onDownloadPdf && (
        <button
          onClick={onDownloadPdf}
          disabled={downloadDisabled || downloadBusy}
          className="flex items-center gap-1.5 rounded-lg bg-mat-600 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-mat-700 disabled:opacity-40"
        >
          <Download size={15} />
          {downloadBusy ? 'در حال ساخت…' : 'دانلود PDF'}
        </button>
      )}
      <button
        onClick={() => window.print()}
        disabled={printDisabled}
        className="flex items-center gap-1.5 rounded-lg bg-ink-900 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-ink-800 disabled:opacity-40"
      >
        <Printer size={15} />
        چاپ با پرینتر
      </button>
    </div>
  )
}
