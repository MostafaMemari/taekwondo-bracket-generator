import { useMemo, useRef, useState } from 'react'
import { UserPlus, X } from 'lucide-react'
import { useTournament } from '../../store/tournamentStore.ts'
import { groupTitle, toFaDigits } from '../../lib/formatFa.ts'

interface AddStudentDialogProps {
  groupId: string
  /** اگر داده شود، هنرجو دقیقا در همین خانه استراحت می نشیند */
  targetSlotId?: string | null
  onClose: () => void
}

type AddMode = 'rest' | 'empty-slot' | 'grow' | 'full'

/**
 * گفت وگوی «افزودن هنرجو» — از سه جا باز می شود: دکمه نوار بالای بوم قرعه،
 * کلیک روی یک خانه استراحت (نشانی دقیق خانه) و دکمه کارت هر وزن در صفحه
 * گروه ها. بر اساس نوع جدول (واقعی/دستی/باران مدال) وضعیت پذیرش را می سنجد:
 * جای استراحت آزاد → همان جا می نشیند؛ جدول دستی خانه بی نام دارد → اولین
 * خانه پر می شود؛ جدول واقعی پر است → برگه به اندازه بعدی بزرگ می شود (با
 * هشدار از نو چیده شدن قرعه)؛ باران مدال ۴ نفره → پر است و اجازه نمی گیرد.
 */
export function AddStudentDialog({ groupId, targetSlotId, onClose }: AddStudentDialogProps) {
  const draw = useTournament((state) => state.draws[groupId])
  const manualTables = useTournament((state) => state.manualTables)
  const medalRainTables = useTournament((state) => state.medalRainTables)
  const participants = useTournament((state) => state.participants)
  const addParticipantToGroup = useTournament((state) => state.addParticipantToGroup)

  const [fullName, setFullName] = useState('')
  const [coachName, setCoachName] = useState('')
  const coachRef = useRef<HTMLInputElement | null>(null)

  const info = useMemo(() => {
    if (!draw) return null
    const manualInfo = manualTables[groupId]
    const medalInfo = medalRainTables[groupId]

    // جدول دستی — خانه ها ثابت اند؛ فقط خانه بی نام پر می شود
    if (manualInfo) {
      const byId = new Map(participants.map((p) => [p.id, p]))
      const emptyCount = manualInfo.participantIds.filter(
        (id) => (byId.get(id)?.fullName ?? '').trim() === '',
      ).length
      return emptyCount > 0
        ? {
            mode: 'empty-slot' as AddMode,
            hint: 'نفر جدید روی اولین خانه بی نام این جدول می نشیند.',
          }
        : {
            mode: 'full' as AddMode,
            hint: 'همه خانه های این جدول پر شده است؛ ابتدا یکی را حذف کن یا جدول بزرگ تری بساز.',
          }
    }

    // نشانی دقیق — کلیک روی خود خانه استراحت
    if (targetSlotId && draw.assignments[targetSlotId]?.kind === 'bye') {
      return {
        mode: 'rest' as AddMode,
        hint: 'هنرجوی جدید در همین خانه استراحت می نشیند؛ بعدا با کشیدن می توانی جایش را عوض کنی.',
      }
    }

    // جای استراحت آزاد — بدون دست زدن به بقیه چیدمان
    const restCount = Object.values(draw.assignments).filter((o) => o.kind === 'bye').length
    if (restCount > 0) {
      return {
        mode: 'rest' as AddMode,
        hint: 'هنرجو در جای استراحت می نشیند؛ با کشیدن کارت ها می توانی جایش را عوض کنی.',
      }
    }

    if (medalInfo) {
      if (draw.group.participantIds.length >= 4) {
        return {
          mode: 'full' as AddMode,
          hint: 'این جدول باران مدال ۴ نفره کامل است؛ برای نفر جدید یک جدول دیگر بساز.',
        }
      }
      return {
        mode: 'grow' as AddMode,
        hint: 'جدول باران مدال به اندازه بعدی بزرگ می شود و قرعه اش از نو چیده می شود.',
      }
    }

    // جدول واقعی — اگر تک نفره باشد قرعه تازه ساخته می شود، وگرنه برگه بزرگ می شود
    if (draw.structure.roundCount === 0) {
      return {
        mode: 'grow' as AddMode,
        hint: 'با افزودن هنرجوی دوم، برگه این وزن ساخته می شود.',
      }
    }
    const nextSize = Math.max(
      2,
      2 ** Math.ceil(Math.log2(draw.group.participantIds.length + 1)),
    )
    return {
      mode: 'grow' as AddMode,
      hint: `برگه این وزن کامل است — به اندازه ${toFaDigits(nextSize)} نفره بزرگ می شود و قرعه از نو چیده می شود؛ شماره های دستی مسابقه ها هم پاک می شوند.`,
    }
  }, [draw, manualTables, medalRainTables, participants, groupId, targetSlotId])

  if (!draw || !info) return null

  const blocked = info.mode === 'full' || fullName.trim().length === 0

  function save() {
    if (!info || info.mode === 'full' || !fullName.trim()) return
    addParticipantToGroup(groupId, { fullName, coachName })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 px-4"
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-2xl text-ink-900">
              <UserPlus size={20} className="text-mat-600" />
              افزودن هنرجو
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              {groupTitle(draw.group.ageCategory, draw.group.weightCategory)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            title="بستن"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ink-900/5 hover:text-ink-900"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-800">نام هنرجو</span>
            <input
              autoFocus
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  coachRef.current?.focus()
                } else if (event.key === 'Escape') {
                  event.preventDefault()
                  onClose()
                }
              }}
              placeholder="نام و نام خانوادگی"
              maxLength={60}
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-sm font-medium text-ink-900 outline-none transition-colors focus:border-mat-600 placeholder:font-normal placeholder:text-slate-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-800">مربی (اختیاری)</span>
            <input
              ref={coachRef}
              value={coachName}
              onChange={(event) => setCoachName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  save()
                } else if (event.key === 'Escape') {
                  event.preventDefault()
                  onClose()
                }
              }}
              placeholder="نام مربی"
              maxLength={60}
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-sm font-medium text-ink-900 outline-none transition-colors focus:border-mat-600 placeholder:font-normal placeholder:text-slate-400"
            />
          </label>
          <p
            className={`rounded-lg px-3 py-2 text-xs leading-5 ${
              info.mode === 'full'
                ? 'bg-red-50 font-medium text-red-700'
                : 'bg-turf text-muted'
            }`}
          >
            {info.hint}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-start gap-2">
          <button
            type="button"
            onClick={save}
            disabled={blocked}
            className="flex items-center gap-1.5 rounded-lg bg-mat-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-mat-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <UserPlus size={15} />
            افزودن
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-ink-900/5 hover:text-ink-900"
          >
            انصراف
          </button>
        </div>
      </div>
    </div>
  )
}
