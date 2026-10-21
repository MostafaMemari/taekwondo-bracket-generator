import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * پرده «در حال ساخت…» موقع اجرای کارهای خروجی — یک چرخنده و یک پیام؛
 * صفحه زیرش غیرفعال می ماند تا کار تمام شود. ظرف آفسکرین برگه ها هم
 * «offscreenMount.ts» کنار همین فایل است.
 */
export function BusyOverlay({ message }: { message: ReactNode }) {
  return createPortal(
    <div
      dir="rtl"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(10, 20, 36, 0.72)',
      }}
    >
      <div className="rounded-xl bg-surface px-8 py-6 text-center shadow-xl">
        <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-line border-t-mat-600" />
        <p className="mt-3 text-sm font-medium text-ink-900">{message}</p>
      </div>
    </div>,
    document.body,
  )
}
