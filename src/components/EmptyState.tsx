import type { ComponentType, ReactNode } from 'react'

interface EmptyStateProps {
  icon: ComponentType<{ size?: number | string; className?: string }>
  title: string
  /** توضیح یک تا دو خطی زیر عنوان */
  children?: ReactNode
  /** دکمه عمل بالای صفحه خالی — مثلا «افزودن اولین بازه زمانی» */
  action?: ReactNode
}

/**
 * حالت خالی مشترک صفحه ها: دایره آیکون + عنوان + توضیح + دکمه عمل —
 * برای «بازه ای ساخته نشده»، «جدولی برای نمایش نیست» و «تنها شرکت کننده».
 */
export function EmptyState({ icon: Icon, title, children, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-turf">
        <Icon size={24} className="text-mat-600" />
      </span>
      <p className="font-display text-xl text-ink-900">{title}</p>
      {children && (
        <p className="max-w-lg text-sm leading-7 text-muted">{children}</p>
      )}
      {action}
    </div>
  )
}
