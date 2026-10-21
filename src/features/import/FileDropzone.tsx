import { useRef, useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'

interface FileDropzoneProps {
  onFile: (file: File) => void
}

export function FileDropzone({ onFile }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isOver, setIsOver] = useState(false)

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="انتخاب فایل اکسل"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click()
      }}
      onDragOver={(event) => {
        event.preventDefault()
        setIsOver(true)
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(event) => {
        event.preventDefault()
        setIsOver(false)
        const file = event.dataTransfer.files[0]
        if (file) onFile(file)
      }}
      className={`flex cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-10 py-16 text-center transition-colors duration-150 ${
        isOver ? 'border-mat-600 bg-mat-50' : 'border-line-strong bg-surface hover:border-mat-600'
      }`}
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-mat-50 text-mat-600">
        <FileSpreadsheet size={26} />
      </span>
      <div className="space-y-1">
        <p className="text-lg font-bold text-ink-900">فایل اکسل را اینجا رها کنید</p>
        <p className="text-sm text-muted">یا برای انتخاب فایل کلیک کنید (.xlsx)</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFile(file)
          event.target.value = ''
        }}
      />
    </div>
  )
}
