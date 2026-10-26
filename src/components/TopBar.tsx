import { useEffect, useState } from 'react'
import { Check, Menu, RotateCcw, Settings2, Swords, X } from 'lucide-react'
import { useTournament, type PageName } from '../store/tournamentStore.ts'
import { toFaDigits } from '../lib/formatFa.ts'
import { openBracketFromNav } from '../lib/bracketNav.ts'

const steps: { name: PageName; label: string }[] = [
  { name: 'import', label: 'ورود اطلاعات' },
  { name: 'groups', label: 'گروه ها' },
  { name: 'bracket', label: 'قرعه و جدول' },
  { name: 'schedule', label: 'برنامه زمین ها' },
]

export function TopBar() {
  const page = useTournament((state) => state.page)
  const hasData = useTournament((state) => state.participants.length > 0)
  const drawCount = useTournament((state) => Object.keys(state.draws).length)
  const sessionCount = useTournament((state) => state.scheduleSessions.length)
  const meta = useTournament((state) => state.meta)
  const openImport = useTournament((state) => state.openImport)
  const openGroups = useTournament((state) => state.openGroups)
  const openSchedule = useTournament((state) => state.openSchedule)
  const clearAll = useTournament((state) => state.clearAll)
  const setSettingsOpen = useTournament((state) => state.setSettingsOpen)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  /** وضعیت واقعی «انجام شده» هر مرحله — بدون نشان تزئینی */
  function isStepDone(name: PageName): boolean {
    if (name === 'import') return hasData
    if (name === 'groups') return drawCount > 0
    if (name === 'bracket') return drawCount > 0
    return sessionCount > 0
  }

  function isStepEnabled(name: PageName): boolean {
    if (name === 'import') return true
    return hasData
  }

  function onStepClick(name: PageName) {
    setMenuOpen(false)
    if (!isStepEnabled(name)) return
    if (name === 'import') openImport()
    else if (name === 'groups') openGroups()
    else if (name === 'schedule') openSchedule()
    else openBracketFromNav()
  }

  function stepButton(name: PageName, index: number, variant: 'bar' | 'menu') {
    const active = page === name
    const enabled = isStepEnabled(name)
    const done = isStepDone(name)
    const base =
      variant === 'bar'
        ? `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
            active ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`
        : `flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
            active ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
          }`
    return (
      <button
        key={name}
        onClick={() => onStepClick(name)}
        disabled={!enabled}
        aria-current={active ? 'page' : undefined}
        className={base}
      >
        <span className="me-1.5 inline-flex w-3 justify-center text-xs opacity-70" aria-hidden>
          {done ? (
            <Check size={13} />
          ) : variant === 'bar' ? (
            `${toFaDigits(index + 1)}.`
          ) : (
            toFaDigits(index + 1)
          )}
        </span>
        {steps[index].label}
      </button>
    )
  }

  const navSteps = steps.map((_, index) => stepButton(steps[index].name, index, 'bar'))
  const menuSteps = steps.map((_, index) => stepButton(steps[index].name, index, 'menu'))

  return (
    <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-900 text-white">
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          {meta.logoDataUrl ? (
            <img
              src={meta.logoDataUrl}
              alt=""
              className="size-9 shrink-0 rounded-lg bg-white object-contain p-0.5"
            />
          ) : (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-mat-600">
              <Swords size={18} aria-hidden />
            </span>
          )}
          <div className="min-w-0 leading-tight">
            <p className="truncate font-display text-lg">{meta.title || 'قرعه کشی مسابقات تکواندو'}</p>
            <p className="truncate text-[11px] text-white/60">
              {meta.subtitle || 'تخته قرعه کیوروگی'}
            </p>
          </div>
        </div>

        <nav aria-label="مرحله ها" className="hidden items-center gap-1 lg:flex">
          {navSteps}
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="تنظیمات مسابقات"
            title="تنظیمات مسابقات (عنوان و لوگو)"
            className="flex size-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:size-auto lg:px-3"
          >
            <Settings2 size={16} />
            <span className="hidden lg:inline lg:ms-1.5">تنظیمات</span>
          </button>
          {hasData && (
            <button
              onClick={() => {
                if (window.confirm('همه داده های بارگذاری شده پاک شود؟')) clearAll()
              }}
              title="همه داده ها پاک شود و از نو شروع کنید"
              className="hidden size-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:flex lg:w-auto lg:px-3 lg:text-sm"
            >
              <RotateCcw size={14} />
              <span className="hidden lg:inline lg:ms-1.5">شروع تازه</span>
            </button>
          )}
          <button
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="topbar-mobile-menu"
            aria-label={menuOpen ? 'بستن منو' : 'باز کردن منو'}
            className="flex size-9 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            {menuOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="topbar-mobile-menu" className="border-t border-white/10 bg-ink-900 lg:hidden">
          <nav aria-label="مرحله ها — منوی موبایل" className="mx-auto w-full max-w-[1400px] px-3 py-2 sm:px-6">
            {menuSteps}
            <div className="my-2 h-px bg-white/10" role="presentation" />
            <button
              onClick={() => {
                setMenuOpen(false)
                setSettingsOpen(true)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Settings2 size={15} aria-hidden />
              تنظیمات مسابقات
            </button>
            {hasData && (
              <button
                onClick={() => {
                  setMenuOpen(false)
                  if (window.confirm('همه داده های بارگذاری شده پاک شود؟')) clearAll()
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-hogu-100 transition-colors hover:bg-white/10 hover:text-white"
              >
                <RotateCcw size={15} aria-hidden />
                شروع تازه — پاک کردن همه داده ها
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
