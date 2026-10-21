/**
 * طرح برگه — دو چیدمان متفاوت برای «همان» برگه قرعه:
 *
 *  - کلاسیک: سربرگ سه ستونه با خط زیر سربرگ، ردیف ها با نوار رنگی کنار،
 *    اتصال های پیوسته — همان ظاهر همیشگی که پیش فرض است.
 *  - مدرن: سربرگ وسط چین ساده (بدون خط و کادر، آمار یک خط متن)، ردیف های
 *    بی حاشیه با فقط رنگ ملایم گوشه، اتصال های خط چین — خلوت و باز.
 *
 * طرح «ساختار» است و تم «رنگ» — هر تمی (هفت تم فعلی و تم های آینده) روی هر
 * دو طرح یک جا می نشیند؛ مدرن همه رنگ هایش را از همان توکن های تم می گیرد
 * تا تم سیاه و سفید هم رویش بی عیب چاپ شود.
 */
export type SheetLayoutId = 'classic' | 'modern'

export interface SheetLayoutInfo {
  id: SheetLayoutId
  /** نام فارسی طرح — در تنظیمات */
  name: string
  /** توضیح یک خطی زیر نام در تنظیمات */
  hint: string
}

export const sheetLayouts: readonly SheetLayoutInfo[] = [
  {
    id: 'classic',
    name: 'کلاسیک',
    hint: 'همان سربرگ و جدول همیشگی — نوار گوشه کنار ردیف ها',
  },
  {
    id: 'modern',
    name: 'مدرن',
    hint: 'سربرگ وسط چین ساده، ردیف های بی حاشیه و اتصال خط چین — خلوت و باز',
  },
]

const layoutIds: ReadonlySet<string> = new Set(sheetLayouts.map((layout) => layout.id))

export function isSheetLayoutId(value: unknown): value is SheetLayoutId {
  return typeof value === 'string' && layoutIds.has(value)
}

/** طرح معتبر از store — مقدار نامعتبر/قدیمی بی درنگ کلاسیک می شود */
export function normalizeSheetLayoutId(value: unknown): SheetLayoutId {
  return isSheetLayoutId(value) ? value : 'classic'
}
