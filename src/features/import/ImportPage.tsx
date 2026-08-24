import { useState } from 'react'
import { AlertTriangle, Download } from 'lucide-react'
import { parseRosterWorkbook } from '../../core/excel/parseRosterWorkbook.ts'
import { excelSchema } from '../../config/excelSchema.ts'
import type { ParsedRoster } from '../../core/types.ts'
import { useTournament } from '../../store/tournamentStore.ts'
import { Button } from '../../components/Button.tsx'
import { FileDropzone } from './FileDropzone.tsx'
import { RosterPreviewTable } from './RosterPreviewTable.tsx'

const requiredColumns = Object.values(excelSchema.columns)
  .map((column) => column.header)
  .join('، ')

export function ImportPage() {
  const importRoster = useTournament((state) => state.importRoster)
  const [pending, setPending] = useState<ParsedRoster | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    setError('')
    try {
      const buffer = await file.arrayBuffer()
      setPending(await parseRosterWorkbook(buffer))
      setFileName(file.name)
    } catch {
      setError('خواندن فایل ممکن نشد. فایل اکسل معتبر است؟')
    }
  }

  function confirmImport() {
    if (!pending || pending.participants.length === 0) return
    importRoster(fileName, pending)
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl text-ink-900">بارگذاری فایل اکسل</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          ستون‌های لازم: <span className="font-medium text-ink-800">{requiredColumns}</span>. هر
          ردیف یک شرکت‌کننده است و ترکیب «رده سنی + وزن» یک گروه جداگانه می‌سازد.
        </p>
      </header>

      {!pending ? (
        <div className="space-y-4">
          <FileDropzone onFile={handleFile} />
          <a
            href="/sample-registration.xlsx"
            download
            className="inline-flex items-center gap-2 text-sm font-medium text-mat-600 hover:text-mat-700"
          >
            <Download size={16} />
            دانلود فایل نمونه
          </a>
        </div>
      ) : (
        <div className="space-y-5">
          <RosterPreviewTable participants={pending.participants} issues={pending.issues} />
          {pending.participants.length === 0 && (
            <p className="flex items-center gap-2 rounded-lg border border-hogu-100 bg-hogu-100 px-4 py-3 text-sm text-hogu-700">
              <AlertTriangle size={16} />
              هیچ ردیف کاملی پیدا نشد؛ فایل را بررسی و اصلاح کنید.
            </p>
          )}
          {error && (
            <p className="rounded-lg border border-hogu-100 bg-hogu-100 px-4 py-3 text-sm text-hogu-700">
              {error}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button onClick={confirmImport} disabled={pending.participants.length === 0}>
              تأیید و مشاهده گروه‌ها
            </Button>
            <Button variant="subtle" onClick={() => setPending(null)}>
              انصراف
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
