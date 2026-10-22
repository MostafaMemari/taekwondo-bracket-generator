import { useRef, useState, type ReactNode } from 'react'
import { Check, ImageUp, Trash2, X } from 'lucide-react'
import { useTournament, type TournamentMeta } from '../../store/tournamentStore.ts'
import { Button } from '../../components/Button.tsx'
import {
  renderWeightTitle,
  SHEET_TITLE_DEFAULT_FORMAT,
  SHEET_TITLE_VARIABLES,
} from '../../lib/formatFa.ts'
import {
  classicTheme,
  tableThemeById,
  tableThemes,
  type TableTheme,
} from '../../lib/tableThemes.ts'
import {
  sheetLayouts,
  type SheetLayoutId,
} from '../../lib/sheetLayouts.ts'
import {
  defaultMatchChipSize,
  defaultMatchChipStyle,
  matchChipModes,
  matchChipPresetColors,
  matchChipRadius,
  matchChipSizeOptions,
  normalizeMatchChipSize,
  readableChipText,
  type MatchChipMode,
  type MatchChipSize,
  type MatchChipStyle,
} from '../../lib/matchChipStyles.ts'
import {
  byeMajoritySides,
  byePlacements,
  drawTypes,
  type ByeMajorityId,
  type ByePlacementId,
  type DrawTypeId,
} from '../../lib/drawModes.ts'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

const MAX_LOGO_EDGE = 320

/** shrink + re-encode the uploaded logo so it comfortably fits localStorage */
async function fileToScaledDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('read failed'))
    reader.readAsDataURL(file)
  })

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('decode failed'))
    img.src = dataUrl
  })

  const scale = Math.min(1, MAX_LOGO_EDGE / Math.max(image.width, image.height))
  if (scale >= 1 && dataUrl.length < 120_000) return dataUrl

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  const context = canvas.getContext('2d')
  if (!context) return dataUrl
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const meta = useTournament((state) => state.meta)
  const tableThemeId = useTournament((state) => state.tableThemeId)
  const matchChipStyle = useTournament((state) => state.matchChipStyle)
  const matchChipSize = useTournament((state) => state.matchChipSize)
  const showChampion = useTournament((state) => state.showChampion)
  const sheetLayout = useTournament((state) => state.sheetLayout)
  const drawTypeId = useTournament((state) => state.drawTypeId)
  const byePlacementId = useTournament((state) => state.byePlacementId)
  const byeMajorityId = useTournament((state) => state.byeMajorityId)
  if (!open) return null
  // keying the form by the meta snapshot resets local state on every open
  return (
    <SettingsForm
      key={`${meta.title}|${meta.subtitle}|${meta.logoDataUrl ?? ''}|${meta.sheetTitleFormat}|${tableThemeId}|${JSON.stringify(matchChipStyle)}|${matchChipSize}|${showChampion}|${sheetLayout}|${drawTypeId}|${byePlacementId}|${byeMajorityId}`}
      initial={meta}
      initialThemeId={tableThemeId}
      initialChipStyle={matchChipStyle}
      initialChipSize={matchChipSize}
      initialShowChampion={showChampion}
      initialSheetLayout={sheetLayout}
      initialDrawTypeId={drawTypeId}
      initialByePlacementId={byePlacementId}
      initialByeMajorityId={byeMajorityId}
      onClose={onClose}
    />
  )
}

