import { useTableTheme } from '../lib/tableThemeContext.ts'

/**
 * خانه آمار سربرگ برگه های چاپی (تعداد شرکت کننده / مسابقه / استراحت …) —
 * یک پیاده سازی برای برگه قرعه و برگه برنامه؛ فقط اندازه شان فرق دارد.
 * رنگ خط و برچسب از تم جدول — برگه برنامه بدون تم، رنگ کلاسیک.
 */
export function StatCell({
  label,
  value,
  divider,
  large,
}: {
  label: string
  value: string
  divider?: boolean
  /** برگه قرعه A4 افقی درشت تر است؛ برگه برنامه عمودی جمع تر */
  large?: boolean
}) {
  const theme = useTableTheme()
  return (
    <div
      style={{
        padding: large ? '10px 16px' : '8px 14px',
        textAlign: 'center',
        borderInlineStart: divider ? `1px solid ${theme.statDivider}` : undefined,
      }}
    >
      <p style={{ margin: 0, fontSize: large ? 17 : 15, fontWeight: 700 }}>{value}</p>
      <p style={{ margin: 0, fontSize: large ? 10.5 : 9.5, color: theme.statLabel }}>{label}</p>
    </div>
  )
}
