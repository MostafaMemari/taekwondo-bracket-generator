import { useRef, useState } from 'react'
import { ImageUp, Trash2, X } from 'lucide-react'
import { useTournament, type TournamentMeta } from '../../store/tournamentStore.ts'
import { Button } from '../../components/Button.tsx'
import {
  renderWeightTitle,
  SHEET_TITLE_DEFAULT_FORMAT,
  SHEET_TITLE_VARIABLES,
} from '../../lib/formatFa.ts'

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
  if (!open) return null
  // keying the form by the meta snapshot resets local state on every open
  return (
    <SettingsForm
      key={`${meta.title}|${meta.subtitle}|${meta.logoDataUrl ?? ''}|${meta.sheetTitleFormat}`}
      initial={meta}
      onClose={onClose}
    />
  )
}

function SettingsForm({
  initial,
  onClose,
}: {
  initial: TournamentMeta
  onClose: () => void
}) {
  const updateMeta = useTournament((state) => state.updateMeta)
  const [title, setTitle] = useState(initial.title)
  const [subtitle, setSubtitle] = useState(initial.subtitle)
  const [sheetTitleFormat, setSheetTitleFormat] = useState(initial.sheetTitleFormat)
  const [logo, setLogo] = useState<string | null>(initial.logoDataUrl)
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

        <div className="space-y-5 px-6 py-5">
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
