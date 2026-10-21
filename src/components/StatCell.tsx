/**
 * خانه آمار سربرگ برگه های چاپی (تعداد شرکت کننده / مسابقه / استراحت …) —
 * یک پیاده سازی برای برگه قرعه و برگه برنامه؛ فقط اندازه شان فرق دارد.
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
  return (
    <div
      style={{
        padding: large ? '10px 16px' : '8px 14px',
        textAlign: 'center',
        borderInlineStart: divider ? '1px solid #d8dfea' : undefined,
      }}
    >
      <p style={{ margin: 0, fontSize: large ? 17 : 15, fontWeight: 700 }}>{value}</p>
      <p style={{ margin: 0, fontSize: large ? 10.5 : 9.5, color: '#5b6b82' }}>{label}</p>
    </div>
  )
}
