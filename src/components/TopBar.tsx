import { RotateCcw, Settings2, Swords } from 'lucide-react'
import { useTournament, type PageName } from '../store/tournamentStore.ts'
import { toFaDigits } from '../lib/formatFa.ts'

const steps: { name: PageName; label: string }[] = [
  { name: 'import', label: 'ورود اطلاعات' },
  { name: 'groups', label: 'گروه ها' },
  { name: 'bracket', label: 'قرعه' },
]

export function TopBar() {
  const page = useTournament((state) => state.page)
  const hasData = useTournament((state) => state.participants.length > 0)
  const meta = useTournament((state) => state.meta)
  const openImport = useTournament((state) => state.openImport)
  const openGroups = useTournament((state) => state.openGroups)
  const clearAll = useTournament((state) => state.clearAll)
  const setSettingsOpen = useTournament((state) => state.setSettingsOpen)

  function isStepEnabled(name: PageName): boolean {
    if (name === 'import') return true
    return hasData
  }

  function onStepClick(name: PageName) {
    if (!isStepEnabled(name)) return
    if (name === 'import') openImport()
    if (name === 'groups') openGroups()
    if (name === 'bracket' && hasData) openGroups()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-900 text-white">
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-6 py-2.5">
        <div className="flex items-center gap-2.5">
          {meta.logoDataUrl ? (
            <img
              src={meta.logoDataUrl}
              alt=""
              className="size-9 rounded-lg bg-white object-contain p-0.5"
            />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-lg bg-mat-600">
              <Swords size={18} />
            </span>
          )}
          <div className="leading-tight">
            <p className="font-display text-lg">{meta.title || 'قرعه کشی مسابقات تکواندو'}</p>
            <p className="text-[11px] text-white/60">
              {meta.subtitle || 'تخته قرعه کیوروگی'}
            </p>
          </div>
        </div>

        <nav aria-label="مرحله ها" className="hidden items-center gap-1 sm:flex">
          {steps.map((step, index) => {
            const isActive = page === step.name
            const enabled = isStepEnabled(step.name)
            return (
              <button
                key={step.name}
                onClick={() => onStepClick(step.name)}
                disabled={!enabled}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                  isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="me-1.5 text-xs opacity-70">{toFaDigits(index + 1)}.</span>
                {step.label}
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="تنظیمات مسابقات"
            title="تنظیمات مسابقات (عنوان و لوگو)"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Settings2 size={16} />
            <span className="hidden md:inline">تنظیمات</span>
          </button>
          {hasData && (
            <button
              onClick={() => {
                if (window.confirm('همه داده های بارگذاری شده پاک شود؟')) clearAll()
              }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <RotateCcw size={14} />
              شروع تازه
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