function SettingsForm({
  initial,
  initialThemeId,
  initialChipStyle,
  initialChipSize,
  initialShowChampion,
  initialSheetLayout,
  initialDrawTypeId,
  initialByePlacementId,
  initialByeMajorityId,
  onClose,
}: {
  initial: TournamentMeta
  initialThemeId: ReturnType<typeof useTournament.getState>['tableThemeId']
  initialChipStyle: ReturnType<typeof useTournament.getState>['matchChipStyle']
  initialChipSize: ReturnType<typeof useTournament.getState>['matchChipSize']
  initialShowChampion: boolean
  initialSheetLayout: ReturnType<typeof useTournament.getState>['sheetLayout']
  initialDrawTypeId: ReturnType<typeof useTournament.getState>['drawTypeId']
  initialByePlacementId: ReturnType<typeof useTournament.getState>['byePlacementId']
  initialByeMajorityId: ReturnType<typeof useTournament.getState>['byeMajorityId']
  onClose: () => void
}) {
  const updateMeta = useTournament((state) => state.updateMeta)
  const setTableThemeId = useTournament((state) => state.setTableThemeId)
  const setMatchChipStyle = useTournament((state) => state.setMatchChipStyle)
  const setMatchChipSize = useTournament((state) => state.setMatchChipSize)
  const setShowChampion = useTournament((state) => state.setShowChampion)
  const setSheetLayout = useTournament((state) => state.setSheetLayout)
  const setDrawTypeId = useTournament((state) => state.setDrawTypeId)
  const setByePlacementId = useTournament((state) => state.setByePlacementId)
  const setByeMajorityId = useTournament((state) => state.setByeMajorityId)
  const [title, setTitle] = useState(initial.title)
  const [subtitle, setSubtitle] = useState(initial.subtitle)
  const [sheetTitleFormat, setSheetTitleFormat] = useState(initial.sheetTitleFormat)
  const [logo, setLogo] = useState<string | null>(initial.logoDataUrl)
  const [tableThemeId, setThemeId] = useState(initialThemeId)
  const [chipStyle, setChipStyle] = useState<MatchChipStyle>(initialChipStyle)
  const [chipSize, setChipSize] = useState<MatchChipSize>(normalizeMatchChipSize(initialChipSize))
  const [championVisible, setChampionVisible] = useState(initialShowChampion)
  const [sheetLayoutId, setLayoutId] = useState<SheetLayoutId>(initialSheetLayout)
  const [drawType, setDrawType] = useState<DrawTypeId>(initialDrawTypeId)
  const [byePlacement, setByePlacement] = useState<ByePlacementId>(initialByePlacementId)
  const [byeMajority, setByeMajority] = useState<ByeMajorityId>(initialByeMajorityId)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleLogoFile(file: File) {
    setError('')
    if (!file.type.startsWith('image/')) {
      setError('فایل باید تصویر باشد (PNG یا JPG).')
      return
    }
    try {
      setLogo(await fileToScaledDataUrl(file))
    } catch {
      setError('خواندن تصویر ممکن نشد؛ فایل دیگری را امتحان کنید.')
    }
  }

  function save() {
    updateMeta({
      title: title.trim(),
      subtitle: subtitle.trim(),
      sheetTitleFormat: sheetTitleFormat.trim(),
      logoDataUrl: logo,
    })
    setTableThemeId(tableThemeId)
    setMatchChipStyle(chipStyle)
    setMatchChipSize(chipSize)
    setShowChampion(championVisible)
    setSheetLayout(sheetLayoutId)
    setDrawTypeId(drawType)
    setByePlacementId(byePlacement)
    setByeMajorityId(byeMajority)
    onClose()
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/70 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-surface shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="font-display text-xl text-ink-900">تنظیمات سراسری مسابقات</h2>
            <p className="mt-0.5 text-xs text-muted">این اطلاعات برای همه جدول ها و برگه های چاپی یکسان اعمال می شود</p>
          </div>
          <button
            onClick={onClose}
            aria-label="بستن"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-turf hover:text-ink-900"
          >
            <X size={18} />
          </button>
        </header>

        <div className="max-h-[85vh] space-y-5 overflow-y-auto px-6 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-800">
              عنوان مسابقات
              <span className="ms-2 text-xs font-normal text-muted">سربرگ همه برگه های چاپی و نوار بالای برنامه</span>
            </label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="مثلاً: مسابقات قهرمانی تکواندو استان"
              className="w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-mat-600"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-800">
              زیرعنوان
              <span className="ms-2 text-xs font-normal text-muted">محل، تاریخ یا مرحله مسابقات</span>
            </label>
            <input
              value={subtitle}
              onChange={(event) => setSubtitle(event.target.value)}
              placeholder="مثلاً: سالن انقلاب تهران — ۱۴۰۴/۰۸/۱۵"
              className="w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-mat-600"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-800">
              قالب عنوان وزن ها
              <span className="ms-2 text-xs font-normal text-muted">
                سربرگ برگه های چاپی و نام فایل خروجی ها با همین قالب ساخته می شود
              </span>
            </label>
            <input
              value={sheetTitleFormat}
              onChange={(event) => setSheetTitleFormat(event.target.value)}
              placeholder="مثلا: وزن {وزن} — رده {رده سنی}"
              className="w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-mat-600"
            />
            <p className="mt-1.5 text-xs leading-5 text-muted">
              متغیرهای مجاز:{' '}
              {SHEET_TITLE_VARIABLES.map((variable) => (
                <code
                  key={variable}
                  dir="rtl"
                  className="mx-0.5 rounded bg-turf px-1.5 py-0.5 font-medium text-ink-800"
                >
                  {variable}
                </code>
              ))}
              {' — '}خالی بگذارید تا پیش فرض «{SHEET_TITLE_DEFAULT_FORMAT}» استفاده شود.
            </p>
            <p className="mt-2 rounded-lg bg-turf px-3 py-2 text-xs text-muted">
              پیش نمایش:{' '}
              <span className="font-bold text-ink-900">
                {renderWeightTitle(sheetTitleFormat, {
                  ageCategory: 'نوجوانان',
                  weightCategory: '۵۴',
                  tournamentTitle: title,
                })}
              </span>
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-800">لوگوی مسابقات</label>
            <div className="flex items-center gap-4 rounded-lg border border-dashed border-line-strong bg-turf p-4">
              {logo ? (
                <div className="flex items-center gap-3">
                  <img
                    src={logo}
                    alt="لوگو"
                    className="size-16 rounded-lg border border-line bg-white object-contain p-1"
                  />
                  <button
                    onClick={() => setLogo(null)}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-hogu-700 transition-colors hover:bg-hogu-100"
                  >
                    <Trash2 size={14} />
                    حذف لوگو
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-ink-800 shadow-sm transition-colors hover:border-mat-600 hover:text-mat-700"
                  >
                    <ImageUp size={16} />
                    انتخاب تصویر
                  </button>
                  <p className="text-xs leading-5 text-muted">
                    لوگو در هر دو طرف سربرگ همه برگه های چاپی و نوار بالای برنامه نمایش داده می شود — یک بار برای همه جدول ها.
                    <br />
                    PNG یا JPG — ترجیحاً مربعی.
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void handleLogoFile(file)
                  event.target.value = ''
                }}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-800">
              نوع قرعه کشی
              <span className="ms-2 text-xs font-normal text-muted">قانون چیدن هنرجوها روی برگه</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {drawTypes.map((mode) => (
                <DrawTypeCard
                  key={mode.id}
                  mode={mode}
                  selected={drawType === mode.id}
                  onSelect={() => setDrawType(mode.id)}
                />
              ))}
            </div>

            <p className="mb-1.5 mt-3 text-xs font-medium text-ink-800">چیدمان استراحت</p>
            <div className="grid grid-cols-2 gap-2.5">
              {byePlacements.map((mode) => (
                <ByePlacementCard
                  key={mode.id}
                  mode={mode}
                  selected={byePlacement === mode.id}
                  onSelect={() => setByePlacement(mode.id)}
                />
              ))}
            </div>

            <p className="mb-1.5 mt-3 text-xs font-medium text-ink-800">
              اکثریت استراحت ها
              <span className="ms-2 text-xs font-normal text-muted">
                در چیدمان «همیشه زیر اسم» — استراحت های اضافی بعد از چهارگوشه ها به این سمت می روند
              </span>
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {byeMajoritySides.map((side) => (
                <ByeMajorityCard
                  key={side.id}
                  side={side}
                  selected={byeMajority === side.id}
                  onSelect={() => setByeMajority(side.id)}
                />
              ))}
            </div>

            <p className="mt-2 rounded-lg bg-turf px-3 py-2 text-xs leading-5 text-muted">
              در حالت جداسازی، دو هنرجوی یک مربی اینور و اونور جدول می افتند؛ اگر مربی سه هنرجو داشته
              باشد دو نفرشان در نیمه نهایی به هم می خورند تا برنده به فینال برسد و استراحت ها اول به
              مربی ای می رسد که بیشترین هنرجو را دارد. در حالت تصادفی فقط فیش ها بُر می خورد. در چیدمان
              «همیشه زیر اسم» استراحت های اضافی بعد از چهارگوشه ها به سمت اکثریت می روند — پیش فرض
              راست است و می توانید آن را سمت چپ بگذارید. با ذخیره، همه جدول های واقعی و باران مدال از
              نو قرعه کشی می شوند؛ جدول های دستی و شماره های دستی دست نمی خورند.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-800">
              طرح برگه
              <span className="ms-2 text-xs font-normal text-muted">ساختار سربرگ و جدول عوض می شود — تم های رنگی روی هر سه طرح می نشینند</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {sheetLayouts.map((layout) => (
                <SheetLayoutCard
                  key={layout.id}
                  layout={layout}
                  theme={tableThemeById(tableThemeId)}
                  selected={layout.id === sheetLayoutId}
                  onSelect={() => setLayoutId(layout.id)}
                />
              ))}
            </div>
            <p className="mt-2 rounded-lg bg-turf px-3 py-2 text-xs leading-5 text-muted">
              طرح، شکل سربرگ و جدول را عوض می کند و تم، رنگ هایش را — طرح های
              مدرن و تشریفاتی هم همه رنگ هایشان را از همان تم می گیرد؛ ماکت ها با
              تم انتخابی همین لحظه رنگ می گیرند.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-800">
              تم جدول ها
              <span className="ms-2 text-xs font-normal text-muted">فقط ظاهر برگه ها عوض می شود — نه داده ها و نه چیدمان</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {tableThemes.map((theme) => (
                <TableThemeCard
                  key={theme.id}
                  theme={theme}
                  selected={theme.id === tableThemeId}
                  onSelect={() => setThemeId(theme.id)}
                />
              ))}
            </div>
            <p className="mt-2 rounded-lg bg-turf px-3 py-2 text-xs leading-5 text-muted">
              تم روی همه جدول ها — پیش نمایش حالت جدولی، خروجی عکس و PDF و چاپ — یک جا اعمال می شود؛
              رنگ گوشه آبی و قرمز در همه تم ها حفظ می شود تا داوری گمراه نشود.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-800">
              ظاهر شماره مسابقه
              <span className="ms-2 text-xs font-normal text-muted">فقط شکل و رنگ بج شماره ها عوض می شود</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {matchChipModes.map((mode) => (
                <MatchChipModeCard
                  key={mode.id}
                  mode={mode}
                  color={chipStyle.color}
                  selected={chipStyle.shape === mode.shape && chipStyle.fill === mode.fill}
                  onSelect={() =>
                    setChipStyle((current) => ({ ...current, shape: mode.shape, fill: mode.fill }))
                  }
                />
              ))}
            </div>

            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-ink-800">اندازه بج</p>
              <div className="grid grid-cols-3 gap-2.5">
                {matchChipSizeOptions.map((option) => (
                  <MatchChipSizeCard
                    key={option.id}
                    option={option}
                    shape={chipStyle.shape}
                    fill={chipStyle.fill}
                    color={chipStyle.color}
                    selected={chipSize === option.id}
                    onSelect={() => setChipSize(option.id)}
                  />
                ))}
              </div>
            </div>

            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-ink-800">رنگ بج</p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setChipStyle((current) => ({ ...current, color: null }))}
                  aria-pressed={chipStyle.color === null}
                  title="رنگ از تم جدول می آید — فینال طلایی می ماند"
                  className={`flex items-center gap-1.5 rounded-full border py-1 pe-3 ps-1 text-xs font-medium transition-colors ${
                    chipStyle.color === null
                      ? 'border-mat-600 bg-mat-50 text-ink-900 ring-2 ring-mat-600/25'
                      : 'border-line text-muted hover:border-line-strong'
                  }`}
                >
                  <span
                    aria-hidden
                    className="size-5 rounded-full"
                    style={{ background: `linear-gradient(135deg, ${classicTheme.matchAccent} 55%, ${classicTheme.finalAccent} 55%)` }}
                  />
                  همراه تم
                </button>
                {matchChipPresetColors.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setChipStyle((current) => ({ ...current, color: preset.value }))}
                    aria-pressed={chipStyle.color === preset.value}
                    title={preset.name}
                    aria-label={`رنگ ${preset.name}`}
                    className={`size-6 rounded-full border border-black/10 transition-transform ${
                      chipStyle.color === preset.value
                        ? 'scale-110 ring-2 ring-mat-600/60 ring-offset-1'
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: preset.value }}
                  />
                ))}
                <label
                  title="رنگ دلخواه"
                  className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line py-1 pe-3 ps-1 text-xs font-medium text-muted transition-colors hover:border-line-strong"
                >
                  <span
                    aria-hidden
                    className="size-5 rounded-full border border-black/10"
                    style={{
                      background:
                        'conic-gradient(#ef4444, #f59e0b, #84cc16, #14b8a6, #3b82f6, #a855f7, #ef4444)',
                    }}
                  />
                  دلخواه
                  <input
                    type="color"
                    value={chipStyle.color ?? classicTheme.matchAccent}
                    onChange={(event) =>
                      setChipStyle((current) => ({ ...current, color: event.target.value }))
                    }
                    className="size-0 w-0 p-0 opacity-0"
                  />
                </label>
              </div>
            </div>

            <p className="mt-2 rounded-lg bg-turf px-3 py-2 text-xs leading-5 text-muted">
              «همراه تم» رنگ بج را از تم جدول می گیرد و فینال طلایی خودش را نگه می دارد؛ رنگ دلخواه روی همه
              بج ها می نشیند. شکل، اندازه و رنگ فقط روی بج شماره ها اثر دارد و هیچ چیز دیگری عوض نمی شود.
              <button
                type="button"
                onClick={() => {
                  setChipStyle(defaultMatchChipStyle)
                  setChipSize(defaultMatchChipSize)
                }}
                className="ms-1 font-medium text-mat-700 underline decoration-dotted underline-offset-4 hover:text-mat-600"
              >
                بازگشت به پیش فرض
              </button>
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-800">
              نمایش پلاک قهرمان
              <span className="ms-2 text-xs font-normal text-muted">پلاک «قهرمان» زیر فینال — بوم قرعه و همه خروجی ها</span>
            </label>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                {/* ماکت کوچک — روشن: پلاک طلایی؛ خاموش: جای خالی نقطه چین */}
                {championVisible ? (
                  <span
                    aria-hidden
                    className="flex h-8 w-16 shrink-0 items-center justify-center rounded-lg font-display text-[11px] tracking-wider text-white"
                    style={{ background: 'linear-gradient(135deg, #fbbf24, #d97706)' }}
                  >
                    قهرمان
                  </span>
                ) : (
                  <span
                    aria-hidden
                    className="flex h-8 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-line-strong text-[10px] text-muted"
                  >
                    بدون پلاک
                  </span>
                )}
                <div>
                  <p className="text-sm font-medium text-ink-900">پلاک قهرمان زیر فینال</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted">
                    با خاموش کردن، پلاک روی بوم قرعه، برگه چاپ و خروجی عکس و PDF نمی آید
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`text-xs font-medium ${championVisible ? 'text-mat-700' : 'text-muted'}`}>
                  {championVisible ? 'روشن' : 'خاموش'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={championVisible}
                  aria-label="نمایش پلاک قهرمان"
                  onClick={() => setChampionVisible((value) => !value)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    championVisible ? 'bg-mat-600' : 'bg-line-strong'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
                      championVisible ? 'start-0.5' : 'start-[22px]'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-hogu-100 px-3 py-2 text-sm text-hogu-700">{error}</p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">
          <Button variant="subtle" onClick={onClose}>
            انصراف
          </Button>
          <Button onClick={save}>ذخیره</Button>
        </footer>
      </div>
    </div>
  )
}

/** ردیف ماکت — خانه پر (اسم) یا خانه استراحت (خط چین) */
function MockRow({ rest = false, tone = 'athlete' }: { rest?: boolean; tone?: 'athlete' | 'red' | 'blue' }) {
  if (rest) {
    return <span aria-hidden className="h-2.5 rounded-[3px] border border-dashed border-slate-300" />
  }
  const toneClass =
    tone === 'red' ? 'bg-red-400' : tone === 'blue' ? 'bg-blue-400' : 'bg-slate-400'
  return <span aria-hidden className={`h-2.5 rounded-[3px] ${toneClass}`} />
}

function ModeCardShell({
  selected,
  onSelect,
  testId,
  name,
  hint,
  children,
}: {
  selected: boolean
  onSelect: () => void
  testId: string
  name: string
  hint: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      data-draw-mode={testId}
      className={`rounded-xl border p-2.5 text-start transition-colors ${
        selected
          ? 'border-mat-600 bg-mat-50 ring-2 ring-mat-600/25'
          : 'border-line hover:border-line-strong'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {children}
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink-900">{name}</p>
          <p className="mt-0.5 text-[11px] leading-4 text-muted">{hint}</p>
        </div>
      </div>
    </button>
  )
}

/**
 * کارت نوع قرعه کشی — ماکت: جداسازی هم تیمی ها دو خانه هم رنگ را قطری (دو طرف
 * جدول) می نشاند و تصادفی ردیف های بی قاعده را؛ انتخاب با ذخیره اعمال می شود.
 */
function DrawTypeCard({
  mode,
  selected,
  onSelect,
}: {
  mode: (typeof drawTypes)[number]
  selected: boolean
  onSelect: () => void
}) {
  return (
    <ModeCardShell selected={selected} onSelect={onSelect} testId={mode.id} name={mode.name} hint={mode.hint}>
      {mode.id === 'coachSeeded' ? (
        <span aria-hidden className="mt-0.5 grid w-10 shrink-0 grid-cols-2 gap-1">
          <MockRow tone="red" />
          <MockRow />
          <MockRow />
          <MockRow tone="red" />
        </span>
      ) : (
        <span aria-hidden className="mt-0.5 flex w-10 shrink-0 flex-col gap-1">
          <MockRow />
          <MockRow tone="blue" />
          <MockRow tone="red" />
          <MockRow />
        </span>
      )}
    </ModeCardShell>
  )
}

/**
 * کارت چیدمان استراحت — ماکت: آینه ای دو خانه استراحت را قرینه (بالا/پایین دو
 * نیمه) نشان می دهد و «همیشه زیر اسم» با قانون چهارگوشه را — استراحت اول بالای
 * چپ و بالای راست، بعد پایین چپ و پایین راست و بعدی سمت راست قسمت بالای جدول.
 */
function ByePlacementCard({
  mode,
  selected,
  onSelect,
}: {
  mode: (typeof byePlacements)[number]
  selected: boolean
  onSelect: () => void
}) {
  return (
    <ModeCardShell selected={selected} onSelect={onSelect} testId={mode.id} name={mode.name} hint={mode.hint}>
      <span aria-hidden className="mt-0.5 grid w-10 shrink-0 grid-cols-2 gap-1">
        {mode.id === 'mirror' ? (
          <>
            <MockRow />
            <MockRow rest />
            <MockRow rest />
            <MockRow />
          </>
        ) : (
          <>
            {/* نیمه چپ | نیمه راست — ردیف از بالا: چهارگوشه اول، بعد خانه دوم راست */}
            <MockRow rest />
            <MockRow rest />
            <MockRow />
            <MockRow rest />
            <MockRow />
            <MockRow />
            <MockRow rest />
            <MockRow rest />
          </>
        )}
      </span>
    </ModeCardShell>
  )
}

/**
 * کارت اکثریت استراحت ها — ماکت همان برگه ۱۶ نفره با ۵ استراحت است: چهارگوشه
 * ها ثابت اند (بالا و پایین هر دو نیمه) و استراحت پنجم خانه دوم سمت اکثریت را
 * می گیرد — راست (پیش فرض): ۲ چپ و ۳ راست؛ چپ: ۳ چپ و ۲ راست.
 */
function ByeMajorityCard({
  side,
  selected,
  onSelect,
}: {
  side: (typeof byeMajoritySides)[number]
  selected: boolean
  onSelect: () => void
}) {
  return (
    <ModeCardShell selected={selected} onSelect={onSelect} testId={`majority-${side.id}`} name={side.name} hint={side.hint}>
      <span aria-hidden className="mt-0.5 grid w-10 shrink-0 grid-cols-2 gap-1">
        {/* جفت های [نیمه چپ، نیمه راست] از بالا: چهارگوشه اول، بعد خانه دوم اکثریت */}
        {side.id === 'right' ? (
          <>
            <MockRow rest />
            <MockRow rest />
            <MockRow />
            <MockRow rest />
            <MockRow />
            <MockRow />
            <MockRow rest />
            <MockRow rest />
          </>
        ) : (
          <>
            <MockRow rest />
            <MockRow rest />
            <MockRow rest />
            <MockRow />
            <MockRow />
            <MockRow />
            <MockRow rest />
            <MockRow rest />
          </>
        )}
      </span>
    </ModeCardShell>
  )
}

/**
 * کارت انتخاب تم — یک ماکت کوچک از سربرگ و دو ردیف گوشه با خود رنگ های تم؛
 * انتخاب با ذخیره اعمال می شود و «انصراف» برمی گرداند.
 */
function TableThemeCard({
  theme,
  selected,
  onSelect,
}: {
  theme: TableTheme
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`rounded-xl border p-2 text-start transition-colors ${
        selected
          ? 'border-mat-600 bg-mat-50 ring-2 ring-mat-600/25'
          : 'border-line hover:border-line-strong'
      }`}
    >
      <div
        className="overflow-hidden rounded-lg border border-line"
        style={{ backgroundColor: theme.sheetBg }}
      >
        {/* سربرگ ماکت — نوار عنوان + بج زمین + خانه آمار */}
        <div
          className="flex items-center justify-between gap-1 px-1.5 py-1"
          style={{ borderBottom: `1.5px solid ${theme.headerRule}` }}
        >
          <span
            aria-hidden
            className="h-1 w-1/2 rounded-full"
            style={{ backgroundColor: theme.titleText, opacity: 0.85 }}
          />
          <span
            aria-hidden
            className="h-2.5 shrink-0 rounded-sm px-1"
            style={{ backgroundColor: theme.matBadgeBg, width: 14 }}
          />
          <span
            aria-hidden
            className="h-2.5 w-3.5 shrink-0 rounded-sm"
            style={{ border: `1px solid ${theme.statBorder}` }}
          />
        </div>
        {/* دو گوشه ماکت — آبی بالا، قرمز پایین؛ رنگ گوشه ها در همه تم ها زنده می ماند */}
        <div className="space-y-1 p-1.5">
          {(['chong', 'hong'] as const).map((side) => (
            <div
              key={side}
              className="flex h-3 overflow-hidden rounded"
              style={{ backgroundColor: theme.sides[side].bgSoft }}
            >
              <span aria-hidden className="w-[3px] shrink-0" style={{ backgroundColor: theme.sides[side].accent }} />
              <span
                aria-hidden
                className="my-auto h-[3px] w-2/3 rounded-full"
                style={{ backgroundColor: theme.nameText, opacity: 0.7, marginInline: 4 }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-1">
        <span className="text-xs font-bold text-ink-900">{theme.name}</span>
        {selected && <Check size={13} className="shrink-0 text-mat-600" />}
      </div>
      <p className="mt-0.5 text-[10px] leading-4 text-muted">{theme.hint}</p>
    </button>
  )
}

/**
 * کارت انتخاب حالت شماره مسابقه — ماکت دو بج (پر با عدد و خالی نقطه چین) با
 * همان شکل و رنگ انتخابی؛ انتخاب با ذخیره اعمال می شود و «انصراف» برمی گرداند.
 */
function MatchChipModeCard({
  mode,
  color,
  selected,
  onSelect,
}: {
  mode: MatchChipMode
  /** رنگ staging شده — null یعنی همراه تم؛ ماکت با رنگ کلاسیک دیده می شود */
  color: string | null
  selected: boolean
  onSelect: () => void
}) {
  const accent = color ?? classicTheme.matchAccent
  const chipSize = 22
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`rounded-xl border p-2 text-start transition-colors ${
        selected
          ? 'border-mat-600 bg-mat-50 ring-2 ring-mat-600/25'
          : 'border-line hover:border-line-strong'
      }`}
    >
      <div className="flex items-center justify-center gap-2 rounded-lg border border-line bg-white px-2 py-2">
        <span
          aria-hidden
          className="flex items-center justify-center text-[11px] font-bold"
          style={{
            width: chipSize,
            height: chipSize,
            borderRadius: matchChipRadius(mode.shape, chipSize),
            border: `2px solid ${accent}`,
            ...(mode.fill === 'solid'
              ? { backgroundColor: accent, color: readableChipText(accent) }
              : { backgroundColor: '#ffffff', color: accent }),
          }}
        >
          ۳
        </span>
        <span
          aria-hidden
          className="flex items-center justify-center border-2 border-dashed border-slate-300"
          style={{
            width: chipSize - 4,
            height: chipSize - 4,
            borderRadius: matchChipRadius(mode.shape, chipSize - 4),
          }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-1">
        <span className="text-xs font-bold text-ink-900">{mode.name}</span>
        {selected && <Check size={13} className="shrink-0 text-mat-600" />}
      </div>
    </button>
  )
}

/**
 * کارت انتخاب اندازه شماره مسابقه — ماکت بج با خود اندازه انتخابی و همان شکل
 * و رنگ فعلی، تا تفاوت سه اندازه یک جا دیده شود؛ با «ذخیره» اعمال می شود.
 */
function MatchChipSizeCard({
  option,
  shape,
  fill,
  color,
  selected,
  onSelect,
}: {
  option: (typeof matchChipSizeOptions)[number]
  shape: MatchChipStyle['shape']
  fill: MatchChipStyle['fill']
  color: string | null
  selected: boolean
  onSelect: () => void
}) {
  const accent = color ?? classicTheme.matchAccent
  // ماکت با خود ضریب اندازه — پایه ۲۲ پیکسل مثل بج واقعی برگه
  const size = Math.round(22 * option.factor)
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`rounded-xl border p-2 text-start transition-colors ${
        selected
          ? 'border-mat-600 bg-mat-50 ring-2 ring-mat-600/25'
          : 'border-line hover:border-line-strong'
      }`}
    >
      <div className="flex h-[46px] items-center justify-center rounded-lg border border-line bg-white px-2">
        <span
          aria-hidden
          className="flex items-center justify-center font-bold"
          style={{
            width: size,
            height: size,
            borderRadius: matchChipRadius(shape, size),
            border: `2px solid ${accent}`,
            fontSize: Math.round(size * 0.48),
            ...(fill === 'solid'
              ? { backgroundColor: accent, color: readableChipText(accent) }
              : { backgroundColor: '#ffffff', color: accent }),
          }}
        >
          ۳
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-1">
        <span className="text-xs font-bold text-ink-900">{option.name}</span>
        {selected && <Check size={13} className="shrink-0 text-mat-600" />}
      </div>
    </button>
  )
}

/**
 * کارت انتخاب طرح برگه — ماکت کوچک از سربرگ و دو ردیف با خود ساختار طرح
 * (کلاسیک: خط زیر سربرگ و نوار کنار ردیف — مدرن: ریبون بالا، عنوان دو طرف
 * خط، پیل ها و نوار روی ردیف — تشریفاتی: قاب دوخطه، نشان الماسی، مدال های
 * دورخط و اتصال های ریز) با رنگ های تم فعلی؛ انتخاب با ذخیره اعمال می شود.
 */
function SheetLayoutCard({
  layout,
  theme,
  selected,
  onSelect,
}: {
  layout: (typeof sheetLayouts)[number]
  theme: TableTheme
  selected: boolean
  onSelect: () => void
}) {
  const modern = layout.id === 'modern'
  const royal = layout.id === 'royal'
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`rounded-xl border p-2 text-start transition-colors ${
        selected
          ? 'border-mat-600 bg-mat-50 ring-2 ring-mat-600/25'
          : 'border-line hover:border-line-strong'
      }`}
    >
      <div
        className="relative overflow-hidden rounded-lg border border-line"
        style={{
          backgroundColor: theme.sheetBg,
          // قاب داخلی ماکت تشریفاتی — دوخطه با فاصله، همان امضای برگه اصلی
          ...(royal
            ? { boxShadow: `inset 0 0 0 2px ${theme.sheetBg}, inset 0 0 0 3px ${theme.headerRule}` }
            : {}),
        }}
      >
        {/* نشان الماسی گوشه قاب ماکت تشریفاتی */}
        {royal && (
          <span
            aria-hidden
            className="absolute rotate-45"
            style={{
              width: 5,
              height: 5,
              backgroundColor: theme.headerRule,
              top: 4,
              insetInlineStart: 4,
            }}
          />
        )}
        {/* ریبون امضای طرح مدرن */}
        {modern && (
          <div aria-hidden style={{ height: 3, backgroundColor: theme.matBadgeBg }} />
        )}
        {/* سربرگ ماکت */}
        <div
          className="flex items-center gap-1 px-1.5 py-1"
          style={{
            borderBottom: modern || royal ? undefined : `1.5px solid ${theme.headerRule}`,
            backgroundColor: modern || royal ? theme.sheetBg : undefined,
          }}
        >
          {modern && (
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-sm"
              style={{ border: `1px solid ${theme.chipBorder}`, backgroundColor: theme.chipBg }}
            />
          )}
          {royal && (
            <span
              aria-hidden
              className="h-1.5 w-1.5 shrink-0 rotate-45"
              style={{ backgroundColor: theme.headerRule }}
            />
          )}
          <span
            aria-hidden
            className="mx-auto h-1 rounded-full"
            style={{
              width: royal ? '40%' : modern ? '46%' : '50%',
              backgroundColor: theme.titleText,
              opacity: 0.85,
              boxShadow: modern
                ? `-6px 0 0 -3px ${theme.headerRule}66, 6px 0 0 -3px ${theme.headerRule}66`
                : undefined,
            }}
          />
          {modern || royal ? (
            <span
              aria-hidden
              className="h-2 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: theme.matBadgeBg }}
            />
          ) : (
            <span
              aria-hidden
              className="h-2.5 w-3.5 shrink-0 rounded-sm"
              style={{ border: `1px solid ${theme.statBorder}` }}
            />
          )}
        </div>
        {/* دو گوشه ماکت — کلاسیک: نوار کنار؛ مدرن: نوار لبه بالا؛ تشریفاتی: دورخط داخلی */}
        <div className="space-y-1 p-1.5">
          {(['chong', 'hong'] as const).map((side) => (
            <div
              key={side}
              className="flex h-3 items-center overflow-hidden rounded"
              style={{
                backgroundColor: theme.sides[side].bgSoft,
                ...(modern
                  ? {
                      borderTop: `2px solid ${theme.sides[side].accent}`,
                      borderInline: `1px solid ${theme.sides[side].borderSoft}`,
                      borderBottom: `1px solid ${theme.sides[side].borderSoft}`,
                    }
                  : royal
                    ? {
                        border: `1px solid ${theme.sides[side].borderSoft}`,
                        boxShadow: `inset 0 0 0 1px ${theme.sides[side].accent}`,
                      }
                    : {}),
              }}
            >
              {!modern && !royal && (
                <span
                  aria-hidden
                  className="h-full w-[3px] shrink-0"
                  style={{ backgroundColor: theme.sides[side].accent }}
                />
              )}
              <span
                aria-hidden
                className="my-auto h-[3px] w-2/3 rounded-full"
                style={{
                  backgroundColor: theme.nameText,
                  opacity: 0.7,
                  marginInline: 4,
                  marginInlineStart: modern || royal ? 'auto' : undefined,
                  marginInlineEnd: modern || royal ? 'auto' : undefined,
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-1">
        <span className="text-xs font-bold text-ink-900">{layout.name}</span>
        {selected && <Check size={13} className="shrink-0 text-mat-600" />}
      </div>
      <p className="mt-0.5 text-[10px] leading-4 text-muted">{layout.hint}</p>
    </button>
  )
}
