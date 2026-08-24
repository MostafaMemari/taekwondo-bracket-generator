import { useState } from 'react'
import { AlertTriangle, Download } from 'lucide-react'
import { readSheetMatrix, type ColumnSelection, type SheetMatrix } from '../../core/excel/columnMapping.ts'
import { parseMappedSheet } from '../../core/excel/parseRosterWorkbook.ts'
import type { ParsedRoster } from '../../core/types.ts'
import { useTournament } from '../../store/tournamentStore.ts'
import { Button } from '../../components/Button.tsx'
import { ColumnMappingStep } from './ColumnMappingStep.tsx'
import { FileDropzone } from './FileDropzone.tsx'
import { RosterPreviewTable } from './RosterPreviewTable.tsx'

export function ImportPage() {
  const importRoster = useTournament((state) => state.importRoster)
  const [pendingSheet, setPendingSheet] = useState<SheetMatrix | null>(null)
  const [pending, setPending] = useState<ParsedRoster | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    setError('')
    try {
      const buffer = await file.arrayBuffer()
      const matrix = await readSheetMatrix(buffer)
      if (!matrix) {
        setError('ردیف سرستون‌ها در فایل پیدا نشد؛ ساختار فایل را بررسی کنید.')
        return
      }
      setFileName(file.name)
      setPendingSheet(matrix)
    } catch {
      setError('خواندن فایل ممکن نشد. فایل اکسل معتبر است؟')
    }
  }

  function handleMappingConfirm(selection: ColumnSelection) {
    if (!pendingSheet) return
    setPending(parseMappedSheet(pendingSheet, selection))
    setPendingSheet(null)
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
          پس از انتخاب فایل، ستون‌های آن را به فیلدهای برنامه متصل می‌کنید. هر ردیف یک شرکت‌کننده
          است و ترکیب «رده سنی + وزن» یک گروه جداگانه می‌سازد.
        </p>
      </header>

      {error && (
        <p className="mb-5 rounded-lg border border-hogu-100 bg-hogu-100 px-4 py-3 text-sm text-hogu-700">
          {error}
        </p>
      )}

      {pendingSheet ? (
        <ColumnMappingStep
          matrix={pendingSheet}
          fileName={fileName}
          onCancel={() => setPendingSheet(null)}
          onConfirm={handleMappingConfirm}
        />
      ) : pending ? (
        <div className="space-y-5">
          <RosterPreviewTable participants={pending.participants} issues={pending.issues} />
          {pending.participants.length === 0 && (
            <p className="flex items-center gap-2 rounded-lg border border-hogu-100 bg-hogu-100 px-4 py-3 text-sm text-hogu-700">
              <AlertTriangle size={16} />
              هیچ ردیف کاملی پیدا نشد؛ فایل را بررسی و اصلاح کنید.
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
      ) : (
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
      )}
    </div>
  )
}
